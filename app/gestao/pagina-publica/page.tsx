import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/ui";
import { repo } from "@/lib/dados";
import { obterNegocioAtual } from "@/lib/sessao";
import { EditorPagina } from "./editor-pagina";

export const metadata: Metadata = { title: "Página pública" };

export default async function PaginaPublica() {
  const negocio = await obterNegocioAtual();
  const servicos = (await repo.servicos.listar(negocio.id)).filter((s) => s.ativo);

  return (
    <>
      <CabecalhoPagina
        titulo="Página pública"
        descricao="Personaliza o que os clientes veem antes de marcar."
      />
      <EditorPagina
        inicial={{
          nome: negocio.nome,
          slug: negocio.slug,
          tipo: negocio.tipo,
          apresentacao: negocio.apresentacao,
          morada: negocio.morada,
          telefone: negocio.telefone,
          corPrincipal: negocio.corPrincipal,
          logotipoUrl: negocio.logotipoUrl,
        }}
        servicos={servicos.slice(0, 3).map((s) => ({ nome: s.nome, duracaoMin: s.duracaoMin, precoCentimos: s.precoCentimos }))}
      />
    </>
  );
}
