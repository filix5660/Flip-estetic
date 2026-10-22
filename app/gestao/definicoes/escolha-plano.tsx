"use client";

/**
 * Escolha do plano (Solo / Equipa). Hoje muda logo; no futuro deve passar
 * pelo checkout de pagamentos antes de chamar `mudarPlano`.
 */

import { useState, useTransition } from "react";
import { IconeVisto } from "@/components/icones";
import { Alerta, Botao, cn, Distintivo } from "@/components/ui";
import type { DefinicaoPlano } from "@/lib/planos";
import type { Plano } from "@/lib/tipos";
import { mudarPlano } from "../acoes";

export function EscolhaPlano({
  planoAtual,
  planos,
  totalProfissionais,
}: {
  planoAtual: Plano;
  planos: DefinicaoPlano[];
  totalProfissionais: number;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [aMudar, iniciar] = useTransition();

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {planos.map((plano) => {
          const atual = plano.id === planoAtual;
          return (
            <article
              key={plano.id}
              className={cn(
                "flex flex-col rounded-2xl border bg-superficie p-6 shadow-cartao",
                atual ? "border-escuro ring-1 ring-escuro" : "border-linha",
              )}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{plano.nome}</h2>
                {atual && <Distintivo tom="verde">Plano atual</Distintivo>}
              </div>
              <p className="mt-1 text-suave">{plano.resumo}</p>
              <ul className="mt-5 grid gap-2.5 text-sm">
                {plano.recursos.map((r) => (
                  <li key={r} className="flex gap-2">
                    <IconeVisto className="shrink-0 text-acento-500" />
                    {r}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-6">
                {!atual && (
                  <Botao
                    className="w-full"
                    variante={plano.id === "equipa" ? "primario" : "secundario"}
                    disabled={aMudar}
                    onClick={() =>
                      iniciar(async () => {
                        setErro(null);
                        const resposta = await mudarPlano(plano.id);
                        if (!resposta.ok) setErro(resposta.erro);
                      })
                    }
                  >
                    Mudar para {plano.nome}
                  </Botao>
                )}
                {atual && (
                  <p className="text-sm text-suave">
                    {totalProfissionais} de {plano.maxProfissionais} profissional(ais) em uso.
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {erro && (
        <div className="mt-4">
          <Alerta>{erro}</Alerta>
        </div>
      )}
      <p className="mt-4 text-xs text-suave">
        Nesta versão de demonstração a mudança é imediata. Os pagamentos serão ligados mais tarde.
      </p>
    </>
  );
}
