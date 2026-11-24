import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  listarProfissionais,
  listarServicos,
  obterAgora,
  obterHorariosSemanais,
  obterSalaoPorSlug,
} from "@/lib/dados";
import { planos } from "@/lib/planos";
import { supabaseConfigurado } from "@/lib/supabase/config";
import FluxoMarcacao from "./fluxo-marcacao";

export async function generateMetadata(
  props: PageProps<"/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const salao = await obterSalaoPorSlug(slug);
  if (!salao) return {};

  return {
    title: `${salao.nome} | Marcações`,
    description: salao.apresentacao,
  };
}

export default async function PaginaSalao(props: PageProps<"/[slug]">) {
  const { slug } = await props.params;
  const salao = await obterSalaoPorSlug(slug);
  if (!salao) notFound();

  const [servicos, profissionais, horarios, agora] = await Promise.all([
    listarServicos(salao.id),
    listarProfissionais(salao.id),
    obterHorariosSemanais(salao.id),
    obterAgora(salao.fusoHorario),
  ]);

  return (
    <FluxoMarcacao
      salao={salao}
      servicos={servicos}
      // Só o nome: o cliente escolhe por quem quer ser atendido.
      profissionais={profissionais.map((p) => ({ id: p.id, nome: p.nome }))}
      horarios={horarios}
      hoje={agora.hoje}
      guardaMarcacoes={supabaseConfigurado}
      aceitaMarcacoes={planos[salao.plano].recursos.marcacoesOnline}
    />
  );
}
