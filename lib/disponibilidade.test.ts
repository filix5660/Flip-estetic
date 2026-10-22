// Testes do cálculo de vagas. Correr com: npm test
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calcularVagas,
  linhaDoTempo,
  subtrairIntervalos,
  validarIntervalos,
  type EntradaVagas,
} from "./disponibilidade";
import { diaDaSemana, horaParaMin, minParaHora, somarDias } from "./tempo";
import type { HorarioSemanal, RegrasMarcacao } from "./tipos";

const h = horaParaMin;
const horas = (vagas: number[]) => vagas.map(minParaHora);

const SEGUNDA = "2026-10-19";
const regras: RegrasMarcacao = {
  modoVagas: "duracao_servico",
  intervaloFixoMin: 30,
  folgaEntreMarcacoesMin: 0,
  antecedenciaMinimaMin: 0,
  janelaMarcacaoDias: 60,
};

const semanaComPausa: HorarioSemanal[] = [
  {
    profissionalId: "p",
    diaSemana: 1,
    intervalos: [
      { inicioMin: h("09:00"), fimMin: h("12:00") },
      { inicioMin: h("13:00"), fimMin: h("15:00") },
    ],
  },
];

function entrada(parcial: Partial<EntradaVagas> = {}): EntradaVagas {
  return {
    data: SEGUNDA,
    duracaoMin: 60,
    regras,
    horarioSemanal: semanaComPausa,
    diasEspeciais: [],
    bloqueios: [],
    marcacoes: [],
    agora: { data: "2026-10-18", minutos: h("10:00") },
    ...parcial,
  };
}

describe("tempo", () => {
  it("dia da semana", () => {
    assert.equal(diaDaSemana(SEGUNDA), 1);
    assert.equal(diaDaSemana("2026-10-25"), 0);
    assert.equal(somarDias("2026-12-31", 1), "2027-01-01");
  });
});

describe("intervalos", () => {
  it("subtrai ocupado do horário", () => {
    const livre = subtrairIntervalos(
      [{ inicioMin: 0, fimMin: 100 }],
      [{ inicioMin: 20, fimMin: 30 }, { inicioMin: 25, fimMin: 50 }, { inicioMin: 90, fimMin: 120 }],
    );
    assert.deepEqual(livre, [
      { inicioMin: 0, fimMin: 20 },
      { inicioMin: 50, fimMin: 90 },
    ]);
  });

  it("valida períodos", () => {
    assert.equal(validarIntervalos([{ inicioMin: 600, fimMin: 540 }]) !== null, true);
    assert.equal(
      validarIntervalos([
        { inicioMin: 540, fimMin: 720 },
        { inicioMin: 700, fimMin: 800 },
      ]) !== null,
      true,
    );
    assert.equal(validarIntervalos([{ inicioMin: 540, fimMin: 720 }]), null);
  });
});

describe("vagas pela duração do serviço", () => {
  it("segue a duração e respeita a pausa", () => {
    assert.deepEqual(horas(calcularVagas(entrada())), ["09:00", "10:00", "11:00", "13:00", "14:00"]);
  });

  it("serviço de 45 min", () => {
    assert.deepEqual(horas(calcularVagas(entrada({ duracaoMin: 45 }))), [
      "09:00", "09:45", "10:30", "11:15", "13:00", "13:45",
    ]);
  });

  it("recomeça logo a seguir a uma marcação", () => {
    const vagas = calcularVagas(
      entrada({
        duracaoMin: 30,
        marcacoes: [{ data: SEGUNDA, inicioMin: h("09:00"), fimMin: h("09:20"), estado: "confirmada" }],
      }),
    );
    assert.deepEqual(horas(vagas).slice(0, 3), ["09:20", "09:50", "10:20"]);
  });

  it("ignora marcações canceladas", () => {
    const vagas = calcularVagas(
      entrada({
        marcacoes: [{ data: SEGUNDA, inicioMin: h("09:00"), fimMin: h("10:00"), estado: "cancelada" }],
      }),
    );
    assert.equal(vagas[0], h("09:00"));
  });

  it("aplica folga entre marcações", () => {
    const vagas = calcularVagas(
      entrada({
        duracaoMin: 30,
        regras: { ...regras, folgaEntreMarcacoesMin: 10 },
        marcacoes: [{ data: SEGUNDA, inicioMin: h("10:00"), fimMin: h("10:30"), estado: "confirmada" }],
      }),
    );
    // 09:00 e 09:30 não cabem (09:30–10:00 fica a 0 min da marcação).
    assert.deepEqual(horas(vagas).slice(0, 3), ["09:00", "10:40", "11:10"]);
  });
});

describe("vagas em intervalos fixos", () => {
  const fixo = { ...regras, modoVagas: "intervalo_fixo" as const, intervaloFixoMin: 30 };

  it("usa a grelha mesmo com serviços longos", () => {
    const vagas = calcularVagas(entrada({ regras: fixo, duracaoMin: 45 }));
    assert.deepEqual(horas(vagas), [
      "09:00", "09:30", "10:00", "10:30", "11:00", "13:00", "13:30", "14:00",
    ]);
  });

  it("salta inícios ocupados mas mantém a grelha", () => {
    const vagas = calcularVagas(
      entrada({
        regras: fixo,
        duracaoMin: 30,
        marcacoes: [{ data: SEGUNDA, inicioMin: h("09:00"), fimMin: h("09:45"), estado: "confirmada" }],
      }),
    );
    assert.deepEqual(horas(vagas).slice(0, 2), ["10:00", "10:30"]);
  });
});

describe("limites do cliente", () => {
  it("antecedência mínima no próprio dia", () => {
    const vagas = calcularVagas(
      entrada({
        regras: { ...regras, antecedenciaMinimaMin: 60 },
        agora: { data: SEGUNDA, minutos: h("09:30") },
      }),
    );
    assert.deepEqual(horas(vagas), ["11:00", "13:00", "14:00"]);
  });

  it("antecedência que passa para o dia seguinte", () => {
    const vagas = calcularVagas(
      entrada({
        regras: { ...regras, antecedenciaMinimaMin: 24 * 60 },
        agora: { data: "2026-10-18", minutos: h("13:30") },
      }),
    );
    assert.deepEqual(horas(vagas), ["14:00"]);
  });

  it("sem vagas no passado nem fora da janela", () => {
    assert.deepEqual(calcularVagas(entrada({ agora: { data: "2026-10-20", minutos: 0 } })), []);
    assert.deepEqual(
      calcularVagas(entrada({ regras: { ...regras, janelaMarcacaoDias: 0 } })),
      [],
    );
  });
});

describe("dias especiais e bloqueios", () => {
  it("folga substitui o horário semanal", () => {
    const vagas = calcularVagas(
      entrada({
        diasEspeciais: [
          { id: "1", profissionalId: "p", dataInicio: SEGUNDA, dataFim: SEGUNDA, intervalos: [], motivo: "" },
        ],
      }),
    );
    assert.deepEqual(vagas, []);
  });

  it("horário especial num domingo", () => {
    const vagas = calcularVagas(
      entrada({
        data: "2026-10-25",
        diasEspeciais: [
          {
            id: "1",
            profissionalId: "p",
            dataInicio: "2026-10-25",
            dataFim: "2026-10-25",
            intervalos: [{ inicioMin: h("10:00"), fimMin: h("12:00") }],
            motivo: "",
          },
        ],
      }),
    );
    assert.deepEqual(horas(vagas), ["10:00", "11:00"]);
  });

  it("bloqueio tira só aquelas horas", () => {
    const vagas = calcularVagas(
      entrada({ bloqueios: [{ data: SEGUNDA, inicioMin: h("10:00"), fimMin: h("11:00") }] }),
    );
    assert.deepEqual(horas(vagas), ["09:00", "11:00", "13:00", "14:00"]);
  });
});

describe("linha do tempo", () => {
  it("mostra marcações, livres e pausa", () => {
    const itens = linhaDoTempo(
      semanaComPausa[0].intervalos,
      [{ id: "m", inicioMin: h("09:00"), fimMin: h("10:00"), estado: "confirmada" }],
      [],
    );
    assert.deepEqual(
      itens.map((i) => `${i.tipo} ${minParaHora(i.inicioMin)}`),
      ["marcacao 09:00", "livre 10:00", "pausa 12:00", "livre 13:00"],
    );
  });
});
