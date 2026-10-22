"use client";

/**
 * Botões de estado de uma marcação: Concluída, Faltou, Cancelar (com
 * confirmação) e Repor/Desfazer. Cada clique chama a Server Action
 * `alterarEstadoMarcacao`, que atualiza a agenda automaticamente.
 */

import { useState, useTransition } from "react";
import { cn } from "@/components/ui";
import type { EstadoMarcacao } from "@/lib/tipos";
import { alterarEstadoMarcacao } from "../acoes";

export function AcoesMarcacao({
  id,
  estado,
  compacto,
}: {
  id: string;
  estado: EstadoMarcacao;
  compacto?: boolean;
}) {
  const [aGuardar, iniciar] = useTransition();
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function mudar(novo: EstadoMarcacao) {
    setErro(null);
    iniciar(async () => {
      const resposta = await alterarEstadoMarcacao(id, novo);
      if (!resposta.ok) setErro(resposta.erro);
      setConfirmarCancelamento(false);
    });
  }

  const botao = (rotulo: string, novo: EstadoMarcacao, perigo = false) => (
    <button
      type="button"
      disabled={aGuardar}
      onClick={() => mudar(novo)}
      className={cn(
        "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50",
        perigo ? "text-red-700 hover:bg-red-50" : "text-suave hover:bg-stone-100 hover:text-tinta",
      )}
    >
      {rotulo}
    </button>
  );

  if (estado !== "confirmada") {
    return (
      <div className={cn(!compacto && "mt-2 flex justify-end")}>
        {botao(estado === "cancelada" ? "Repor" : "Desfazer", "confirmada")}
        {erro && <p className="text-xs text-red-700">{erro}</p>}
      </div>
    );
  }

  return (
    <div className="mt-2.5 flex flex-wrap items-center justify-end gap-1 border-t border-linha pt-2">
      {erro && <p className="mr-auto text-xs text-red-700">{erro}</p>}
      {confirmarCancelamento ? (
        <>
          <span className="mr-1 text-xs text-suave">Cancelar esta marcação?</span>
          {botao("Sim, cancelar", "cancelada", true)}
          <button
            type="button"
            onClick={() => setConfirmarCancelamento(false)}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-suave hover:bg-stone-100"
          >
            Não
          </button>
        </>
      ) : (
        <>
          {botao("Concluída", "concluida")}
          {botao("Faltou", "falta")}
          <button
            type="button"
            onClick={() => setConfirmarCancelamento(true)}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
          >
            Cancelar
          </button>
        </>
      )}
    </div>
  );
}
