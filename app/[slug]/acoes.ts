"use server";

// Ações da página pública de marcação. Quem as chama é um visitante sem
// conta, por isso o navegador só envia o que escolheu (serviço, dia, hora,
// nome, contacto e, se quiser, o profissional). Preço, duração e quem está
// livre são sempre decididos pela base de dados (funções horarios_livres e
// criar_marcacao).

import { revalidatePath } from "next/cache";
import {
  listarServicos,
  obterAgora,
  obterHorariosSemanais,
  obterSalaoPorSlug,
} from "@/lib/dados";
import { horariosDeExemplo } from "@/lib/disponibilidade";
import type { Hora } from "@/lib/modelo";
import { planos } from "@/lib/planos";
import { erro, ERRO_DADOS, sucesso, type Resultado } from "@/lib/resultado";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { criarClientePublico } from "@/lib/supabase/servidor";
import {
  esquemaHorariosLivres,
  esquemaNovaMarcacao,
  UUID_VALIDO,
} from "@/lib/validacao";

const ERRO_HORARIOS = "Não foi possível carregar os horários. Tenta novamente.";
const ERRO_SEM_MARCACAO_ONLINE = "Este salão ainda não recebe marcações online.";

/** O plano do salão tem de incluir marcações online (a base de dados também o confirma). */
async function aceitaMarcacoes(slug: string) {
  const salao = await obterSalaoPorSlug(slug);
  return salao !== null && planos[salao.plano].recursos.marcacoesOnline;
}

export async function obterHorariosLivres(entrada: unknown): Promise<Resultado<Hora[]>> {
  const dados = esquemaHorariosLivres.safeParse(entrada);
  if (!dados.success) return erro(ERRO_DADOS);
  const { slug, servicoId, data, profissionalId } = dados.data;
  if (!(await aceitaMarcacoes(slug))) return erro(ERRO_SEM_MARCACAO_ONLINE);

  if (!supabaseConfigurado) {
    const salao = await obterSalaoPorSlug(slug);
    if (!salao) return erro(ERRO_DADOS);
    const [servicos, horarios, agora] = await Promise.all([
      listarServicos(salao.id),
      obterHorariosSemanais(salao.id),
      obterAgora(salao.fusoHorario),
    ]);
    const servico = servicos.find((s) => s.id === servicoId);
    if (!servico) return erro(ERRO_DADOS);
    return sucesso(horariosDeExemplo(data, servico, horarios, agora.hoje, agora.hora));
  }

  if (!UUID_VALIDO.test(servicoId)) return erro(ERRO_DADOS);
  if (profissionalId !== null && !UUID_VALIDO.test(profissionalId)) return erro(ERRO_DADOS);
  const { data: linhas, error } = await criarClientePublico().rpc("horarios_livres", {
    p_slug: slug,
    p_servico_id: servicoId,
    p_data: data,
    // Só envia quando o cliente escolheu alguém (null = qualquer profissional).
    ...(profissionalId ? { p_profissional_id: profissionalId } : {}),
  });
  if (error) {
    console.error("[marcacao] horarios_livres:", error.code, error.message);
    return erro(ERRO_HORARIOS);
  }

  return sucesso(
    (linhas as { inicio: string }[]).map((linha) => linha.inicio.slice(0, 5)),
  );
}

const ERROS_MARCACAO: Record<string, string> = {
  HORARIO_INDISPONIVEL: "Esse horário acabou de ser ocupado. Escolhe outro.",
  LIMITE_CONTACTO:
    "Já tens várias marcações por realizar neste salão. Para marcar mais, contacta o salão.",
  LIMITE_PLANO: "Este salão não está a aceitar marcações online neste mês. Contacta o salão.",
  LIMITE_TEMPORARIO: "Há muitos pedidos neste momento. Tenta de novo daqui a pouco.",
  SEM_MARCACAO_ONLINE: ERRO_SEM_MARCACAO_ONLINE,
  DADOS_INVALIDOS: ERRO_DADOS,
  SALAO_NAO_ENCONTRADO: ERRO_DADOS,
};

export async function criarMarcacao(entrada: unknown): Promise<Resultado> {
  const dados = esquemaNovaMarcacao.safeParse(entrada);
  if (!dados.success) {
    return erro("Verifica o nome e o contacto (telefone ou email).");
  }
  const { slug, servicoId, profissionalId, data, hora, nome, contacto } = dados.data;
  if (!(await aceitaMarcacoes(slug))) return erro(ERRO_SEM_MARCACAO_ONLINE);

  // Modo de demonstração: nada é guardado.
  if (!supabaseConfigurado) return sucesso(undefined);

  if (!UUID_VALIDO.test(servicoId)) return erro(ERRO_DADOS);
  if (profissionalId !== null && !UUID_VALIDO.test(profissionalId)) return erro(ERRO_DADOS);
  // A base de dados confirma que o profissional é deste salão e está livre.
  const { error } = await criarClientePublico().rpc("criar_marcacao", {
    p_slug: slug,
    p_servico_id: servicoId,
    p_data: data,
    p_inicio: hora,
    p_nome: nome,
    p_contacto: contacto,
    ...(profissionalId ? { p_profissional_id: profissionalId } : {}),
  });
  if (error) {
    const conhecido = ERROS_MARCACAO[error.message];
    if (!conhecido) console.error("[marcacao] criar_marcacao:", error.code, error.message);
    return erro(conhecido ?? "Não foi possível concluir a marcação. Tenta novamente.");
  }

  revalidatePath("/gestao", "layout");
  return sucesso(undefined);
}
