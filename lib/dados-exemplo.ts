// Dados de exemplo enquanto não há base de dados.
// Dois salões de tipos diferentes para garantir que nada fica preso a
// "barbearia". As marcações são geradas à volta da data de hoje, para a
// demonstração parecer sempre atual.

import { diaDaSemana, horaEmMinutos, somarDias, somarMinutos } from "./datas";
import type {
  Bloqueio,
  Cliente,
  Data,
  HorarioSemanal,
  Hora,
  Marcacao,
  Profissional,
  Salao,
  Servico,
} from "./modelo";

export const saloes: Salao[] = [
  {
    id: "salao-bc",
    slug: "barbearia-central",
    nome: "Barbearia Central",
    tipo: "barbearia",
    apresentacao: "Cortes com estilo, feitos com cuidado.",
    morada: "Rua das Flores, 24 · Lisboa",
    telefone: "+351 912 345 678",
    corPrincipal: "#29251f",
    logotipoUrl: null,
    plano: "essencial",
    fusoHorario: "Europe/Lisbon",
  },
  {
    id: "salao-eb",
    slug: "estudio-bela",
    nome: "Estúdio Bela",
    tipo: "estetica",
    apresentacao: "Unhas, pele e sobrancelhas com atenção ao detalhe.",
    morada: "Avenida da Boavista, 310 · Porto",
    telefone: "+351 934 567 890",
    corPrincipal: "#8a4f63",
    logotipoUrl: null,
    plano: "demo",
    fusoHorario: "Europe/Lisbon",
  },
];

export const profissionais: Profissional[] = [
  { id: "prof-bc-1", salaoId: "salao-bc", nome: "Tiago", ativo: true },
  { id: "prof-bc-2", salaoId: "salao-bc", nome: "André", ativo: true },
  { id: "prof-eb-1", salaoId: "salao-eb", nome: "Marta", ativo: true },
];

export const servicos: Servico[] = [
  { id: "serv-bc-1", salaoId: "salao-bc", nome: "Corte de cabelo", duracaoMinutos: 30, precoCentimos: 1500, ativo: true },
  { id: "serv-bc-2", salaoId: "salao-bc", nome: "Barba", duracaoMinutos: 20, precoCentimos: 1000, ativo: true },
  { id: "serv-bc-3", salaoId: "salao-bc", nome: "Corte + barba", duracaoMinutos: 45, precoCentimos: 2200, ativo: true },
  { id: "serv-eb-1", salaoId: "salao-eb", nome: "Manicure", duracaoMinutos: 45, precoCentimos: 1500, ativo: true },
  { id: "serv-eb-2", salaoId: "salao-eb", nome: "Pedicure", duracaoMinutos: 60, precoCentimos: 2000, ativo: true },
  { id: "serv-eb-3", salaoId: "salao-eb", nome: "Limpeza de pele", duracaoMinutos: 60, precoCentimos: 3500, ativo: true },
  { id: "serv-eb-4", salaoId: "salao-eb", nome: "Design de sobrancelhas", duracaoMinutos: 30, precoCentimos: 1200, ativo: true },
];

function semana(
  salaoId: string,
  aberto: Record<number, [Hora, Hora] | null>,
): HorarioSemanal[] {
  return ([0, 1, 2, 3, 4, 5, 6] as const).map((diaSemana) => {
    const horas = aberto[diaSemana];
    return {
      salaoId,
      diaSemana,
      aberto: horas !== null,
      abertura: horas?.[0] ?? "09:00",
      fecho: horas?.[1] ?? "18:00",
    };
  });
}

export const horariosSemanais: HorarioSemanal[] = [
  ...semana("salao-bc", {
    0: null,
    1: ["09:00", "18:00"],
    2: ["09:00", "18:00"],
    3: ["09:00", "18:00"],
    4: ["09:00", "18:00"],
    5: ["09:00", "18:00"],
    6: ["09:00", "14:00"],
  }),
  ...semana("salao-eb", {
    0: null,
    1: null,
    2: ["10:00", "19:00"],
    3: ["10:00", "19:00"],
    4: ["10:00", "19:00"],
    5: ["10:00", "19:00"],
    6: ["10:00", "16:00"],
  }),
];

export const bloqueios: Bloqueio[] = [];

function clientesDe(salaoId: string, prefixo: string, nomes: string[]): Cliente[] {
  return nomes.map((nome, indice) => ({
    id: `cli-${prefixo}-${indice + 1}`,
    salaoId,
    nome,
    contacto: `+351 91${indice} 000 ${String(100 + indice)}`,
  }));
}

export const clientes: Cliente[] = [
  ...clientesDe("salao-bc", "bc", ["João", "Rui", "Miguel", "Pedro", "Nuno", "Ricardo", "Bruno", "Diogo"]),
  ...clientesDe("salao-eb", "eb", ["Ana", "Inês", "Beatriz", "Sofia", "Carolina", "Mariana"]),
];

// Padrões de um dia: [hora, profissional, serviço, cliente] (índices).
type Entrada = [Hora, number, number, number];

const padroes: Record<string, Entrada[][]> = {
  "salao-bc": [
    [["09:00", 0, 0, 0], ["09:30", 1, 1, 1], ["10:00", 0, 2, 2], ["11:30", 1, 0, 3], ["14:00", 0, 0, 4], ["15:30", 1, 2, 5]],
    [["09:30", 0, 2, 6], ["10:00", 1, 0, 7], ["11:00", 0, 1, 0], ["14:30", 1, 0, 1], ["16:00", 0, 0, 2]],
    [["10:00", 0, 0, 3], ["10:30", 1, 2, 4], ["12:00", 0, 1, 5], ["15:00", 1, 0, 6], ["17:00", 0, 2, 7]],
  ],
  "salao-eb": [
    [["10:00", 0, 0, 0], ["11:00", 0, 3, 1], ["14:00", 0, 2, 2], ["16:00", 0, 1, 3]],
    [["10:30", 0, 1, 4], ["14:30", 0, 0, 5], ["15:30", 0, 3, 0]],
    [["11:00", 0, 2, 1], ["15:00", 0, 0, 2], ["17:00", 0, 3, 3]],
  ],
};

/**
 * Gera as marcações de exemplo de um salão entre `hoje - 7` e `hoje + 7`.
 * Dias passados ficam concluídos (com uma falta e um desconto para variar);
 * hoje, fica concluído o que já terminou.
 */
export function gerarMarcacoesExemplo(
  salaoId: string,
  hoje: Data,
  horaAtual: Hora,
): Marcacao[] {
  const profs = profissionais.filter((p) => p.salaoId === salaoId);
  const servs = servicos.filter((s) => s.salaoId === salaoId);
  const clis = clientes.filter((c) => c.salaoId === salaoId);
  const horarios = horariosSemanais.filter((h) => h.salaoId === salaoId);
  const padroesSalao = padroes[salaoId] ?? [];
  const marcacoes: Marcacao[] = [];

  for (let deslocamento = -7; deslocamento <= 7; deslocamento++) {
    const data = somarDias(hoje, deslocamento);
    const horario = horarios.find((h) => h.diaSemana === diaDaSemana(data));
    if (!horario?.aberto || padroesSalao.length === 0) continue;

    const padrao = padroesSalao[(deslocamento + 21) % padroesSalao.length];

    padrao.forEach(([inicio, iProf, iServ, iCli], indice) => {
      const servico = servs[iServ];
      const fim = somarMinutos(inicio, servico.duracaoMinutos);
      if (horaEmMinutos(fim) > horaEmMinutos(horario.fecho)) return;

      let estado: Marcacao["estado"] = "marcada";
      let valorCentimos: number | null = null;

      if (deslocamento < 0) {
        estado = deslocamento === -2 && indice === 1 ? "faltou" : "concluida";
        if (deslocamento === -1 && indice === 0) {
          valorCentimos = servico.precoCentimos - 200; // desconto
        }
      } else if (deslocamento === 0 && fim <= horaAtual) {
        estado = "concluida";
      }

      marcacoes.push({
        id: `${salaoId}-${data}-${indice}`,
        salaoId,
        profissionalId: profs[iProf].id,
        servicoId: servico.id,
        clienteId: clis[iCli].id,
        data,
        inicio,
        fim,
        estado,
        valorCentimos,
      });
    });
  }

  return marcacoes;
}
