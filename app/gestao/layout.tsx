/**
 * Layout comum a todas as páginas de /gestao: barra lateral + conteúdo.
 * Todas as páginas lêem o negócio através de `obterNegocioAtual()` (lib/sessao.ts),
 * que é o ponto onde a autenticação vai entrar.
 */

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { repo } from "@/lib/dados";
import { obterNegocioAtual } from "@/lib/sessao";
import { BarraLateral } from "./barra-lateral";

export const metadata: Metadata = {
  title: { default: "Gestão", template: "%s · Gestão · Flip Estética" },
  robots: { index: false },
};

export default async function LayoutGestao({ children }: { children: ReactNode }) {
  const negocio = await obterNegocioAtual();
  const negocios = await repo.negocios.listar();

  return (
    <div className="min-h-dvh lg:flex">
      <BarraLateral
        negocio={{
          id: negocio.id,
          nome: negocio.nome,
          slug: negocio.slug,
          plano: negocio.plano,
          corPrincipal: negocio.corPrincipal,
          logotipoUrl: negocio.logotipoUrl,
        }}
        negociosDemo={negocios.map((n) => ({ id: n.id, nome: n.nome, plano: n.plano }))}
      />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
