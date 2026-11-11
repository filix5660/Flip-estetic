// Configuração do Supabase. Usado no servidor e no proxy.
//
// A aplicação usa APENAS a chave pública (publishable/anon), que respeita
// sempre as regras de segurança (RLS) da base de dados. A chave secreta
// (service_role / sb_secret_) ignora essas regras e nunca deve ser usada aqui.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_CHAVE_PUBLICA =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** Sem estas variáveis, a aplicação corre em modo de demonstração (dados de exemplo). */
export const supabaseConfigurado =
  SUPABASE_URL !== "" && SUPABASE_CHAVE_PUBLICA !== "";

/** Endereço público do site, usado nos links enviados por email. */
export const URL_DO_SITE = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

/** Papel de uma chave antiga (JWT): "anon" ou "service_role". Null se não for JWT. */
function papelDoJwt(chave: string) {
  const partes = chave.split(".");
  if (partes.length !== 3) return null;
  try {
    const dados = JSON.parse(
      atob(partes[1].replace(/-/g, "+").replace(/_/g, "/")),
    ) as { role?: string };
    return dados.role ?? null;
  } catch {
    return null;
  }
}

function eChaveSecreta(chave: string) {
  return chave.startsWith("sb_secret_") || papelDoJwt(chave) === "service_role";
}

function eChavePublica(chave: string) {
  return (
    (chave.startsWith("sb_publishable_") && chave.length > 20) ||
    papelDoJwt(chave) === "anon"
  );
}

if (supabaseConfigurado) {
  if (eChaveSecreta(SUPABASE_CHAVE_PUBLICA)) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY contém uma chave SECRETA. " +
        "Usa a chave pública (publishable/anon) e gera uma nova chave secreta no painel do Supabase.",
    );
  }
  // Recusa qualquer outro valor (por exemplo, uma palavra-passe colada por
  // engano) antes de ele ser enviado em pedidos ou chegar ao navegador.
  if (!eChavePublica(SUPABASE_CHAVE_PUBLICA)) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY não é uma chave pública do Supabase. " +
        "Copia a chave 'publishable' (começa por sb_publishable_) em Project Settings → API Keys.",
    );
  }
  if (
    process.env.NODE_ENV === "production" &&
    !SUPABASE_URL.startsWith("https://")
  ) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL tem de começar por https://.");
  }
}

type OpcoesCookie = Record<string, unknown>;

/**
 * Reforça os cookies de sessão: `httpOnly` impede que JavaScript no navegador
 * leia os tokens (protege contra roubo de sessão por XSS), `secure` só os
 * envia por HTTPS e `sameSite: lax` limita o envio a partir de outros sites.
 */
export function protegerCookie(opcoes: OpcoesCookie = {}) {
  return {
    ...opcoes,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}
