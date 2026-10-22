import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/ui";
import { repo } from "@/lib/dados";
import { obterNegocioAtual } from "@/lib/sessao";
import { agoraNoFuso } from "@/lib/tempo";
import { ListaClientes, type ResumoCliente } from "./lista-clientes";

export const metadata: Metadata = { title: "Clientes" };

export default async function Clientes() {
  const negocio = await obterNegocioAtual();
  const hoje = agoraNoFuso(negocio.fusoHorario).data;
  const [clientes, marcacoes] = await Promise.all([
    repo.clientes.listar(negocio.id),
    repo.marcacoes.listar({ negocioId: negocio.id, de: "0000-01-01", ate: "9999-12-31" }),
  ]);

  const resumos: ResumoCliente[] = clientes.map((c) => {
    const doCliente = marcacoes.filter((m) => m.clienteId === c.id);
    const concluidas = doCliente.filter((m) => m.estado === "concluida");
    const proxima = doCliente.find((m) => m.estado === "confirmada" && m.data >= hoje);
    return {
      id: c.id,
      nome: c.nome,
      telefone: c.telefone,
      email: c.email,
      notas: c.notas,
      visitas: concluidas.length,
      faltas: doCliente.filter((m) => m.estado === "falta").length,
      ultimaVisita: concluidas.at(-1)?.data ?? null,
      proxima: proxima?.data ?? null,
      totalCentimos: concluidas.reduce((s, m) => s + m.precoCentimos, 0),
    };
  });

  return (
    <>
      <CabecalhoPagina
        titulo="Clientes"
        descricao="Criados automaticamente a cada marcação (identificados pelo telemóvel)."
      />
      <ListaClientes clientes={resumos} />
    </>
  );
}
