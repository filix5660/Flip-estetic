/**
 * Regras de negócio da marcação (lado do servidor).
 * Junta o repositório de dados com o cálculo puro de `disponibilidade.ts`.
 */

import { repo } from "./dados";
import {
  calcularVagas,
  intervalosOcupados,
  intervalosSobrepoem,
  linhaDoTempo,
  periodosDeTrabalho,
  type ItemLinhaTempo,
} from "./disponibilidade";
import {
  agoraNoFuso,
  diasNoMes,
  partesParaIso,
  somarDias,
  type DataISO,
} from "./tempo";
import type {
  Cliente,
  DiaEspecial,
  Marcacao,
  Negocio,
  Profissional,
  Resultado,
  Servico,
} from "./tipos";
import { normalizarTelefone } from "./validar";

export interface Vaga {
  inicioMin: number;
  /** Profissionais livres nesse horário. */
  profissionalIds: string[];
}

async function contexto(profissionalId: string, de: DataISO, ate: DataISO, negocioId: string) {
  const [horarioSemanal, diasEspeciais, bloqueios, marcacoes] = await Promise.all([
    repo.horarios.semanal(profissionalId),
    repo.horarios.diasEspeciais(profissionalId, de, ate),
    repo.horarios.bloqueios(profissionalId, de, ate),
    repo.marcacoes.listar({ negocioId, profissionalId, de, ate }),
  ]);
  return { horarioSemanal, diasEspeciais, bloqueios, marcacoes };
}

/** Profissionais ativos que fazem o serviço (opcionalmente só um). */
async function profissionaisPara(
  negocio: Negocio,
  servico: Servico,
  profissionalId: string | null,
): Promise<Profissional[]> {
  const todos = await repo.profissionais.listar(negocio.id);
  return todos.filter(
    (p) =>
      p.ativo &&
      servico.profissionalIds.includes(p.id) &&
      (!profissionalId || p.id === profissionalId),
  );
}

export async function vagasNoPeriodo(
  negocio: Negocio,
  servico: Servico,
  profissionalId: string | null,
  de: DataISO,
  ate: DataISO,
  opcoes: { ignorarLimitesDoCliente?: boolean } = {},
): Promise<Map<DataISO, Vaga[]>> {
  const agora = agoraNoFuso(negocio.fusoHorario);
  const profissionais = await profissionaisPara(negocio, servico, profissionalId);
  const porDia = new Map<DataISO, Map<number, string[]>>();

  for (const profissional of profissionais) {
    const ctx = await contexto(profissional.id, de, ate, negocio.id);
    for (let data = de; data <= ate; data = somarDias(data, 1)) {
      const vagas = calcularVagas({
        data,
        duracaoMin: servico.duracaoMin,
        regras: negocio.regras,
        agora,
        ignorarLimitesDoCliente: opcoes.ignorarLimitesDoCliente,
        ...ctx,
      });
      if (vagas.length === 0) continue;
      const mapa = porDia.get(data) ?? new Map<number, string[]>();
      for (const inicio of vagas) {
        mapa.set(inicio, [...(mapa.get(inicio) ?? []), profissional.id]);
      }
      porDia.set(data, mapa);
    }
  }

  const resultado = new Map<DataISO, Vaga[]>();
  for (const [data, mapa] of porDia) {
    resultado.set(
      data,
      [...mapa.entries()]
        .sort(([a], [b]) => a - b)
        .map(([inicioMin, profissionalIds]) => ({ inicioMin, profissionalIds })),
    );
  }
  return resultado;
}

export async function vagasDoDia(
  negocio: Negocio,
  servico: Servico,
  profissionalId: string | null,
  data: DataISO,
  opcoes: { ignorarLimitesDoCliente?: boolean } = {},
): Promise<Vaga[]> {
  const mapa = await vagasNoPeriodo(negocio, servico, profissionalId, data, data, opcoes);
  return mapa.get(data) ?? [];
}

/** Dias de um mês com pelo menos uma vaga (para o calendário do cliente). */
export async function diasComVaga(
  negocio: Negocio,
  servico: Servico,
  profissionalId: string | null,
  ano: number,
  mes: number,
): Promise<DataISO[]> {
  const hoje = agoraNoFuso(negocio.fusoHorario).data;
  const ultimoPermitido = somarDias(hoje, negocio.regras.janelaMarcacaoDias);
  const inicioMes = partesParaIso(ano, mes, 1);
  const fimMes = partesParaIso(ano, mes, diasNoMes(ano, mes));
  const de = inicioMes > hoje ? inicioMes : hoje;
  const ate = fimMes < ultimoPermitido ? fimMes : ultimoPermitido;
  if (de > ate) return [];

  const mapa = await vagasNoPeriodo(negocio, servico, profissionalId, de, ate);
  return [...mapa.keys()].sort();
}

export interface PedidoMarcacao {
  negocio: Negocio;
  servicoId: string;
  profissionalId: string | null;
  data: DataISO;
  inicioMin: number;
  cliente: { nome: string; telefone: string; email?: string };
  notas?: string;
  origem: Marcacao["origem"];
  /** Só para marcações do proprietário: aceita qualquer hora sem sobreposição. */
  horaLivre?: boolean;
}

async function encontrarOuCriarCliente(
  negocioId: string,
  dados: PedidoMarcacao["cliente"],
): Promise<Cliente> {
  const existente = await repo.clientes.porTelefone(negocioId, dados.telefone);
  if (existente) {
    if (dados.email && !existente.email) {
      return repo.clientes.atualizar(existente.id, { email: dados.email });
    }
    return existente;
  }
  return repo.clientes.criar({
    negocioId,
    nome: dados.nome.trim(),
    telefone: normalizarTelefone(dados.telefone),
    email: dados.email?.trim() ?? "",
    notas: "",
  });
}

export async function reservar(pedido: PedidoMarcacao): Promise<Resultado<Marcacao>> {
  const { negocio } = pedido;
  const servico = await repo.servicos.porId(pedido.servicoId);
  if (!servico || servico.negocioId !== negocio.id || !servico.ativo) {
    return { ok: false, erro: "Este serviço já não está disponível." };
  }

  const manual = pedido.origem === "manual";
  const fimMin = pedido.inicioMin + servico.duracaoMin;
  let profissionalId: string | null = null;

  if (manual && pedido.horaLivre) {
    // O proprietário pode marcar fora do horário, mas nunca por cima de outra marcação.
    if (!pedido.profissionalId) {
      return { ok: false, erro: "Escolhe o profissional." };
    }
    const ctx = await contexto(pedido.profissionalId, pedido.data, pedido.data, negocio.id);
    const ocupado = intervalosOcupados(ctx.marcacoes, ctx.bloqueios);
    if (ocupado.some((o) => intervalosSobrepoem(o, { inicioMin: pedido.inicioMin, fimMin }))) {
      return { ok: false, erro: "Já existe uma marcação ou bloqueio nesse horário." };
    }
    if (fimMin > 24 * 60) {
      return { ok: false, erro: "A marcação tem de terminar no mesmo dia." };
    }
    profissionalId = pedido.profissionalId;
  } else {
    // Recalcula as vagas no momento da confirmação: evita marcações duplicadas.
    const vagas = await vagasDoDia(negocio, servico, pedido.profissionalId, pedido.data, {
      ignorarLimitesDoCliente: manual,
    });
    const vaga = vagas.find((v) => v.inicioMin === pedido.inicioMin);
    if (!vaga) {
      return {
        ok: false,
        erro: "Este horário acabou de ficar ocupado. Escolhe outro, por favor.",
      };
    }
    profissionalId = await escolherProfissional(negocio, pedido.data, vaga.profissionalIds);
  }

  const cliente = await encontrarOuCriarCliente(negocio.id, pedido.cliente);
  const marcacao = await repo.marcacoes.criar({
    negocioId: negocio.id,
    profissionalId,
    servicoId: servico.id,
    clienteId: cliente.id,
    data: pedido.data,
    inicioMin: pedido.inicioMin,
    fimMin,
    estado: "confirmada",
    origem: pedido.origem,
    precoCentimos: servico.precoCentimos,
    notas: pedido.notas?.trim() ?? "",
  });

  return { ok: true, dados: marcacao };
}

/** Com "sem preferência", atribui ao profissional com menos marcações nesse dia. */
async function escolherProfissional(
  negocio: Negocio,
  data: DataISO,
  candidatos: string[],
): Promise<string> {
  if (candidatos.length === 1) return candidatos[0];
  const marcacoes = await repo.marcacoes.listar({ negocioId: negocio.id, de: data, ate: data });
  const carga = (id: string) =>
    marcacoes.filter((m) => m.profissionalId === id && m.estado === "confirmada").length;
  return [...candidatos].sort((a, b) => carga(a) - carga(b))[0];
}

export interface MarcacaoDetalhada extends Marcacao {
  cliente: Cliente | null;
  servico: Servico | null;
  profissional: Profissional | null;
}

export async function detalharMarcacoes(
  negocioId: string,
  marcacoes: Marcacao[],
): Promise<MarcacaoDetalhada[]> {
  const [clientes, servicos, profissionais] = await Promise.all([
    repo.clientes.listar(negocioId),
    repo.servicos.listar(negocioId),
    repo.profissionais.listar(negocioId),
  ]);
  return marcacoes.map((m) => ({
    ...m,
    cliente: clientes.find((c) => c.id === m.clienteId) ?? null,
    servico: servicos.find((s) => s.id === m.servicoId) ?? null,
    profissional: profissionais.find((p) => p.id === m.profissionalId) ?? null,
  }));
}

export interface DiaDoProfissional {
  profissional: Profissional;
  periodos: { inicioMin: number; fimMin: number }[];
  diaEspecial?: DiaEspecial;
  linha: ItemLinhaTempo[];
  marcacoes: MarcacaoDetalhada[];
  canceladas: MarcacaoDetalhada[];
}

/** Tudo o que a agenda precisa para mostrar um dia. */
export async function diaNaAgenda(
  negocio: Negocio,
  data: DataISO,
  profissionalId?: string,
): Promise<DiaDoProfissional[]> {
  const profissionais = (await repo.profissionais.listar(negocio.id)).filter(
    (p) => p.ativo && (!profissionalId || p.id === profissionalId),
  );

  return Promise.all(
    profissionais.map(async (profissional) => {
      const ctx = await contexto(profissional.id, data, data, negocio.id);
      const periodos = periodosDeTrabalho(data, ctx.horarioSemanal, ctx.diasEspeciais);
      const detalhadas = await detalharMarcacoes(negocio.id, ctx.marcacoes);
      return {
        profissional,
        periodos: periodos.intervalos,
        diaEspecial: periodos.diaEspecial,
        linha: linhaDoTempo(periodos.intervalos, ctx.marcacoes, ctx.bloqueios),
        marcacoes: detalhadas.filter((m) => m.estado !== "cancelada"),
        canceladas: detalhadas.filter((m) => m.estado === "cancelada"),
      };
    }),
  );
}
