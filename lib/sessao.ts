import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { repo } from "./dados";
import type { Negocio } from "./tipos";

export const COOKIE_NEGOCIO_DEMO = "flip_negocio_demo";

/**
 * Devolve o negócio do utilizador com sessão iniciada.
 *
 * TODO(autenticação): por agora usa um cookie de demonstração para alternar
 * entre os negócios de exemplo. Quando houver login (ex.: Auth.js, Clerk ou
 * Supabase Auth), lê aqui o utilizador da sessão e devolve o negócio dele;
 * se não houver sessão, redireciona para /entrar.
 */
export async function obterNegocioAtual(): Promise<Negocio> {
  const id = (await cookies()).get(COOKIE_NEGOCIO_DEMO)?.value;
  const negocio = (id && (await repo.negocios.porId(id))) || (await repo.negocios.listar())[0];
  if (!negocio) redirect("/");
  return negocio;
}
