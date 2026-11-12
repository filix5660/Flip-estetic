const euros = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

/** 1550 → "15,50 €" */
export function formatarEuros(centimos: number) {
  return euros.format(centimos / 100);
}

/** "15,5" ou "15.50" → 1550. Devolve null se não for um valor válido. */
export function eurosParaCentimos(texto: string) {
  const valor = Number(texto.replace(",", "."));
  if (!Number.isFinite(valor) || valor < 0) return null;
  return Math.round(valor * 100);
}

/** 1550 → "15.5" (para preencher campos <input type="number">) */
export function centimosParaCampo(centimos: number) {
  return String(centimos / 100);
}

/** 45 → "45 min", 90 → "1 h 30 min" */
export function formatarDuracao(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto} min`;
  if (resto === 0) return `${horas} h`;
  return `${horas} h ${resto} min`;
}
