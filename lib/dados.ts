import "server-only";

// Acesso aos dados. As páginas só falam com estas funções.
//
// Com Supabase configurado, lê da base de dados; sem ele, usa os dados de
// exemplo (modo de demonstração).
//
// Dois tipos de leitura:
//   • públicas  → cliente sem sessão; só o que um visitante pode ver;
//   • da gestão → cliente com a sessão do dono; a base de dados (RLS) só
//                 devolve linhas do salão a que ele pertence, mesmo que o
//                 código peça outro `salaoId` por engano.

import type { PostgrestError } from "@supabase/supabase-js";
import { connection } from "next/server";
import { hojeNoFuso, horaAtualNoFuso } from "./datas";
import * as exemplo from "./dados-exemplo";
import {
  COLUNAS_BLOQUEIO,
  COLUNAS_CLIENTE,
  COLUNAS_HORARIO,
  COLUNAS_MARCACAO,
  COLUNAS_PROFISSIONAL,
  COLUNAS_SALAO,
  COLUNAS_SERVICO,
  paraBloqueio,
  paraCliente,
  paraHorario,
  paraMarcacao,
  paraProfissional,
  paraSalao,
  paraServico,
} from "./mapear";
import type { Data } from "./modelo";
import { supabaseConfigurado } from "./supabase/config";
import { criarClientePublico, criarClienteSessao } from "./supabase/servidor";
import { SLUG_VALIDO } from "./validacao";

/** Regista o erro real no servidor e devolve um erro genérico (sem detalhes internos). */
function falha(contexto: string, erro: PostgrestError) {
  console.error(`[dados] ${contexto}:`, erro.code, erro.message);
  return new Error("Não foi possível carregar os dados.");
}

// ───────────────────────── Leituras públicas ─────────────────────────

/** Só para o modo de demonstração: a lista de salões não é pública. */
export async function listarSaloesDeExemplo() {
  return supabaseConfigurado ? [] : exemplo.saloes;
}

export async function obterSalaoPorSlug(slug: string) {
  if (!supabaseConfigurado) {
    return exemplo.saloes.find((salao) => salao.slug === slug) ?? null;
  }
  if (!SLUG_VALIDO.test(slug)) return null;

  const { data, error } = await criarClientePublico()
    .from("saloes")
    .select(COLUNAS_SALAO)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw falha("obterSalaoPorSlug", error);
  return data ? paraSalao(data) : null;
}

/** Serviços ativos (os removidos ficam arquivados, fora desta lista). */
export async function listarServicos(salaoId: string) {
  if (!supabaseConfigurado) {
    return exemplo.servicos.filter((s) => s.salaoId === salaoId && s.ativo);
  }

  const { data, error } = await criarClientePublico()
    .from("servicos")
    .select(COLUNAS_SERVICO)
    .eq("salao_id", salaoId)
    .eq("ativo", true)
    .order("nome");
  if (error) throw falha("listarServicos", error);
  return data.map(paraServico);
}

export async function listarProfissionais(salaoId: string) {
  if (!supabaseConfigurado) {
    return exemplo.profissionais.filter((p) => p.salaoId === salaoId && p.ativo);
  }

  const { data, error } = await criarClientePublico()
    .from("profissionais")
    .select(COLUNAS_PROFISSIONAL)
    .eq("salao_id", salaoId)
    .eq("ativo", true)
    .order("nome");
  if (error) throw falha("listarProfissionais", error);
  return data.map(paraProfissional);
}

export async function obterHorariosSemanais(salaoId: string) {
  if (!supabaseConfigurado) {
    return exemplo.horariosSemanais.filter((h) => h.salaoId === salaoId);
  }

  const { data, error } = await criarClientePublico()
    .from("horarios_semanais")
    .select(COLUNAS_HORARIO)
    .eq("salao_id", salaoId);
  if (error) throw falha("obterHorariosSemanais", error);
  return data.map(paraHorario);
}

// ───────────────── Leituras da gestão (exigem sessão) ─────────────────

export async function listarClientes(salaoId: string) {
  if (!supabaseConfigurado) {
    return exemplo.clientes.filter((c) => c.salaoId === salaoId);
  }

  const supabase = await criarClienteSessao();
  const { data, error } = await supabase
    .from("clientes")
    .select(COLUNAS_CLIENTE)
    .eq("salao_id", salaoId);
  if (error) throw falha("listarClientes", error);
  return data.map(paraCliente);
}

export async function listarBloqueios(salaoId: string) {
  if (!supabaseConfigurado) {
    return exemplo.bloqueios.filter((b) => b.salaoId === salaoId);
  }

  const supabase = await criarClienteSessao();
  const { data, error } = await supabase
    .from("bloqueios")
    .select(COLUNAS_BLOQUEIO)
    .eq("salao_id", salaoId)
    .order("data")
    .order("inicio");
  if (error) throw falha("listarBloqueios", error);
  return data.map(paraBloqueio);
}

export async function listarMarcacoes(salaoId: string, de: Data, ate: Data) {
  if (!supabaseConfigurado) {
    const salao = exemplo.saloes.find((s) => s.id === salaoId);
    if (!salao) return [];

    const { hoje, hora } = await obterAgora(salao.fusoHorario);
    return exemplo
      .gerarMarcacoesExemplo(salaoId, hoje, hora)
      .filter((m) => m.data >= de && m.data <= ate)
      .sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio));
  }

  const supabase = await criarClienteSessao();
  const { data, error } = await supabase
    .from("marcacoes")
    .select(COLUNAS_MARCACAO)
    .eq("salao_id", salaoId)
    .gte("data", de)
    .lte("data", ate)
    .order("data")
    .order("inicio");
  if (error) throw falha("listarMarcacoes", error);
  return data.map(paraMarcacao);
}

/** Data e hora atuais no fuso do salão. Só corre no pedido, nunca no build. */
export async function obterAgora(fusoHorario: string) {
  await connection();
  const agora = new Date();
  return {
    hoje: hojeNoFuso(fusoHorario, agora),
    hora: horaAtualNoFuso(fusoHorario, agora),
  };
}
