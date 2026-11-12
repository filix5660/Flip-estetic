import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { criarClienteSessao } from "@/lib/supabase/servidor";

// Destino do link enviado por email ao criar conta.
// Os destinos finais são fixos: não se aceita nenhum "redirect" vindo do
// endereço, para o link nunca poder ser usado para enviar alguém a outro site.

const TIPOS_ACEITES = ["email", "signup"] as const;
type TipoAceite = (typeof TIPOS_ACEITES)[number];

export async function GET(request: NextRequest) {
  const parametros = request.nextUrl.searchParams;
  const falhou = new URL("/entrar?erro=confirmacao", request.url);

  if (!supabaseConfigurado) return NextResponse.redirect(falhou);

  const supabase = await criarClienteSessao();
  const tokenHash = parametros.get("token_hash");
  const tipo = parametros.get("type");
  const codigo = parametros.get("code");

  let confirmado = false;

  if (tokenHash && TIPOS_ACEITES.includes(tipo as TipoAceite)) {
    const { error } = await supabase.auth.verifyOtp({
      type: tipo as TipoAceite,
      token_hash: tokenHash,
    });
    confirmado = !error;
  } else if (codigo) {
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    confirmado = !error;
  }

  return NextResponse.redirect(
    confirmado ? new URL("/gestao", request.url) : falhou,
  );
}
