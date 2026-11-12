// Converte linhas da base de dados (snake_case) no modelo da aplicação.
// As listas de colunas são explícitas: nunca se pede "*", para que uma
// coluna nova e sensível não passe para o navegador por engano.

import type {
  Bloqueio,
  Cliente,
  DiaSemana,
  EstadoMarcacao,
  HorarioSemanal,
  IdPlano,
  Marcacao,
  Profissional,
  Salao,
  Servico,
  TipoSalao,
} from "./modelo";

type Linha = Record<string, unknown>;

const texto = (valor: unknown) => (typeof valor === "string" ? valor : "");
const numero = (valor: unknown) => (typeof valor === "number" ? valor : 0);
/** "09:00:00" → "09:00" */
const hora = (valor: unknown) => texto(valor).slice(0, 5);

export const COLUNAS_SALAO =
  "id, slug, nome, tipo, apresentacao, morada, telefone, cor_principal, logotipo_url, plano, fuso_horario";

export function paraSalao(l: Linha): Salao {
  return {
    id: texto(l.id),
    slug: texto(l.slug),
    nome: texto(l.nome),
    tipo: texto(l.tipo) as TipoSalao,
    apresentacao: texto(l.apresentacao),
    morada: texto(l.morada),
    telefone: texto(l.telefone),
    corPrincipal: /^#[0-9a-fA-F]{6}$/.test(texto(l.cor_principal))
      ? texto(l.cor_principal)
      : "#29251f",
    logotipoUrl: typeof l.logotipo_url === "string" ? l.logotipo_url : null,
    plano: texto(l.plano) as IdPlano,
    fusoHorario: texto(l.fuso_horario) || "Europe/Lisbon",
  };
}

export const COLUNAS_SERVICO =
  "id, salao_id, nome, duracao_minutos, preco_centimos, ativo";

export function paraServico(l: Linha): Servico {
  return {
    id: texto(l.id),
    salaoId: texto(l.salao_id),
    nome: texto(l.nome),
    duracaoMinutos: numero(l.duracao_minutos),
    precoCentimos: numero(l.preco_centimos),
    ativo: l.ativo === true,
  };
}

export const COLUNAS_PROFISSIONAL = "id, salao_id, nome, ativo";

export function paraProfissional(l: Linha): Profissional {
  return {
    id: texto(l.id),
    salaoId: texto(l.salao_id),
    nome: texto(l.nome),
    ativo: l.ativo === true,
  };
}

export const COLUNAS_HORARIO = "salao_id, dia_semana, aberto, abertura, fecho";

export function paraHorario(l: Linha): HorarioSemanal {
  return {
    salaoId: texto(l.salao_id),
    diaSemana: numero(l.dia_semana) as DiaSemana,
    aberto: l.aberto === true,
    abertura: hora(l.abertura),
    fecho: hora(l.fecho),
  };
}

export const COLUNAS_BLOQUEIO =
  "id, salao_id, profissional_id, data, inicio, fim, motivo";

export function paraBloqueio(l: Linha): Bloqueio {
  return {
    id: texto(l.id),
    salaoId: texto(l.salao_id),
    profissionalId:
      typeof l.profissional_id === "string" ? l.profissional_id : null,
    data: texto(l.data),
    inicio: hora(l.inicio),
    fim: hora(l.fim),
    motivo: texto(l.motivo),
  };
}

export const COLUNAS_CLIENTE = "id, salao_id, nome, contacto";

export function paraCliente(l: Linha): Cliente {
  return {
    id: texto(l.id),
    salaoId: texto(l.salao_id),
    nome: texto(l.nome),
    contacto: texto(l.contacto),
  };
}

export const COLUNAS_MARCACAO =
  "id, salao_id, profissional_id, servico_id, cliente_id, data, inicio, fim, estado, valor_centimos";

export function paraMarcacao(l: Linha): Marcacao {
  return {
    id: texto(l.id),
    salaoId: texto(l.salao_id),
    profissionalId: texto(l.profissional_id),
    servicoId: texto(l.servico_id),
    clienteId: texto(l.cliente_id),
    data: texto(l.data),
    inicio: hora(l.inicio),
    fim: hora(l.fim),
    estado: texto(l.estado) as EstadoMarcacao,
    valorCentimos: typeof l.valor_centimos === "number" ? l.valor_centimos : null,
  };
}
