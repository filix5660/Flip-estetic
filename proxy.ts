import type { NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return atualizarSessao(request);
}

// Só corre onde a sessão interessa. As páginas públicas de marcação não
// usam sessão, por isso ficam de fora (mais rápidas e sem cookies).
export const config = {
  matcher: ["/gestao/:path*", "/comecar", "/entrar", "/criar-conta"],
};
