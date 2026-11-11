import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { saloes as saloesExemplo } from "./dados-exemplo";
import { COLUNAS_SALAO, paraSalao } from "./mapear";
import type { Salao } from "./modelo";
import { supabaseConfigurado } from "./supabase/config";
import { criarClienteSessao } from "./supabase/servidor";

const SLUG_SALAO_DEMONSTRACAO = "barbearia-central";

/**
 * Utilizador com sessão iniciada, ou null.
 * Usa getClaims(), que valida a assinatura do token. Nunca confiar em
 * getSession() no servidor: lê os cookies sem os verificar.
 */
export const obterUtilizador = cache(async () => {
  if (!supabaseConfigurado) return null;

  const supabase = await criarClienteSessao();
  const { data, error } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (error || typeof id !== "string") return null;

  return { id };
});

/** Salão do utilizador com sessão, ou null se ainda não criou nenhum. */
export const obterSalaoOpcional = cache(async (): Promise<Salao | null> => {
  const utilizador = await obterUtilizador();
  if (!utilizador) return null;

  const supabase = await criarClienteSessao();
  const { data: membro, error: erroMembro } = await supabase
    .from("membros_salao")
    .select("salao_id")
    .eq("user_id", utilizador.id)
    .limit(1)
    .maybeSingle();
  if (erroMembro) {
    console.error("[sessao] membros_salao:", erroMembro.code, erroMembro.message);
    throw new Error("Não foi possível carregar o salão.");
  }
  if (!membro) return null;

  const { data, error } = await supabase
    .from("saloes")
    .select(COLUNAS_SALAO)
    .eq("id", membro.salao_id)
    .maybeSingle();
  if (error) {
    console.error("[sessao] saloes:", error.code, error.message);
    throw new Error("Não foi possível carregar o salão.");
  }

  return data ? paraSalao(data) : null;
});

/**
 * Salão de quem está a usar a área de gestão. Todas as páginas e ações da
 * gestão começam por aqui: sem sessão vai para /entrar, sem salão para
 * /comecar. O id do salão vem SEMPRE daqui, nunca do navegador.
 *
 * Sem Supabase configurado (modo de demonstração) devolve o salão de exemplo.
 */
export async function obterSalaoDaSessao(): Promise<Salao> {
  if (!supabaseConfigurado) {
    const salao = saloesExemplo.find((s) => s.slug === SLUG_SALAO_DEMONSTRACAO);
    if (!salao) throw new Error("Salão de demonstração não encontrado.");
    return salao;
  }

  const utilizador = await obterUtilizador();
  if (!utilizador) redirect("/entrar");

  const salao = await obterSalaoOpcional();
  if (!salao) redirect("/comecar");

  return salao;
}
