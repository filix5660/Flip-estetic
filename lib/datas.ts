import type { Data, DiaSemana, Hora } from "./modelo";

/** Data de hoje ("AAAA-MM-DD") no fuso indicado. */
export function hojeNoFuso(fusoHorario: string, agora = new Date()): Data {
  // en-CA formata como AAAA-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: fusoHorario,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

/** Hora atual ("HH:MM") no fuso indicado. */
export function horaAtualNoFuso(fusoHorario: string, agora = new Date()): Hora {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: fusoHorario,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(agora);
}

// As funções seguintes tratam a data como "data de calendário", sem fuso:
// usam o meio-dia UTC para nunca mudarem de dia por causa do horário de verão.

function paraDateUTC(data: Data) {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia, 12));
}

function deDateUTC(date: Date): Data {
  return date.toISOString().slice(0, 10);
}

export function somarDias(data: Data, dias: number): Data {
  const date = paraDateUTC(data);
  date.setUTCDate(date.getUTCDate() + dias);
  return deDateUTC(date);
}

export function diaDaSemana(data: Data): DiaSemana {
  return paraDateUTC(data).getUTCDay() as DiaSemana;
}

/** Para componentes de calendário (react-day-picker), que usam Date local. */
export function paraDateLocal(data: Data) {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(ano, mes - 1, dia, 12);
}

export function deDateLocal(date: Date): Data {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

/** "quarta-feira, 11 de novembro" */
export function formatarDataLonga(data: Data) {
  return paraDateUTC(data).toLocaleDateString("pt-PT", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** "11 de novembro" */
export function formatarDataCurta(data: Data) {
  return paraDateUTC(data).toLocaleDateString("pt-PT", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
  });
}

/** "11/11/2026" */
export function formatarDataNumerica(data: Data) {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function horaEmMinutos(hora: Hora) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

export function minutosEmHora(minutos: number): Hora {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function somarMinutos(hora: Hora, minutos: number): Hora {
  return minutosEmHora(horaEmMinutos(hora) + minutos);
}
