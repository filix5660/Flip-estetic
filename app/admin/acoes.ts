"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { planos } from "@/lib/planos";
import { erro, ERRO_GENERICO, sucesso, type Resultado } from "@/lib/resultado";
import { UUID_VALIDO } from "@/lib/validacao";
import { exigirAdmin } from "./verificar";

const esquemaPlano = z.object({
  salaoId: z.string().regex(UUID_VALIDO),
  plano: z.enum(Object.keys(planos) as [string, ...string[]]),
  cortesia: z.boolean(),
  nota: z.string().trim().max(200),
});

const ERROS: Record<string, string> = {
  DADOS_INVALIDOS: "Verifica o plano e a nota (máximo 200 caracteres).",
  NAO_ENCONTRADO: "Este salão já não existe.",
  SEM_PERMISSAO: "Não tens permissão para fazer isto.",
};

/** Muda o plano de um salão e marca-o (ou não) como cortesia. */
export async function definirPlano(entrada: unknown): Promise<Resultado> {
  const supabase = await exigirAdmin();
  const dados = esquemaPlano.safeParse(entrada);
  if (!dados.success) return erro(ERROS.DADOS_INVALIDOS);

  const { error } = await supabase.rpc("admin_definir_plano", {
    p_salao_id: dados.data.salaoId,
    p_plano: dados.data.plano,
    p_cortesia: dados.data.cortesia,
    p_nota: dados.data.cortesia ? dados.data.nota : "",
  });
  if (error) {
    const conhecido = ERROS[error.message];
    if (!conhecido) console.error("[admin] definir plano:", error.code, error.message);
    return erro(conhecido ?? ERRO_GENERICO);
  }

  revalidatePath("/admin");
  return sucesso(undefined);
}
