"use server";

import { redirect } from "next/navigation";
import { obterUtilizador } from "@/lib/sessao";
import { supabaseConfigurado, URL_DO_SITE } from "@/lib/supabase/config";
import { criarClienteSessao } from "@/lib/supabase/servidor";
import {
  esquemaCriarConta,
  esquemaCriarSalao,
  esquemaEntrar,
  PALAVRA_PASSE_MINIMO,
} from "@/lib/validacao";

export type EstadoFormulario = { erro?: string; mensagem?: string } | null;

const SEM_SUPABASE: EstadoFormulario = {
  erro: "As contas ainda não estão ativas neste ambiente (falta configurar o Supabase).",
};

export async function entrar(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  if (!supabaseConfigurado) return SEM_SUPABASE;

  const dados = esquemaEntrar.safeParse({
    email: formulario.get("email"),
    palavraPasse: formulario.get("palavraPasse"),
  });
  // A mesma mensagem para todos os casos: não revela se o email existe.
  const erroGenerico: EstadoFormulario = {
    erro: "Email ou palavra-passe incorretos. Se acabaste de criar a conta, confirma primeiro o email.",
  };
  if (!dados.success) return erroGenerico;

  const supabase = await criarClienteSessao();
  const { error } = await supabase.auth.signInWithPassword({
    email: dados.data.email,
    password: dados.data.palavraPasse,
  });
  if (error) {
    if (error.status === 429) {
      return { erro: "Demasiadas tentativas. Espera uns minutos e tenta de novo." };
    }
    return erroGenerico;
  }

  redirect("/gestao");
}

export async function criarConta(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  if (!supabaseConfigurado) return SEM_SUPABASE;

  const dados = esquemaCriarConta.safeParse({
    email: formulario.get("email"),
    palavraPasse: formulario.get("palavraPasse"),
  });
  if (!dados.success) {
    return {
      erro: `Indica um email válido e uma palavra-passe com pelo menos ${PALAVRA_PASSE_MINIMO} caracteres.`,
    };
  }

  const supabase = await criarClienteSessao();
  const { data, error } = await supabase.auth.signUp({
    email: dados.data.email,
    password: dados.data.palavraPasse,
    // O endereço vem da configuração, nunca do cabeçalho Host do pedido.
    options: { emailRedirectTo: `${URL_DO_SITE}/auth/confirmar` },
  });
  if (error) {
    if (error.status === 429) {
      return { erro: "Demasiados pedidos. Espera uns minutos e tenta de novo." };
    }
    if (error.code === "weak_password") {
      return { erro: "Essa palavra-passe é demasiado fraca. Escolhe outra mais longa." };
    }
    console.error("[conta] signUp:", error.code);
    return { erro: "Não foi possível criar a conta. Tenta novamente." };
  }

  // Sem confirmação de email ativa, a sessão começa logo.
  if (data.session) redirect("/comecar");

  // A mesma mensagem quer o email já exista quer não: não revela contas.
  return {
    mensagem:
      "Quase lá! Enviámos um email com um link de confirmação. Abre-o para ativar a conta.",
  };
}

export async function sair() {
  if (supabaseConfigurado) {
    const supabase = await criarClienteSessao();
    await supabase.auth.signOut({ scope: "local" });
  }
  redirect("/entrar");
}

const ERROS_CRIAR_SALAO: Record<string, string> = {
  SLUG_INDISPONIVEL: "Esse endereço já está a ser usado. Escolhe outro.",
  DADOS_INVALIDOS: "Esse endereço não pode ser usado. Escolhe outro.",
  JA_TEM_SALAO: "Esta conta já tem um salão.",
};

export async function criarSalao(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  if (!supabaseConfigurado) return SEM_SUPABASE;

  const utilizador = await obterUtilizador();
  if (!utilizador) redirect("/entrar");

  const dados = esquemaCriarSalao.safeParse({
    nome: formulario.get("nome"),
    slug: formulario.get("slug"),
    tipo: formulario.get("tipo"),
    nomeProfissional: formulario.get("nomeProfissional"),
  });
  if (!dados.success) {
    return {
      erro: "Verifica os dados. O endereço só pode ter letras minúsculas, números e hífenes (3 a 40 caracteres).",
    };
  }

  const supabase = await criarClienteSessao();
  const { error } = await supabase.rpc("criar_salao", {
    p_nome: dados.data.nome,
    p_slug: dados.data.slug,
    p_tipo: dados.data.tipo,
    p_nome_profissional: dados.data.nomeProfissional,
  });
  if (error) {
    const conhecido = ERROS_CRIAR_SALAO[error.message];
    if (!conhecido) console.error("[conta] criar_salao:", error.code, error.message);
    return { erro: conhecido ?? "Não foi possível criar o salão. Tenta novamente." };
  }

  redirect("/gestao");
}
