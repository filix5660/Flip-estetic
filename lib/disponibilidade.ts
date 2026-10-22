/**
 * Cálculo de horários livres — funções puras, sem acesso a dados.
 *
 * Fluxo para um profissional numa data:
 *   1. Períodos de trabalho = dia especial (se existir) ou horário semanal.
 *   2. Ocupado = marcações ativas (+ folga entre marcações) + bloqueios.
 *   3. Livre = períodos de trabalho − ocupado.
 *   4. Vagas = inícios onde o serviço cabe inteiro num espaço livre,
 *      seguindo o modo escolhido pelo proprietário, e respeitando a
 *      antecedência mínima e a janela de marcação.
 *
 * Como não depende de nada externo, corre igual no servidor e no browser
 * e é fácil de testar (ver `lib/disponibilidade.test.ts`).
 */

import type {
  Bloqueio,
  DiaEspecial,
  HorarioSemanal,
  Intervalo,
  Marcacao,
  RegrasMarcacao,
} from "./tipos";
import { diaAbsoluto, diaDaSemana, type DataISO } from "./tempo";

export const ESTADOS_QUE_OCUPAM: Marcacao["estado"][] = [
  "confirmada",
  "concluida",
  "falta",
];

export function ordenarIntervalos(intervalos: Intervalo[]): Intervalo[] {
  return [...intervalos].sort((a, b) => a.inicioMin - b.inicioMin);
}

/** Junta intervalos sobrepostos ou encostados. */
export function unirIntervalos(intervalos: Intervalo[]): Intervalo[] {
  const resultado: Intervalo[] = [];
  for (const atual of ordenarIntervalos(intervalos)) {
    const ultimo = resultado[resultado.length - 1];
    if (ultimo && atual.inicioMin <= ultimo.fimMin) {
      ultimo.fimMin = Math.max(ultimo.fimMin, atual.fimMin);
    } else {
      resultado.push({ ...atual });
    }
  }
  return resultado;
}

/** base − remover */
export function subtrairIntervalos(
  base: Intervalo[],
  remover: Intervalo[],
): Intervalo[] {
  const cortes = unirIntervalos(remover);
  const resultado: Intervalo[] = [];

  for (const periodo of unirIntervalos(base)) {
    let inicio = periodo.inicioMin;
    for (const corte of cortes) {
      if (corte.fimMin <= inicio) continue;
      if (corte.inicioMin >= periodo.fimMin) break;
      if (corte.inicioMin > inicio) {
        resultado.push({ inicioMin: inicio, fimMin: corte.inicioMin });
      }
      inicio = Math.max(inicio, corte.fimMin);
    }
    if (inicio < periodo.fimMin) {
      resultado.push({ inicioMin: inicio, fimMin: periodo.fimMin });
    }
  }
  return resultado;
}

export function intervalosSobrepoem(a: Intervalo, b: Intervalo): boolean {
  return a.inicioMin < b.fimMin && b.inicioMin < a.fimMin;
}

/** Valida uma lista de períodos introduzida pelo proprietário. */
export function validarIntervalos(intervalos: Intervalo[]): string | null {
  const ordenados = ordenarIntervalos(intervalos);
  for (let i = 0; i < ordenados.length; i++) {
    const atual = ordenados[i];
    if (atual.fimMin <= atual.inicioMin) {
      return "Em cada período, a hora de fim tem de ser depois da hora de início.";
    }
    if (atual.inicioMin < 0 || atual.fimMin > 24 * 60) {
      return "Os períodos têm de estar dentro do mesmo dia.";
    }
    const seguinte = ordenados[i + 1];
    if (seguinte && seguinte.inicioMin < atual.fimMin) {
      return "Há períodos sobrepostos no mesmo dia.";
    }
  }
  return null;
}

export interface PeriodosDoDia {
  intervalos: Intervalo[];
  origem: "semanal" | "especial";
  diaEspecial?: DiaEspecial;
}

/** Períodos em que o profissional trabalha numa data concreta. */
export function periodosDeTrabalho(
  data: DataISO,
  horarioSemanal: HorarioSemanal[],
  diasEspeciais: DiaEspecial[],
): PeriodosDoDia {
  // Se houver vários dias especiais a cobrir a data, vale o último criado.
  const especial = [...diasEspeciais]
    .reverse()
    .find((d) => d.dataInicio <= data && data <= d.dataFim);

  if (especial) {
    return {
      intervalos: ordenarIntervalos(especial.intervalos),
      origem: "especial",
      diaEspecial: especial,
    };
  }

  const semanal = horarioSemanal.find((h) => h.diaSemana === diaDaSemana(data));
  return {
    intervalos: ordenarIntervalos(semanal?.intervalos ?? []),
    origem: "semanal",
  };
}

/** Intervalos ocupados por marcações (com folga) e bloqueios. */
export function intervalosOcupados(
  marcacoes: Pick<Marcacao, "inicioMin" | "fimMin" | "estado">[],
  bloqueios: Pick<Bloqueio, "inicioMin" | "fimMin">[],
  folgaEntreMarcacoesMin = 0,
): Intervalo[] {
  return [
    ...marcacoes
      .filter((m) => ESTADOS_QUE_OCUPAM.includes(m.estado))
      .map((m) => ({
        inicioMin: m.inicioMin - folgaEntreMarcacoesMin,
        fimMin: m.fimMin + folgaEntreMarcacoesMin,
      })),
    ...bloqueios.map((b) => ({ inicioMin: b.inicioMin, fimMin: b.fimMin })),
  ];
}

export interface EntradaVagas {
  data: DataISO;
  duracaoMin: number;
  regras: RegrasMarcacao;
  horarioSemanal: HorarioSemanal[];
  diasEspeciais: DiaEspecial[];
  bloqueios: Pick<Bloqueio, "data" | "inicioMin" | "fimMin">[];
  marcacoes: Pick<Marcacao, "data" | "inicioMin" | "fimMin" | "estado">[];
  agora: { data: DataISO; minutos: number };
  /** Marcações feitas pelo proprietário ignoram antecedência e janela. */
  ignorarLimitesDoCliente?: boolean;
}

/** Devolve os minutos de início das vagas disponíveis, por ordem. */
export function calcularVagas(entrada: EntradaVagas): number[] {
  const { data, duracaoMin, regras, agora } = entrada;
  if (duracaoMin <= 0) return [];

  const diasAteData = diaAbsoluto(data) - diaAbsoluto(agora.data);
  if (diasAteData < 0) return [];
  if (!entrada.ignorarLimitesDoCliente && diasAteData > regras.janelaMarcacaoDias) {
    return [];
  }

  // Primeiro minuto (absoluto) em que se pode começar.
  const antecedencia = entrada.ignorarLimitesDoCliente
    ? 0
    : regras.antecedenciaMinimaMin;
  const limite = agora.minutos + antecedencia - diasAteData * 24 * 60;

  const { intervalos: trabalho } = periodosDeTrabalho(
    data,
    entrada.horarioSemanal,
    entrada.diasEspeciais,
  );
  if (trabalho.length === 0) return [];

  const ocupado = intervalosOcupados(
    entrada.marcacoes.filter((m) => m.data === data),
    entrada.bloqueios.filter((b) => b.data === data),
    regras.folgaEntreMarcacoesMin,
  );
  const livre = subtrairIntervalos(trabalho, ocupado);

  const vagas = new Set<number>();
  const cabe = (inicio: number) =>
    inicio >= limite &&
    livre.some((l) => l.inicioMin <= inicio && inicio + duracaoMin <= l.fimMin);

  if (regras.modoVagas === "intervalo_fixo") {
    // Grelha fixa, ancorada no início de cada período de trabalho.
    const passo = Math.max(5, regras.intervaloFixoMin);
    for (const periodo of trabalho) {
      for (let t = periodo.inicioMin; t + duracaoMin <= periodo.fimMin; t += passo) {
        if (cabe(t)) vagas.add(t);
      }
    }
  } else {
    // Vagas seguidas com a duração do serviço, a partir de cada espaço livre.
    for (const espaco of livre) {
      for (let t = espaco.inicioMin; t + duracaoMin <= espaco.fimMin; t += duracaoMin) {
        if (t >= limite) vagas.add(t);
      }
    }
  }

  return [...vagas].sort((a, b) => a - b);
}

export type ItemLinhaTempo =
  | { tipo: "marcacao"; inicioMin: number; fimMin: number; marcacaoId: string }
  | { tipo: "bloqueio"; inicioMin: number; fimMin: number; motivo: string }
  | { tipo: "livre"; inicioMin: number; fimMin: number }
  | { tipo: "pausa"; inicioMin: number; fimMin: number };

/** Constrói a vista do dia usada na agenda do proprietário. */
export function linhaDoTempo(
  periodos: Intervalo[],
  marcacoes: Pick<Marcacao, "id" | "inicioMin" | "fimMin" | "estado">[],
  bloqueios: Pick<Bloqueio, "inicioMin" | "fimMin" | "motivo">[],
): ItemLinhaTempo[] {
  const ativas = marcacoes.filter((m) => ESTADOS_QUE_OCUPAM.includes(m.estado));
  const itens: ItemLinhaTempo[] = [
    ...ativas.map((m) => ({
      tipo: "marcacao" as const,
      inicioMin: m.inicioMin,
      fimMin: m.fimMin,
      marcacaoId: m.id,
    })),
    ...bloqueios.map((b) => ({
      tipo: "bloqueio" as const,
      inicioMin: b.inicioMin,
      fimMin: b.fimMin,
      motivo: b.motivo,
    })),
  ];

  const ocupado = intervalosOcupados(ativas, bloqueios);
  for (const livre of subtrairIntervalos(periodos, ocupado)) {
    itens.push({ tipo: "livre", ...livre });
  }

  const ordenados = ordenarIntervalos(periodos);
  for (let i = 0; i < ordenados.length - 1; i++) {
    const pausa = {
      inicioMin: ordenados[i].fimMin,
      fimMin: ordenados[i + 1].inicioMin,
    };
    if (pausa.fimMin > pausa.inicioMin) {
      // Só mostra a pausa se não houver marcações lá dentro.
      const temMarcacao = ativas.some((m) => intervalosSobrepoem(m, pausa));
      if (!temMarcacao) itens.push({ tipo: "pausa", ...pausa });
    }
  }

  return itens.sort((a, b) => a.inicioMin - b.inicioMin || a.fimMin - b.fimMin);
}

export function totalMinutos(intervalos: Intervalo[]): number {
  return intervalos.reduce((soma, i) => soma + (i.fimMin - i.inicioMin), 0);
}
