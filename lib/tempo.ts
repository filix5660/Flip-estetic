/**
 * Utilitários de datas e horas.
 *
 * Convenções usadas em todo o projeto (e na base de dados):
 * - Datas de calendário são strings ISO "YYYY-MM-DD" (`DataISO`), sempre no
 *   fuso horário do negócio. Nunca usamos `Date` para representar um dia,
 *   para evitar saltos de fuso horário.
 * - Horas do dia são minutos desde a meia-noite (ex.: 9h30 = 570).
 */

export type DataISO = string;

const MS_POR_DIA = 86_400_000;

export function horaParaMin(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function minParaHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function partesParaIso(ano: number, mes: number, dia: number): DataISO {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export function isoParaPartes(data: DataISO) {
  const [ano, mes, dia] = data.split("-").map(Number);
  return { ano, mes, dia };
}

/** Número de dias desde 1970-01-01 (útil para comparar e somar datas). */
export function diaAbsoluto(data: DataISO): number {
  const { ano, mes, dia } = isoParaPartes(data);
  return Math.floor(Date.UTC(ano, mes - 1, dia) / MS_POR_DIA);
}

export function deDiaAbsoluto(n: number): DataISO {
  const d = new Date(n * MS_POR_DIA);
  return partesParaIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function somarDias(data: DataISO, dias: number): DataISO {
  return deDiaAbsoluto(diaAbsoluto(data) + dias);
}

export function diasEntre(de: DataISO, ate: DataISO): number {
  return diaAbsoluto(ate) - diaAbsoluto(de);
}

/** 0 = domingo, 1 = segunda … 6 = sábado. */
export function diaDaSemana(data: DataISO): number {
  return (diaAbsoluto(data) + 4) % 7; // 1970-01-01 foi uma quinta-feira
}

export function diasNoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

export function ehDataValida(data: string): data is DataISO {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const { ano, mes, dia } = isoParaPartes(data);
  return mes >= 1 && mes <= 12 && dia >= 1 && dia <= diasNoMes(ano, mes);
}

export function ehHoraValida(hora: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(hora)) return false;
  const [h, m] = hora.split(":").map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

/** Data e hora atuais no fuso horário indicado (ex.: "Europe/Lisbon"). */
export function agoraNoFuso(fusoHorario: string, agora = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: fusoHorario,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(agora);

  const valor = (tipo: string) =>
    Number(partes.find((p) => p.type === tipo)?.value ?? 0);

  return {
    data: partesParaIso(valor("year"), valor("month"), valor("day")),
    minutos: valor("hour") * 60 + valor("minute"),
  };
}

/** Soma (ou subtrai) meses a um par ano/mês. */
export function mesSeguinte(ano: number, mes: number, delta: number) {
  const total = ano * 12 + (mes - 1) + delta;
  return { ano: Math.floor(total / 12), mes: (total % 12) + 1 };
}
