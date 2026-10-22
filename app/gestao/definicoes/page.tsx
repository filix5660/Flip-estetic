import type { Metadata } from "next";
import Link from "next/link";
import { CabecalhoPagina, Cartao } from "@/components/ui";
import { repo } from "@/lib/dados";
import { PLANOS } from "@/lib/planos";
import { obterNegocioAtual } from "@/lib/sessao";
import { EscolhaPlano } from "./escolha-plano";

export const metadata: Metadata = { title: "Plano" };

export default async function Definicoes() {
  const negocio = await obterNegocioAtual();
  const profissionais = await repo.profissionais.listar(negocio.id);

  return (
    <>
      <CabecalhoPagina
        titulo="Plano"
        descricao="Escolhe o plano que serve o teu negócio. Podes mudar quando quiseres."
      />
      <EscolhaPlano
        planoAtual={negocio.plano}
        planos={Object.values(PLANOS)}
        totalProfissionais={profissionais.length}
      />
      <Cartao titulo="Regras de marcação" className="mt-6">
        <p className="text-sm text-suave">
          A forma como as vagas são criadas, a antecedência mínima e até quando os clientes podem marcar estão em{" "}
          <Link href="/gestao/horarios" className="font-medium text-tinta underline">
            Horários
          </Link>
          .
        </p>
      </Cartao>
    </>
  );
}
