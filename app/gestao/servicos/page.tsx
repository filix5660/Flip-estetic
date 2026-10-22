import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/ui";
import { repo } from "@/lib/dados";
import { obterNegocioAtual } from "@/lib/sessao";
import { GestorServicos } from "./gestor-servicos";

export const metadata: Metadata = { title: "Serviços" };

export default async function Servicos() {
  const negocio = await obterNegocioAtual();
  const [servicos, profissionais] = await Promise.all([
    repo.servicos.listar(negocio.id),
    repo.profissionais.listar(negocio.id),
  ]);

  return (
    <>
      <CabecalhoPagina
        titulo="Serviços"
        descricao="O que ofereces, quanto tempo demora e quanto custa. A duração define as vagas que os clientes veem."
      />
      <GestorServicos
        servicos={servicos}
        profissionais={profissionais.map((p) => ({ id: p.id, nome: p.nome, cor: p.cor }))}
        plano={negocio.plano}
        modoVagas={negocio.regras.modoVagas}
        intervaloFixoMin={negocio.regras.intervaloFixoMin}
      />
    </>
  );
}
