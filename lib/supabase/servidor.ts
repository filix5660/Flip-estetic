import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  protegerCookie,
  SUPABASE_CHAVE_PUBLICA,
  SUPABASE_URL,
} from "./config";

/**
 * Cliente com a sessão de quem fez o pedido (lida dos cookies).
 * A base de dados aplica as regras RLS a esse utilizador.
 */
export async function criarClienteSessao() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_CHAVE_PUBLICA, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesParaGuardar) {
        try {
          cookiesParaGuardar.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, protegerCookie(options)),
          );
        } catch {
          // Em Server Components não se podem escrever cookies.
          // O proxy trata de renovar a sessão, por isso pode ignorar-se.
        }
      },
    },
  });
}

/**
 * Cliente sem sessão, para as páginas públicas (página de marcação).
 * Nunca lê cookies: tem sempre e só as permissões de um visitante.
 */
export function criarClientePublico() {
  return createClient(SUPABASE_URL, SUPABASE_CHAVE_PUBLICA, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
