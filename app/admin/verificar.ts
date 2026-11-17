import "server-only";

import { notFound, redirect } from "next/navigation";
import { obterUtilizador } from "@/lib/sessao";
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

  const supabase = await criarClienteSessao();
  const { data, error } = await supabase.rpc("sou_admin");
  if (error) {
    console.error("[admin] sou_admin:", error.code, error.message);
    notFound();
  }
  if (data !== true) notFound();

  return supabase;
}
