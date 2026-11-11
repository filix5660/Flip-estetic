// Modelo de dados do Flip.
//
// Cada registo pertence a um salão (`salaoId`): um salão nunca vê os dados
// de outro. Estes tipos espelham as futuras tabelas da base de dados.
//
// Datas e horas guardam a "hora de parede" do salão (data "AAAA-MM-DD" e
// hora "HH:MM" no fuso do salão, por omissão Europe/Lisbon). Uma marcação às
// 10:00 é às 10:00 em Lisboa, com ou sem horário de verão.
//
// Valores em dinheiro são guardados em cêntimos (inteiros) para evitar erros
// de arredondamento: 15,50 € = 1550.

export type TipoSalao =
  | "barbearia"
  | "estetica"
  | "cabeleireiro"
  | "unhas"
  | "outro";

export type IdPlano = "demo" | "essencial" | "profissional";

/** "AAAA-MM-DD" */
export type Data = string;
/** "HH:MM" (24 horas) */
export type Hora = string;

export type Salao = {
  id: string;
  /** Endereço público da página de marcação: /<slug> */
  slug: string;
  nome: string;
  tipo: TipoSalao;
  apresentacao: string;
  morada: string;
  telefone: string;
  corPrincipal: string;
  logotipoUrl: string | null;
  plano: IdPlano;
  fusoHorario: string;
};

export type Profissional = {
  id: string;
  salaoId: string;
  nome: string;
  ativo: boolean;
};

export type Servico = {
  id: string;
  salaoId: string;
  nome: string;
  duracaoMinutos: number;
  precoCentimos: number;
  ativo: boolean;
};

/** 0 = domingo … 6 = sábado (igual a Date.getDay()). */
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type HorarioSemanal = {
  salaoId: string;
  diaSemana: DiaSemana;
  aberto: boolean;
  abertura: Hora;
  fecho: Hora;
};

/** Intervalo fechado numa data específica (salão inteiro ou um profissional). */
export type Bloqueio = {
  id: string;
  salaoId: string;
  profissionalId: string | null;
  data: Data;
  inicio: Hora;
  fim: Hora;
  motivo: string;
};

/** Dados pessoais: guardar só o mínimo necessário para a marcação (RGPD). */
export type Cliente = {
  id: string;
  salaoId: string;
  nome: string;
  /** Telefone ou email, como o cliente indicou ao marcar. */
  contacto: string;
};

/**
 * marcada   → o cliente agendou
 * concluida → o salão confirmou que o serviço foi feito; conta para os ganhos
 * faltou    → o cliente não apareceu
 * cancelada → desmarcada antes da hora
 */
export type EstadoMarcacao = "marcada" | "concluida" | "faltou" | "cancelada";

export type Marcacao = {
  id: string;
  salaoId: string;
  profissionalId: string;
  servicoId: string;
  clienteId: string;
  data: Data;
  inicio: Hora;
  fim: Hora;
  estado: EstadoMarcacao;
  /**
   * Valor efetivamente cobrado, definido ao concluir (permite descontos ou
   * extras). Se for null, vale o preço do serviço.
   */
  valorCentimos: number | null;
};

export const nomesTipoSalao: Record<TipoSalao, string> = {
  barbearia: "Barbearia",
  estetica: "Estética",
  cabeleireiro: "Cabeleireiro",
  unhas: "Unhas",
  outro: "Salão",
};

export const nomesEstadoMarcacao: Record<EstadoMarcacao, string> = {
  marcada: "Marcada",
  concluida: "Concluída",
  faltou: "Faltou",
  cancelada: "Cancelada",
};

export const nomesDiaSemana: Record<DiaSemana, string> = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
};

/** Ordem de apresentação: segunda a domingo. */
export const diasDaSemana: DiaSemana[] = [1, 2, 3, 4, 5, 6, 0];
