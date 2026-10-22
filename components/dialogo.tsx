"use client";

import { useEffect, type ReactNode } from "react";
import { IconeFechar } from "./icones";

/** Janela modal simples: fecha com Esc ou clique fora. */
export function Dialogo({
  titulo,
  descricao,
  aoFechar,
  children,
}: {
  titulo: string;
  descricao?: ReactNode;
  aoFechar: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", aoTeclar);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflow;
    };
  }, [aoFechar]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={titulo}>
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-stone-900/40 backdrop-blur-[2px]" onClick={aoFechar} />
      <div className="relative max-h-[92dvh] w-full max-w-lg animate-entrar overflow-y-auto rounded-t-3xl bg-superficie p-5 shadow-flutuante sm:rounded-3xl sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{titulo}</h2>
            {descricao && <p className="mt-1 text-sm text-suave">{descricao}</p>}
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-full text-suave hover:bg-stone-100 hover:text-tinta"
          >
            <IconeFechar />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
