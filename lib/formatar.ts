import { isoParaPartes, minParaHora, type DataISO } from "./tempo";

const formatoPreco = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

export function formatarPreco(centimos: number): string {
  return formatoPreco.format(centimos / 100);
}

export function formatarDuracao(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function paraDataUTC(data: DataISO) {
  const { ano, mes, dia } = isoParaPartes(data);
  return new Date(Date.UTC(ano, mes - 1, dia, 12));
}

/** "Abc" — só a primeira letra em maiúscula. */
export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "Quinta-feira, 22 de outubro" */
export function formatarDataLonga(data: DataISO): string {
  return capitalizar(paraDataUTC(data).toLocaleDateString("pt-PT", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }));
}

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "22 out" */
export function formatarDataCurta(data: DataISO): string {
  const { mes, dia } = isoParaPartes(data);
  return `${dia} ${MESES_CURTOS[mes - 1]}`;
}

/** "22/10/2026" */
export function formatarDataNumerica(data: DataISO): string {
  const { ano, mes, dia } = isoParaPartes(data);
  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`;
}

export function formatarIntervalo(inicioMin: number, fimMin: number): string {
  return `${minParaHora(inicioMin)}–${minParaHora(fimMin)}`;
}

export function nomeDoMes(ano: number, mes: number): string {
  return capitalizar(new Date(Date.UTC(ano, mes - 1, 1, 12)).toLocaleDateString("pt-PT", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).replace(" de ", " "));
}

export function iniciais(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]!.toUpperCase())
    .join("");
}

/** Escolhe texto branco ou escuro conforme o contraste com a cor de fundo. */
export function corTextoSobre(hex: string): string {
  const limpo = hex.replace("#", "");
  if (limpo.length !== 6) return "#ffffff";
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(limpo.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminancia = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminancia > 0.45 ? "#1c1917" : "#ffffff";
}

export const NOMES_DIAS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

/** Ordem de apresentação: segunda primeiro. */
export const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];
