/**
 * Página pública de marcação de um negócio: /barbearia-central, /estudio-bela…
 *
 * Corre no servidor: carrega o negócio pelo slug e envia para o browser só os
 * dados públicos (sem regras internas, clientes ou marcações). As vagas são
 * pedidas depois, passo a passo, pelas Server Actions de `acoes.ts`.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CabecalhoNegocio, variaveisMarca } from "@/components/cabecalho-negocio";
import { repo } from "@/lib/dados";
import { agoraNoFuso } from "@/lib/tempo";
import type { NegocioPublico, ProfissionalPublico, ServicoPublico } from "@/lib/tipos";
import { FluxoMarcacao } from "./fluxo-marcacao";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const negocio = await repo.negocios.porSlug(slug);
  if (!negocio) return { title: "Página não encontrada" };
  return {
    title: `Marcar · ${negocio.nome}`,
    description: negocio.apresentacao || `Faz a tua marcação em ${negocio.nome}.`,
  };
}

export default async function PaginaDeMarcacao({ params }: Props) {
  await connection(); // dados sempre atualizados (vagas mudam a toda a hora)
  const { slug } = await params;
  const negocio = await repo.negocios.porSlug(slug);
  if (!negocio) notFound();

  const [servicos, profissionais] = await Promise.all([
    repo.servicos.listar(negocio.id),
    repo.profissionais.listar(negocio.id),
  ]);

  const ativos: ProfissionalPublico[] = profissionais
    .filter((p) => p.ativo)
    .map(({ id, nome, cargo, cor }) => ({ id, nome, cargo, cor }));
  const idsAtivos = new Set(ativos.map((p) => p.id));

  // Só serviços ativos com pelo menos um profissional ativo podem ser marcados.
  const servicosPublicos: ServicoPublico[] = servicos
    .filter((s) => s.ativo)
    .map((s) => ({
      id: s.id,
      nome: s.nome,
      descricao: s.descricao,
      duracaoMin: s.duracaoMin,
      precoCentimos: s.precoCentimos,
      profissionalIds: s.profissionalIds.filter((id) => idsAtivos.has(id)),
    }))
    .filter((s) => s.profissionalIds.length > 0);

  const publico: NegocioPublico = {
    slug: negocio.slug,
    nome: negocio.nome,
    tipo: negocio.tipo,
    apresentacao: negocio.apresentacao,
    morada: negocio.morada,
    telefone: negocio.telefone,
    corPrincipal: negocio.corPrincipal,
    logotipoUrl: negocio.logotipoUrl,
    plano: negocio.plano,
    janelaMarcacaoDias: negocio.regras.janelaMarcacaoDias,
  };

  return (
    <div className="min-h-dvh pb-16" style={variaveisMarca(negocio.corPrincipal)}>
      <CabecalhoNegocio dados={negocio} />
      <main className="mx-auto mt-8 max-w-3xl px-4 sm:px-6">
        <FluxoMarcacao
          negocio={publico}
          servicos={servicosPublicos}
          profissionais={ativos}
          hoje={agoraNoFuso(negocio.fusoHorario).data}
        />
      </main>
      <footer className="mt-12 text-center text-xs text-suave">
        Marcações por <span className="font-semibold">Flip Estética</span>
      </footer>
    </div>
  );
}
