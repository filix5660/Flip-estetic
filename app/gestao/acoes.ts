"use server";

/**
 * Server Actions da área de gestão.
 * Cada ação: confirma o negócio da sessão → valida os dados → grava no
 * repositório → atualiza as páginas. Quando ligares a base de dados,
 * este ficheiro não precisa de mudar.
 */

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { repo } from "@/lib/dados";
import { reservar, vagasDoDia, type Vaga } from "@/lib/agendamento";
import { intervalosSobrepoem, validarIntervalos } from "@/lib/disponibilidade";
import { PLANOS, podeAdicionarProfissional } from "@/lib/planos";
import { COOKIE_NEGOCIO_DEMO, obterNegocioAtual } from "@/lib/sessao";
import { agoraNoFuso, ehDataValida, type DataISO } from "@/lib/tempo";
import type {
  EstadoMarcacao,
  Intervalo,
  Negocio,
  Plano,
  RegrasMarcacao,
  Resultado,
  TipoNegocio,
} from "@/lib/tipos";
import {
  corValida,
  emailValido,
  slugValido,
  telefoneValido,
} from "@/lib/validar";

const OK = { ok: true, dados: null } as const;
const erro = (mensagem: string) => ({ ok: false as const, erro: mensagem });

function atualizarPaginas() {
  revalidatePath("/", "layout");
}

async function profissionalDoNegocio(negocio: Negocio, profissionalId: string) {
  const profissionais = await repo.profissionais.listar(negocio.id);
  return profissionais.find((p) => p.id === profissionalId) ?? null;
}

async function marcacoesFuturas(negocio: Negocio, filtro: { profissionalId?: string }) {
  const hoje = agoraNoFuso(negocio.fusoHorario).data;
  const marcacoes = await repo.marcacoes.listar({
    negocioId: negocio.id,
    de: hoje,
    ate: "9999-12-31",
    ...filtro,
  });
  return marcacoes.filter((m) => m.estado === "confirmada");
}

// ───────────────────────── Demonstração ─────────────────────────

export async function trocarNegocioDemo(negocioId: string) {
  const negocio = await repo.negocios.porId(negocioId);
  if (!negocio) return;
  (await cookies()).set(COOKIE_NEGOCIO_DEMO, negocio.id, { path: "/", sameSite: "lax" });
  atualizarPaginas();
}

// ───────────────────────── Serviços ─────────────────────────

export interface DadosServico {
  id?: string;
  nome: string;
  descricao: string;
  duracaoMin: number;
  precoCentimos: number;
  ativo: boolean;
  profissionalIds: string[];
}

export async function guardarServico(dados: DadosServico): Promise<Resultado> {
  const negocio = await obterNegocioAtual();
  const nome = dados.nome.trim();

  if (nome.length < 2) return erro("Dá um nome ao serviço.");
  if (!Number.isInteger(dados.duracaoMin) || dados.duracaoMin < 5 || dados.duracaoMin > 600) {
    return erro("A duração tem de estar entre 5 minutos e 10 horas.");
  }
  if (!Number.isInteger(dados.precoCentimos) || dados.precoCentimos < 0) {
    return erro("Indica um preço válido.");
  }

  const profissionais = await repo.profissionais.listar(negocio.id);
  const idsValidos = new Set(profissionais.map((p) => p.id));
  // No plano Solo o serviço é sempre do único profissional.
  const profissionalIds =
    negocio.plano === "solo"
      ? profissionais.slice(0, 1).map((p) => p.id)
      : dados.profissionalIds.filter((id) => idsValidos.has(id));

  if (profissionalIds.length === 0) {
    return erro("Escolhe pelo menos um profissional que faça este serviço.");
  }

  const registo = {
    nome,
    descricao: dados.descricao.trim(),
    duracaoMin: dados.duracaoMin,
    precoCentimos: dados.precoCentimos,
    ativo: dados.ativo,
    profissionalIds,
  };

  if (dados.id) {
    const existente = await repo.servicos.porId(dados.id);
    if (!existente || existente.negocioId !== negocio.id) return erro("Serviço não encontrado.");
    await repo.servicos.atualizar(dados.id, registo);
  } else {
    await repo.servicos.criar({ negocioId: negocio.id, ...registo });
  }

  atualizarPaginas();
  return OK;
}

export async function removerServico(id: string): Promise<Resultado> {
  const negocio = await obterNegocioAtual();
  const servico = await repo.servicos.porId(id);
  if (!servico || servico.negocioId !== negocio.id) return erro("Serviço não encontrado.");

  const futuras = (await marcacoesFuturas(negocio, {})).filter((m) => m.servicoId === id);
  if (futuras.length > 0) {
    return erro(
      `Há ${futuras.length} marcação(ões) futura(s) com este serviço. Desativa-o em vez de o remover.`,
    );
  }

  await repo.servicos.remover(id);
  atualizarPaginas();
  return OK;
}

// ───────────────────────── Profissionais ─────────────────────────

export interface DadosProfissional {
  id?: string;
  nome: string;
  cargo: string;
  cor: string;
  ativo: boolean;
}

export async function guardarProfissional(dados: DadosProfissional): Promise<Resultado> {
  const negocio = await obterNegocioAtual();
  const nome = dados.nome.trim();
  if (nome.length < 2) return erro("Indica o nome do profissional.");
  if (!corValida(dados.cor)) return erro("Escolhe uma cor válida.");

  const registo = { nome, cargo: dados.cargo.trim(), cor: dados.cor, ativo: dados.ativo };
  const profissionais = await repo.profissionais.listar(negocio.id);

  if (dados.id) {
    if (!profissionais.some((p) => p.id === dados.id)) return erro("Profissional não encontrado.");
    if (!dados.ativo && profissionais.filter((p) => p.ativo).length <= 1) {
      return erro("Tem de existir pelo menos um profissional ativo.");
    }
    await repo.profissionais.atualizar(dados.id, registo);
  } else {
    if (!podeAdicionarProfissional(negocio.plano, profissionais.length)) {
      return erro(
        `O plano ${PLANOS[negocio.plano].nome} permite até ${PLANOS[negocio.plano].maxProfissionais} profissional(ais).`,
      );
    }
    const novo = await repo.profissionais.criar({ negocioId: negocio.id, ...registo });

    // Começa com o horário do primeiro profissional e com todos os serviços.
    const referencia = profissionais[0];
    if (referencia) {
      for (const dia of await repo.horarios.semanal(referencia.id)) {
        await repo.horarios.definirDia(novo.id, dia.diaSemana, dia.intervalos);
      }
    }
    for (const servico of await repo.servicos.listar(negocio.id)) {
      await repo.servicos.atualizar(servico.id, {
        profissionalIds: [...servico.profissionalIds, novo.id],
      });
    }
  }

  atualizarPaginas();
  return OK;
}

export async function removerProfissional(id: string): Promise<Resultado> {
  const negocio = await obterNegocioAtual();
  const profissionais = await repo.profissionais.listar(negocio.id);
  if (!profissionais.some((p) => p.id === id)) return erro("Profissional não encontrado.");
  if (profissionais.length <= 1) return erro("O negócio precisa de pelo menos um profissional.");

  const futuras = await marcacoesFuturas(negocio, { profissionalId: id });
  if (futuras.length > 0) {
    return erro(
      `Este profissional tem ${futuras.length} marcação(ões) futura(s). Desativa-o ou cancela-as primeiro.`,
    );
  }

  await repo.profissionais.remover(id);
  atualizarPaginas();
  return OK;
}

// ───────────────────────── Horários ─────────────────────────

export async function guardarHorarioSemanal(
  profissionalId: string,
  dias: { diaSemana: number; intervalos: Intervalo[] }[],
): Promise<Resultado> {
  const negocio = await obterNegocioAtual();
  if (!(await profissionalDoNegocio(negocio, profissionalId))) {
    return erro("Profissional não encontrado.");
  }

  for (const dia of dias) {
    if (dia.diaSemana < 0 || dia.diaSemana > 6) return erro("Dia da semana inválido.");
    const problema = validarIntervalos(dia.intervalos);
    if (problema) return erro(problema);
  }

  for (const dia of dias) {
    await repo.horarios.definirDia(profissionalId, dia.diaSemana, dia.intervalos);
  }

  atualizarPaginas();
  return OK;
}

export interface DadosDiaEspecial {
  profissionalId: string;
  dataInicio: DataISO;
  dataFim: DataISO;
  intervalos: Intervalo[];
  motivo: string;
}

export async function criarDiaEspecial(
  dados: DadosDiaEspecial,
): Promise<Resultado<{ aviso: string | null }>> {
  const negocio = await obterNegocioAtual();
  if (!(await profissionalDoNegocio(negocio, dados.profissionalId))) {
    return erro("Profissional não encontrado.");
  }
  if (!ehDataValida(dados.dataInicio) || !ehDataValida(dados.dataFim)) {
    return erro("Indica datas válidas.");
  }
  if (dados.dataFim < dados.dataInicio) return erro("A data de fim tem de ser depois da de início.");
  const problema = validarIntervalos(dados.intervalos);
  if (problema) return erro(problema);

  await repo.horarios.criarDiaEspecial({ ...dados, motivo: dados.motivo.trim() });

  const afetadas = (await marcacoesFuturas(negocio, { profissionalId: dados.profissionalId }))
    .filter((m) => m.data >= dados.dataInicio && m.data <= dados.dataFim);

  atualizarPaginas();
  return {
    ok: true,
    dados: {
      aviso:
        afetadas.length > 0
          ? `Atenção: já existem ${afetadas.length} marcação(ões) neste período. Elas mantêm-se — verifica-as na agenda.`
          : null,
    },
  };
}

export async function removerDiaEspecial(id: string, profissionalId: string): Promise<Resultado> {
  const negocio = await obterNegocioAtual();
  if (!(await profissionalDoNegocio(negocio, profissionalId))) {
    return erro("Profissional não encontrado.");
  }
  const dias = await repo.horarios.diasEspeciais(profissionalId);
  if (!dias.some((d) => d.id === id)) return erro("Registo não encontrado.");
  await repo.horarios.removerDiaEspecial(id);
  atualizarPaginas();
  return OK;
}

export interface DadosBloqueio {
  profissionalId: string;
  data: DataISO;
  inicioMin: number;
  fimMin: number;
  motivo: string;
}

export async function criarBloqueio(dados: DadosBloqueio): Promise<Resultado> {
  const negocio = await obterNegocioAtual();
  if (!(await profissionalDoNegocio(negocio, dados.profissionalId))) {
    return erro("Profissional não encontrado.");
  }
  if (!ehDataValida(dados.data)) return erro("Indica uma data válida.");
  if (dados.data < agoraNoFuso(negocio.fusoHorario).data) {
    return erro("Não é possível bloquear datas que já passaram.");
  }
  const problema = validarIntervalos([dados]);
  if (problema) return erro(problema);

  await repo.horarios.criarBloqueio({ ...dados, motivo: dados.motivo.trim() });
  atualizarPaginas();
  return OK;
}

export async function removerBloqueio(id: string, profissionalId: string): Promise<Resultado> {
  const negocio = await obterNegocioAtual();
  if (!(await profissionalDoNegocio(negocio, profissionalId))) {
    return erro("Profissional não encontrado.");
  }
  const bloqueios = await repo.horarios.bloqueios(profissionalId);
  if (!bloqueios.some((b) => b.id === id)) return erro("Registo não encontrado.");
  await repo.horarios.removerBloqueio(id);
  atualizarPaginas();
  return OK;
}

export async function guardarRegras(regras: RegrasMarcacao): Promise<Resultado> {
  const negocio = await obterNegocioAtual();
  if (!["duracao_servico", "intervalo_fixo"].includes(regras.modoVagas)) {
    return erro("Modo de vagas inválido.");
  }
  const inteiro = (v: number, min: number, max: number) =>
    Number.isInteger(v) && v >= min && v <= max;

  if (!inteiro(regras.intervaloFixoMin, 5, 240)) return erro("O intervalo fixo tem de estar entre 5 e 240 minutos.");
  if (!inteiro(regras.folgaEntreMarcacoesMin, 0, 120)) return erro("A folga entre marcações tem de estar entre 0 e 120 minutos.");
  if (!inteiro(regras.antecedenciaMinimaMin, 0, 60 * 24 * 14)) return erro("Antecedência mínima inválida.");
  if (!inteiro(regras.janelaMarcacaoDias, 1, 365)) return erro("A janela de marcação tem de estar entre 1 e 365 dias.");

  await repo.negocios.atualizar(negocio.id, { regras });
  atualizarPaginas();
  return OK;
}

// ───────────────────────── Página pública e plano ─────────────────────────

export interface DadosPaginaPublica {
  nome: string;
  slug: string;
  tipo: TipoNegocio;
  apresentacao: string;
  morada: string;
  telefone: string;
  corPrincipal: string;
  logotipoUrl: string | null;
}

export async function guardarPaginaPublica(dados: DadosPaginaPublica): Promise<Resultado> {
  const negocio = await obterNegocioAtual();
  const nome = dados.nome.trim();
  const slug = dados.slug.trim().toLowerCase();

  if (nome.length < 2) return erro("Indica o nome do negócio.");
  if (!slugValido(slug)) {
    return erro("O endereço só pode ter letras minúsculas, números e hífenes (3 a 50 caracteres).");
  }
  const dono = await repo.negocios.porSlug(slug);
  if (dono && dono.id !== negocio.id) return erro("Esse endereço já está a ser usado. Experimenta outro.");
  if (!corValida(dados.corPrincipal)) return erro("Escolhe uma cor válida.");
  if (dados.telefone && !telefoneValido(dados.telefone)) return erro("O telefone não parece válido.");
  // TODO(armazenamento): enviar o logótipo para um storage (S3, R2, Supabase…)
  // e guardar só o URL. Por agora aceitamos imagens pequenas em data URL.
  if (dados.logotipoUrl && dados.logotipoUrl.length > 700_000) {
    return erro("O logótipo é demasiado grande (máximo 500 KB).");
  }

  await repo.negocios.atualizar(negocio.id, {
    nome,
    slug,
    tipo: dados.tipo,
    apresentacao: dados.apresentacao.trim().slice(0, 160),
    morada: dados.morada.trim(),
    telefone: dados.telefone.trim(),
    corPrincipal: dados.corPrincipal,
    logotipoUrl: dados.logotipoUrl,
  });

  atualizarPaginas();
  return OK;
}

export async function mudarPlano(plano: Plano): Promise<Resultado> {
  const negocio = await obterNegocioAtual();
  if (!PLANOS[plano]) return erro("Plano inválido.");

  const profissionais = await repo.profissionais.listar(negocio.id);
  if (profissionais.length > PLANOS[plano].maxProfissionais) {
    return erro(
      `O plano ${PLANOS[plano].nome} só permite ${PLANOS[plano].maxProfissionais} profissional. Remove os restantes primeiro.`,
    );
  }

  // TODO(pagamentos): integrar com Stripe (checkout + webhooks) antes de mudar o plano.
  await repo.negocios.atualizar(negocio.id, { plano });
  atualizarPaginas();
  return OK;
}

// ───────────────────────── Marcações ─────────────────────────

export async function alterarEstadoMarcacao(
  id: string,
  estado: EstadoMarcacao,
): Promise<Resultado> {
  const negocio = await obterNegocioAtual();
  const marcacao = await repo.marcacoes.porId(id);
  if (!marcacao || marcacao.negocioId !== negocio.id) return erro("Marcação não encontrada.");
  if (!["confirmada", "concluida", "cancelada", "falta"].includes(estado)) {
    return erro("Estado inválido.");
  }

  // Repor uma marcação cancelada só se o horário continuar livre.
  if (marcacao.estado === "cancelada" && estado !== "cancelada") {
    const outras = await repo.marcacoes.listar({
      negocioId: negocio.id,
      profissionalId: marcacao.profissionalId,
      de: marcacao.data,
      ate: marcacao.data,
    });
    const conflito = outras.some(
      (o) => o.id !== marcacao.id && o.estado !== "cancelada" && intervalosSobrepoem(o, marcacao),
    );
    if (conflito) return erro("Esse horário já foi ocupado por outra marcação.");
  }

  await repo.marcacoes.alterarEstado(id, estado);
  atualizarPaginas();
  return OK;
}

export async function carregarVagasGestao(
  servicoId: string,
  profissionalId: string | null,
  data: DataISO,
  comoCliente = false,
): Promise<Resultado<Vaga[]>> {
  const negocio = await obterNegocioAtual();
  const servico = await repo.servicos.porId(servicoId);
  if (!servico || servico.negocioId !== negocio.id) return erro("Serviço não encontrado.");
  if (!ehDataValida(data)) return erro("Data inválida.");
  const vagas = await vagasDoDia(negocio, servico, profissionalId, data, {
    ignorarLimitesDoCliente: !comoCliente,
  });
  return { ok: true, dados: vagas };
}

export interface DadosMarcacaoManual {
  servicoId: string;
  profissionalId: string | null;
  data: DataISO;
  inicioMin: number;
  horaLivre: boolean;
  cliente: { nome: string; telefone: string; email: string };
  notas: string;
}

export async function criarMarcacaoManual(dados: DadosMarcacaoManual): Promise<Resultado> {
  const negocio = await obterNegocioAtual();
  if (dados.cliente.nome.trim().length < 2) return erro("Indica o nome do cliente.");
  if (!telefoneValido(dados.cliente.telefone)) return erro("Indica um telefone válido.");
  if (dados.cliente.email && !emailValido(dados.cliente.email)) return erro("O email não parece válido.");
  if (!ehDataValida(dados.data)) return erro("Data inválida.");

  const resultado = await reservar({
    negocio,
    servicoId: dados.servicoId,
    profissionalId: dados.profissionalId,
    data: dados.data,
    inicioMin: dados.inicioMin,
    horaLivre: dados.horaLivre,
    cliente: dados.cliente,
    notas: dados.notas,
    origem: "manual",
  });
  if (!resultado.ok) return resultado;

  atualizarPaginas();
  return OK;
}
