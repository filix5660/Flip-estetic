import "server-only";

import { notFound, redirect } from "next/navigation";
import { eAdmin, obterUtilizador } from "@/lib/sessao";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { criarClienteSessao } from "@/lib/supabase/servidor";

/**
 * Garante que quem pede é administrador da plataforma.
 * Sem sessão → /entrar. Com sessão mas sem ser administrador → 404, para
 * não revelar que o painel existe. A base de dados volta a confirmar em
 * cada função de administração.
 */
export async function exigirAdmin() {
  if (!supabaseConfigurado) notFound();
  if (!(await obterUtilizador())) redirect("/entrar");

  if (!(await eAdmin())) notFound();

  return criarClienteSessao();
}
