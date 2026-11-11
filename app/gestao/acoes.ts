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
  COLUNAS_SERVICO,
  paraBloqueio,
  paraServico,
} from "@/lib/mapear";
import type { Bloqueio, EstadoMarcacao, HorarioSemanal, Servico } from "@/lib/modelo";
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
  esquemaBloqueio,
  esquemaEstadoMarcacao,
  esquemaHorarios,
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
