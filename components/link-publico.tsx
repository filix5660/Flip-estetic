"use client";

import { useState, useSyncExternalStore } from "react";
import { IconeCopiar, IconeExterno, IconeVisto } from "./icones";
import { Botao, cn } from "./ui";

const semSubscricao = () => () => {};

/** Mostra o link da página pública com botões para copiar e abrir. */
export function LinkPublico({ slug, className }: { slug: string; className?: string }) {
  // O domínio só é conhecido no browser; no servidor fica vazio (evita erros de hidratação).
  const origem = useSyncExternalStore(
    semSubscricao,
    () => window.location.origin,
    () => "",
  );
  const [copiado, setCopiado] = useState(false);
  const url = `${origem}/${slug}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // o navegador bloqueou o acesso à área de transferência
    }
  }

  return (
    <div className={cn("@container", className)}>
      <div className="flex flex-col gap-2 @md:flex-row @md:items-center">
      <code className="min-w-0 flex-1 truncate rounded-xl border border-linha bg-fundo px-3.5 py-2.5 font-mono text-sm">
        {origem.replace(/^https?:\/\//, "")}/{slug}
      </code>
      <div className="flex gap-2">
        <Botao variante="secundario" onClick={copiar} className="flex-1 @md:flex-none">
          {copiado ? <IconeVisto tamanho={16} /> : <IconeCopiar tamanho={16} />}
          {copiado ? "Copiado" : "Copiar"}
        </Botao>
        <a
          href={`/${slug}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-suave hover:bg-stone-100 hover:text-tinta"
        >
          Abrir <IconeExterno tamanho={16} />
        </a>
      </div>
      </div>
    </div>
  );
}
