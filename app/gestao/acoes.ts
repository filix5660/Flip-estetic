"use server";

// Ações da área de gestão.
//
// Cada ação é um endereço público que qualquer pessoa pode tentar chamar,
// por isso todas seguem a mesma ordem:
//   1. obterSalaoDaSessao() — exige sessão válida; o salão vem da sessão,
//      nunca de um id enviado pelo navegador;
//   2. validar os dados com zod;
//   3. gravar com o cliente da sessão — a base de dados (RLS) recusa
//      qualquer linha que não seja do salão desse utilizador.

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import {
  COLUNAS_BLOQUEIO,
  COLUNAS_CLIENTE,
  COLUNAS_MARCACAO,
  COLUNAS_PROFISSIONAL,
  COLUNAS_SERVICO,
  paraBloqueio,
  paraCliente,
  paraMarcacao,
  paraProfissional,
  paraServico,
} from "@/lib/mapear";
import { listarServicos } from "@/lib/dados";
import { horaEmMinutos, somarMinutos } from "@/lib/datas";
import type {
  Bloqueio,
  Cliente,
  EstadoMarcacao,
  HorarioSemanal,
  Marcacao,
  Profissional,
  Servico,
} from "@/lib/modelo";
import { limiteAtingido, planos } from "@/lib/planos";
import {
  erro,
  ERRO_DADOS,
  ERRO_GENERICO,
  sucesso,
  type Resultado,
} from "@/lib/resultado";
import { obterSalaoDaSessao } from "@/lib/sessao";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { criarClienteSessao } from "@/lib/supabase/servidor";
import {
  esquemaAtivoProfissional,
  esquemaBloqueio,
  esquemaEstadoMarcacao,
  esquemaHorarioProfissional,
  esquemaHorarios,
  esquemaProfissional,
  esquemaMarcacaoManual,
  esquemaPaginaPublica,
  esquemaServico,
  UUID_VALIDO,
} from "@/lib/validacao";

const ERRO_LIMITE = "Atingiste o limite do teu plano.";

/** Regista o erro real no servidor; o navegador só recebe uma mensagem genérica. */
function falha(contexto: string, e: PostgrestError) {
  if (e.message.includes("LIMITE_PLANO")) return erro(ERRO_LIMITE);
  console.error(`[gestao] ${contexto}:`, e.code, e.message);
  return erro(ERRO_GENERICO);
}

function atualizarPaginas(slug: string) {
  revalidatePath("/gestao", "layout");
  revalidatePath(`/${slug}`);
}

// ───────────────────────────── Serviços ─────────────────────────────

export async function guardarServico(entrada: unknown): Promise<Resultado<Servico>> {
  const salao = await obterSalaoDaSessao();
  const dados = esquemaServico.safeParse(entrada);
  if (!dados.success) return erro(ERRO_DADOS);
  const { id, nome, duracaoMinutos, precoCentimos } = dados.data;

  if (!supabaseConfigurado) {
    return sucesso({
      id: id ?? `demo-${Date.now()}`,
      salaoId: salao.id,
      nome,
      duracaoMinutos,
      precoCentimos,
      ativo: true,
    });
  }

  const supabase = await criarClienteSessao();
  const campos = {
    nome,
    duracao_minutos: duracaoMinutos,
    preco_centimos: precoCentimos,
  };

  if (id === undefined) {
    const { count } = await supabase
      .from("servicos")
      .select("id", { count: "exact", head: true })
      .eq("salao_id", salao.id)
      .eq("ativo", true);
    if (limiteAtingido(salao.plano, "servicos", count ?? 0)) {
      return erro(ERRO_LIMITE);
    }

    const { data, error } = await supabase
      .from("servicos")
      .insert({ salao_id: salao.id, ...campos })
      .select(COLUNAS_SERVICO)
      .single();
    if (error) return falha("criar serviço", error);
    atualizarPaginas(salao.slug);
    return sucesso(paraServico(data));
  }

  if (!UUID_VALIDO.test(id)) return erro(ERRO_DADOS);
  const { data, error } = await supabase
    .from("servicos")
    .update(campos)
    .eq("id", id)
    .eq("salao_id", salao.id)
    .select(COLUNAS_SERVICO)
    .maybeSingle();
  if (error) return falha("editar serviço", error);
  if (!data) return erro(ERRO_GENERICO);
  atualizarPaginas(salao.slug);
  return sucesso(paraServico(data));
}

/** Arquiva o serviço: deixa de aparecer, mas as marcações antigas mantêm-no. */
export async function removerServico(id: unknown): Promise<Resultado> {
  const salao = await obterSalaoDaSessao();
  if (typeof id !== "string" || id.length > 64) return erro(ERRO_DADOS);
  if (!supabaseConfigurado) return sucesso(undefined);
  if (!UUID_VALIDO.test(id)) return erro(ERRO_DADOS);

  const supabase = await criarClienteSessao();
  const { error } = await supabase
    .from("servicos")
    .update({ ativo: false })
    .eq("id", id)
    .eq("salao_id", salao.id);
  if (error) return falha("remover serviço", error);
  atualizarPaginas(salao.slug);
  return sucesso(undefined);
}

// ───────────────────────────── Equipa ─────────────────────────────

const ERROS_EQUIPA: Record<string, string> = {
  ULTIMO_PROFISSIONAL: "O salão precisa de pelo menos um profissional ativo.",
  TEM_MARCACOES:
    "Este profissional ainda tem marcações por realizar. Cancela-as ou passa-as a outra pessoa primeiro.",
  NAO_ENCONTRADO: ERRO_DADOS,
  DADOS_INVALIDOS: "Verifica os horários: a saída tem de ser depois da entrada.",
};

/** Erros conhecidos da base de dados → mensagem para o dono. */
function falhaEquipa(contexto: string, e: PostgrestError) {
  const codigo = Object.keys(ERROS_EQUIPA).find((c) => e.message.includes(c));
  if (codigo) return erro(ERROS_EQUIPA[codigo]);
  return falha(contexto, e);
}

/** Cria (sem id) ou muda o nome de um profissional. */
export async function guardarProfissional(
  entrada: unknown,
): Promise<Resultado<Profissional>> {
  const salao = await obterSalaoDaSessao();
  const dados = esquemaProfissional.safeParse(entrada);
  if (!dados.success) return erro(ERRO_DADOS);
  const { id, nome } = dados.data;

  if (!supabaseConfigurado) {
    return sucesso({ id: id ?? `demo-${Date.now()}`, salaoId: salao.id, nome, ativo: true });
  }

  const supabase = await criarClienteSessao();

  if (id === undefined) {
    const { count } = await supabase
      .from("profissionais")
      .select("id", { count: "exact", head: true })
      .eq("salao_id", salao.id)
      .eq("ativo", true);
    if (limiteAtingido(salao.plano, "profissionais", count ?? 0)) {
      return erro(ERRO_LIMITE);
    }

    const { data, error } = await supabase
      .from("profissionais")
      .insert({ salao_id: salao.id, nome })
      .select(COLUNAS_PROFISSIONAL)
      .single();
    if (error) return falhaEquipa("criar profissional", error);
    atualizarPaginas(salao.slug);
    return sucesso(paraProfissional(data));
  }

  if (!UUID_VALIDO.test(id)) return erro(ERRO_DADOS);
  const { data, error } = await supabase
    .from("profissionais")
    .update({ nome })
    .eq("id", id)
    .eq("salao_id", salao.id)
    .select(COLUNAS_PROFISSIONAL)
    .maybeSingle();
  if (error) return falhaEquipa("editar profissional", error);
  if (!data) return erro(ERRO_GENERICO);
  atualizarPaginas(salao.slug);
  return sucesso(paraProfissional(data));
}

/**
 * Desativa ou reativa. Desativado, deixa de receber marcações, mas o histórico
 * (e os ganhos antigos) mantém-se. A base de dados recusa desativar o último
 * profissional ou quem ainda tem marcações por realizar.
 */
export async function alterarAtivoProfissional(entrada: unknown): Promise<Resultado> {
  const salao = await obterSalaoDaSessao();
  const dados = esquemaAtivoProfissional.safeParse(entrada);
  if (!dados.success) return erro(ERRO_DADOS);
  if (!supabaseConfigurado) return sucesso(undefined);
  if (!UUID_VALIDO.test(dados.data.id)) return erro(ERRO_DADOS);

  const supabase = await criarClienteSessao();
  const { data, error } = await supabase
    .from("profissionais")
    .update({ ativo: dados.data.ativo })
    .eq("id", dados.data.id)
    .eq("salao_id", salao.id)
    .select("id")
    .maybeSingle();
  if (error) return falhaEquipa("ativar/desativar profissional", error);
  if (!data) return erro(ERRO_GENERICO);
  atualizarPaginas(salao.slug);
  return sucesso(undefined);
}

export async function guardarHorarioProfissional(entrada: unknown): Promise<Resultado> {
  const salao = await obterSalaoDaSessao();
  const dados = esquemaHorarioProfissional.safeParse(entrada);
  if (!dados.success) return erro(ERROS_EQUIPA.DADOS_INVALIDOS);
  if (!supabaseConfigurado) return sucesso(undefined);
  if (!UUID_VALIDO.test(dados.data.profissionalId)) return erro(ERRO_DADOS);

  // A função confirma que o profissional é do salão de quem pede.
  const supabase = await criarClienteSessao();
  const { error } = await supabase.rpc("definir_horario_profissional", {
    p_profissional_id: dados.data.profissionalId,
    p_dias: dados.data.dias.map((d) => ({
      dia_semana: d.diaSemana,
      trabalha: d.trabalha,
      entrada: d.entrada,
      saida: d.saida,
    })),
  });
  if (error) return falhaEquipa("guardar horário do profissional", error);
  atualizarPaginas(salao.slug);
  return sucesso(undefined);
}

// ───────────────────────────── Horários ─────────────────────────────

export async function guardarHorarios(entrada: unknown): Promise<Resultado> {
  const salao = await obterSalaoDaSessao();
  const dados = esquemaHorarios.safeParse(entrada);
  if (!dados.success) return erro(ERRO_DADOS);
  if (!supabaseConfigurado) return sucesso(undefined);

  const supabase = await criarClienteSessao();
  const dias: Pick<HorarioSemanal, "diaSemana" | "aberto" | "abertura" | "fecho">[] =
    dados.data.map((d) => ({ ...d, diaSemana: d.diaSemana as HorarioSemanal["diaSemana"] }));

  for (const dia of dias) {
    const { error } = await supabase
      .from("horarios_semanais")
      .update({ aberto: dia.aberto, abertura: dia.abertura, fecho: dia.fecho })
      .eq("salao_id", salao.id)
      .eq("dia_semana", dia.diaSemana);
    if (error) return falha("guardar horários", error);
  }

  atualizarPaginas(salao.slug);
  return sucesso(undefined);
}

export async function adicionarBloqueio(entrada: unknown): Promise<Resultado<Bloqueio>> {
  const salao = await obterSalaoDaSessao();
  const dados = esquemaBloqueio.safeParse(entrada);
  if (!dados.success) return erro(ERRO_DADOS);

  if (!supabaseConfigurado) {
    return sucesso({
      id: `demo-${Date.now()}`,
      salaoId: salao.id,
      profissionalId: null,
      ...dados.data,
    });
  }

  const supabase = await criarClienteSessao();
  const { data, error } = await supabase
    .from("bloqueios")
    .insert({ salao_id: salao.id, ...dados.data })
    .select(COLUNAS_BLOQUEIO)
    .single();
  if (error) return falha("adicionar bloqueio", error);
  atualizarPaginas(salao.slug);
  return sucesso(paraBloqueio(data));
}

export async function removerBloqueio(id: unknown): Promise<Resultado> {
  const salao = await obterSalaoDaSessao();
  if (typeof id !== "string" || id.length > 64) return erro(ERRO_DADOS);
  if (!supabaseConfigurado) return sucesso(undefined);
  if (!UUID_VALIDO.test(id)) return erro(ERRO_DADOS);

  const supabase = await criarClienteSessao();
  const { error } = await supabase
    .from("bloqueios")
    .delete()
    .eq("id", id)
    .eq("salao_id", salao.id);
  if (error) return falha("remover bloqueio", error);
  atualizarPaginas(salao.slug);
  return sucesso(undefined);
}

// ─────────────────────────── Página pública ───────────────────────────

export async function guardarPaginaPublica(entrada: unknown): Promise<Resultado> {
  const salao = await obterSalaoDaSessao();
  const dados = esquemaPaginaPublica.safeParse(entrada);
  if (!dados.success) return erro(ERRO_DADOS);
  if (!supabaseConfigurado) return sucesso(undefined);

  const { corPrincipal, ...texto } = dados.data;
  // A cor personalizada depende do plano: decide-se aqui, no servidor.
  const campos = planos[salao.plano].recursos.logotipoECor
    ? { ...texto, cor_principal: corPrincipal }
    : texto;

  const supabase = await criarClienteSessao();
  const { error } = await supabase.from("saloes").update(campos).eq("id", salao.id);
  if (error) return falha("guardar página pública", error);
  atualizarPaginas(salao.slug);
  return sucesso(undefined);
}

// ───────────────────────────── Marcações ─────────────────────────────

const ERROS_MARCACAO_MANUAL: Record<string, string> = {
  HORARIO_INDISPONIVEL: "Já existe uma marcação nesse horário para este profissional.",
  DADOS_INVALIDOS: "Verifica os dados: nome, hora e contacto (telefone ou email, opcional).",
};

/** O dono anota uma marcação na sua agenda (em qualquer plano). */
export async function anotarMarcacao(
  entrada: unknown,
): Promise<Resultado<{ marcacao: Marcacao; cliente: Cliente }>> {
  const salao = await obterSalaoDaSessao();
  const dados = esquemaMarcacaoManual.safeParse(entrada);
  if (!dados.success) return erro(ERROS_MARCACAO_MANUAL.DADOS_INVALIDOS);
  const { servicoId, profissionalId, data, hora, nome, contacto } = dados.data;

  if (!supabaseConfigurado) {
    // Modo de demonstração: nada é guardado.
    const servico = (await listarServicos(salao.id)).find((s) => s.id === servicoId);
    if (!servico || horaEmMinutos(hora) + servico.duracaoMinutos >= 24 * 60) {
      return erro(ERROS_MARCACAO_MANUAL.DADOS_INVALIDOS);
    }
    const cliente: Cliente = { id: `demo-cli-${Date.now()}`, salaoId: salao.id, nome, contacto };
    return sucesso({
      cliente,
      marcacao: {
        id: `demo-${Date.now()}`,
        salaoId: salao.id,
        profissionalId: profissionalId ?? "",
        servicoId,
        clienteId: cliente.id,
        data,
        inicio: hora,
        fim: somarMinutos(hora, servico.duracaoMinutos),
        estado: "marcada",
        valorCentimos: null,
      },
    });
  }

  if (!UUID_VALIDO.test(servicoId) || (profissionalId && !UUID_VALIDO.test(profissionalId))) {
    return erro(ERRO_DADOS);
  }

  // A função da base de dados confirma que o serviço é do salão deste dono.
  const supabase = await criarClienteSessao();
  const { data: id, error } = await supabase.rpc("criar_marcacao_manual", {
    p_servico_id: servicoId,
    p_data: data,
    p_inicio: hora,
    p_nome: nome,
    p_contacto: contacto,
    p_profissional_id: profissionalId,
  });
  if (error) {
    const conhecido = ERROS_MARCACAO_MANUAL[error.message];
    if (conhecido) return erro(conhecido);
    return falha("anotar marcação", error);
  }

  const { data: linha, error: erroLeitura } = await supabase
    .from("marcacoes")
    .select(COLUNAS_MARCACAO)
    .eq("id", id)
    .eq("salao_id", salao.id)
    .single();
  if (erroLeitura) return falha("ler marcação anotada", erroLeitura);
  const marcacao = paraMarcacao(linha);

  const { data: linhaCliente, error: erroCliente } = await supabase
    .from("clientes")
    .select(COLUNAS_CLIENTE)
    .eq("id", marcacao.clienteId)
    .single();
  if (erroCliente) return falha("ler cliente", erroCliente);

  revalidatePath("/gestao", "layout");
  return sucesso({ marcacao, cliente: paraCliente(linhaCliente) });
}

export async function alterarEstadoMarcacao(entrada: unknown): Promise<Resultado> {
  const salao = await obterSalaoDaSessao();
  const dados = esquemaEstadoMarcacao.safeParse(entrada);
  if (!dados.success) return erro(ERRO_DADOS);
  if (!supabaseConfigurado) return sucesso(undefined);
  if (!UUID_VALIDO.test(dados.data.id)) return erro(ERRO_DADOS);

  const estado: EstadoMarcacao = dados.data.estado;
  const supabase = await criarClienteSessao();
  const { data, error } = await supabase
    .from("marcacoes")
    .update({
      estado,
      // O valor recebido só faz sentido numa marcação concluída.
      valor_centimos: estado === "concluida" ? dados.data.valorCentimos : null,
    })
    .eq("id", dados.data.id)
    .eq("salao_id", salao.id)
    .select("id")
    .maybeSingle();

  if (error) {
    // 23P01 = já existe outra marcação ativa nesse horário.
    if (error.code === "23P01") {
      return erro("Já existe outra marcação nesse horário para este profissional.");
    }
    return falha("alterar marcação", error);
  }
  if (!data) return erro(ERRO_GENERICO);

  revalidatePath("/gestao", "layout");
  return sucesso(undefined);
}
