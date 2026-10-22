/**
 * Modelo de domínio do Flip Estética.
 *
 * Estes tipos espelham 1:1 as tabelas descritas em `prisma/schema.prisma`.
 * Quando a base de dados for ligada, o resto da aplicação não precisa de mudar.
 *
 * IMPORTANTE — os horários livres NÃO são guardados.
 * Guardamos apenas as regras (horário semanal, dias especiais, bloqueios,
 * duração dos serviços) e as marcações. As vagas são calculadas a pedido
 * em `lib/disponibilidade.ts`. Assim, qualquer alteração do proprietário
 * reflete-se de imediato e nunca há vagas "fantasma" desatualizadas.
 */

import type { DataISO } from "./tempo";

export type Plano = "solo" | "equipa";

export type TipoNegocio = "barbearia" | "salao" | "estetica" | "unhas" | "outro";

/**
 * Como as vagas são geradas:
 * - "duracao_servico": as vagas seguem a duração do serviço escolhido
 *   (ex.: serviço de 45 min → 09:00, 09:45, 10:30…). Aproveita ao máximo o dia.
 * - "intervalo_fixo": as vagas começam sempre numa grelha fixa definida pelo
 *   proprietário (ex.: a cada 30 min → 09:00, 09:30, 10:00…).
 */
export type ModoVagas = "duracao_servico" | "intervalo_fixo";

export interface RegrasMarcacao {
  modoVagas: ModoVagas;
  /** Usado no modo "intervalo_fixo" (minutos). */
  intervaloFixoMin: number;
  /** Tempo livre obrigatório entre marcações (limpeza, preparação…). */
  folgaEntreMarcacoesMin: number;
  /** Com quanta antecedência mínima o cliente pode marcar (minutos). */
  antecedenciaMinimaMin: number;
  /** Até quantos dias no futuro o cliente pode marcar. */
  janelaMarcacaoDias: number;
}

export interface Negocio {
  id: string;
  slug: string;
  nome: string;
  tipo: TipoNegocio;
  apresentacao: string;
  morada: string;
  telefone: string;
  corPrincipal: string;
  logotipoUrl: string | null;
  fusoHorario: string;
  plano: Plano;
  regras: RegrasMarcacao;
  criadoEm: string;
}

export interface Profissional {
  id: string;
  negocioId: string;
  nome: string;
  cargo: string;
  cor: string;
  ativo: boolean;
}

export interface Servico {
  id: string;
  negocioId: string;
  nome: string;
  descricao: string;
  duracaoMin: number;
  precoCentimos: number;
  ativo: boolean;
  /** Profissionais que fazem este serviço (no plano Solo é sempre o único). */
  profissionalIds: string[];
}

/** Um período de trabalho dentro de um dia, em minutos desde a meia-noite. */
export interface Intervalo {
  inicioMin: number;
  fimMin: number;
}

/**
 * Horário semanal de um profissional: um registo por dia da semana.
 * `intervalos` vazio = não trabalha nesse dia.
 * As pausas são simplesmente os espaços entre intervalos — o proprietário
 * decide se tem pausa, quantas e quando.
 */
export interface HorarioSemanal {
  profissionalId: string;
  /** 0 = domingo … 6 = sábado */
  diaSemana: number;
  intervalos: Intervalo[];
}

/**
 * Dia(s) especial(ais) que substituem o horário semanal:
 * folgas, férias, feriados ou um horário diferente (ex.: abrir num domingo).
 * `intervalos` vazio = não trabalha nesse período.
 */
export interface DiaEspecial {
  id: string;
  profissionalId: string;
  dataInicio: DataISO;
  dataFim: DataISO;
  intervalos: Intervalo[];
  motivo: string;
}

/** Bloqueia algumas horas numa data, sem mexer no resto do horário. */
export interface Bloqueio {
  id: string;
  profissionalId: string;
  data: DataISO;
  inicioMin: number;
  fimMin: number;
  motivo: string;
}

export interface Cliente {
  id: string;
  negocioId: string;
  nome: string;
  telefone: string;
  email: string;
  notas: string;
  criadoEm: string;
}

export type EstadoMarcacao = "confirmada" | "concluida" | "cancelada" | "falta";
export type OrigemMarcacao = "online" | "manual";

export interface Marcacao {
  id: string;
  negocioId: string;
  profissionalId: string;
  servicoId: string;
  clienteId: string;
  data: DataISO;
  inicioMin: number;
  fimMin: number;
  estado: EstadoMarcacao;
  origem: OrigemMarcacao;
  /** Preço guardado no momento da marcação (o serviço pode mudar depois). */
  precoCentimos: number;
  notas: string;
  criadaEm: string;
}

/** Dados do negócio que podem ser enviados para o browser do cliente. */
export type NegocioPublico = Pick<
  Negocio,
  | "slug"
  | "nome"
  | "tipo"
  | "apresentacao"
  | "morada"
  | "telefone"
  | "corPrincipal"
  | "logotipoUrl"
  | "plano"
> & { janelaMarcacaoDias: number };

export type ProfissionalPublico = Pick<Profissional, "id" | "nome" | "cargo" | "cor">;

export type ServicoPublico = Pick<
  Servico,
  "id" | "nome" | "descricao" | "duracaoMin" | "precoCentimos" | "profissionalIds"
>;

export type Resultado<T = null> =
  | { ok: true; dados: T }
  | { ok: false; erro: string };
