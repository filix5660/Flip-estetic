/** Validações partilhadas entre o browser e o servidor. */

export function normalizarTelefone(telefone: string): string {
  const limpo = telefone.replace(/[^\d+]/g, "");
  return limpo.startsWith("00") ? `+${limpo.slice(2)}` : limpo;
}

export function telefoneValido(telefone: string): boolean {
  const digitos = telefone.replace(/\D/g, "");
  return digitos.length >= 9 && digitos.length <= 15;
}

export function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function corValida(cor: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(cor);
}

/** "Barbearia São João" → "barbearia-sao-joao" */
export function criarSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export const SLUGS_RESERVADOS = new Set([
  "gestao",
  "api",
  "entrar",
  "registar",
  "planos",
  "admin",
  "_next",
]);

export function slugValido(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$/.test(slug) && !SLUGS_RESERVADOS.has(slug);
}
