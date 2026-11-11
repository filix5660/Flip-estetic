import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  protegerCookie,
  SUPABASE_CHAVE_PUBLICA,
  SUPABASE_URL,
  supabaseConfigurado,
} from "./config";

const ROTAS_PRIVADAS = ["/gestao", "/comecar"];
const ROTAS_DE_ENTRADA = ["/entrar", "/criar-conta"];

function corresponde(caminho: string, rotas: string[]) {
  return rotas.some((rota) => caminho === rota || caminho.startsWith(`${rota}/`));
}

/**
 * Renova a sessão (os tokens expiram) e faz a primeira barreira de acesso.
 * Não é a única: cada página e cada ação voltam a verificar a sessão, e a
 * base de dados aplica as regras RLS. O proxy só evita viagens inúteis.
 */
export async function atualizarSessao(request: NextRequest) {
  if (!supabaseConfigurado) return NextResponse.next({ request });

  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_CHAVE_PUBLICA, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesParaGuardar, cabecalhos) {
        cookiesParaGuardar.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        resposta = NextResponse.next({ request });
        cookiesParaGuardar.forEach(({ name, value, options }) =>
          resposta.cookies.set(name, value, protegerCookie(options)),
        );
        Object.entries(cabecalhos ?? {}).forEach(([chave, valor]) =>
          resposta.headers.set(chave, valor),
        );
      },
    },
  });

  // getClaims() valida a assinatura do token; não confiar em getSession().
  const { data } = await supabase.auth.getClaims();
  const autenticado = Boolean(data?.claims?.sub);
  const caminho = request.nextUrl.pathname;

  let destino: string | null = null;
  if (!autenticado && corresponde(caminho, ROTAS_PRIVADAS)) destino = "/entrar";
  if (autenticado && corresponde(caminho, ROTAS_DE_ENTRADA)) destino = "/gestao";

  if (destino) {
    const url = request.nextUrl.clone();
    url.pathname = destino;
    url.search = "";
    const redirecionamento = NextResponse.redirect(url);
    // Mantém os cookies renovados, senão a sessão perdia-se no caminho.
    resposta.cookies.getAll().forEach((cookie) =>
      redirecionamento.cookies.set(cookie),
    );
    return redirecionamento;
  }

  return resposta;
}
