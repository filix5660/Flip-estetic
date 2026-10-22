import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/ui";
import { repo } from "@/lib/dados";
import { PLANOS } from "@/lib/planos";
import { obterNegocioAtual } from "@/lib/sessao";
import { agoraNoFuso } from "@/lib/tempo";
import { GestorProfissionais } from "./gestor-profissionais";

export const metadata: Metadata = { title: "Equipa" };

export default async function Profissionais() {
  const negocio = await obterNegocioAtual();
  const hoje = agoraNoFuso(negocio.fusoHorario).data;
  const [profissionais, futuras, servicos] = await Promise.all([
    repo.profissionais.listar(negocio.id),
    repo.marcacoes.listar({ negocioId: negocio.id, de: hoje, ate: "9999-12-31" }),
    repo.servicos.listar(negocio.id),
  ]);

  const plano = PLANOS[negocio.plano];

  return (
    <>
      <CabecalhoPagina
        titulo={negocio.plano === "equipa" ? "Equipa" : "O teu perfil"}
        descricao={
          negocio.plano === "equipa"
            ? `Cada profissional tem a sua agenda e os seus horários. O teu plano permite até ${plano.maxProfissionais}.`
            : "No plano Solo és só tu. Este nome aparece nas tuas marcações."
        }
      />
      <GestorProfissionais
        plano={negocio.plano}
        maxProfissionais={plano.maxProfissionais}
        profissionais={profissionais.map((p) => ({
          ...p,
          proximas: futuras.filter((m) => m.profissionalId === p.id && m.estado === "confirmada").length,
          servicos: servicos.filter((s) => s.profissionalIds.includes(p.id)).length,
        }))}
      />
    </>
  );
}
