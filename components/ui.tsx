/**
 * Componentes de interface partilhados (sem estado, servem para
 * Server e Client Components).
 */

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { iniciais } from "@/lib/formatar";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ───────────── Botões ─────────────

type Variante = "primario" | "secundario" | "fantasma" | "perigo";
type Tamanho = "sm" | "md" | "lg";

const VARIANTES: Record<Variante, string> = {
  primario: "bg-escuro text-white hover:bg-stone-700 shadow-sm",
  secundario: "bg-white text-tinta border border-linha hover:bg-stone-50 shadow-sm",
  fantasma: "text-suave hover:bg-stone-100 hover:text-tinta",
  perigo: "bg-white text-red-700 border border-red-200 hover:bg-red-50",
};

const TAMANHOS: Record<Tamanho, string> = {
  sm: "h-8 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-5 text-base gap-2 rounded-xl",
};

export function estiloBotao(variante: Variante = "primario", tamanho: Tamanho = "md") {
  return cn(
    "inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-colors",
    "disabled:pointer-events-none disabled:opacity-50",
    VARIANTES[variante],
    TAMANHOS[tamanho],
  );
}

export function Botao({
  variante,
  tamanho,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variante?: Variante; tamanho?: Tamanho }) {
  return <button type={type} className={cn(estiloBotao(variante, tamanho), className)} {...props} />;
}

export function BotaoLink({
  variante,
  tamanho,
  className,
  ...props
}: ComponentProps<typeof Link> & { variante?: Variante; tamanho?: Tamanho }) {
  return <Link className={cn(estiloBotao(variante, tamanho), className)} {...props} />;
}

// ───────────── Estrutura ─────────────

export function CabecalhoPagina({
  titulo,
  descricao,
  acoes,
}: {
  titulo: string;
  descricao?: ReactNode;
  acoes?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{titulo}</h1>
        {descricao && <p className="mt-1.5 max-w-2xl text-suave">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </header>
  );
}

export function Cartao({
  titulo,
  descricao,
  acoes,
  children,
  className,
  semPadding,
}: {
  titulo?: ReactNode;
  descricao?: ReactNode;
  acoes?: ReactNode;
  children?: ReactNode;
  className?: string;
  semPadding?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-linha bg-superficie shadow-cartao",
        !semPadding && "p-5 sm:p-6",
        className,
      )}
    >
      {(titulo || acoes) && (
        <div
          className={cn(
            "mb-5 flex flex-wrap items-start justify-between gap-3",
            semPadding && "px-5 pt-5 sm:px-6 sm:pt-6",
          )}
        >
          <div>
            {titulo && <h2 className="text-lg font-semibold tracking-tight">{titulo}</h2>}
            {descricao && <p className="mt-1 text-sm text-suave">{descricao}</p>}
          </div>
          {acoes}
        </div>
      )}
      {children}
    </section>
  );
}

export function EstadoVazio({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-linha px-6 py-10 text-center">
      <p className="font-medium">{titulo}</p>
      {descricao && <p className="mx-auto mt-1 max-w-sm text-sm text-suave">{descricao}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
}

// ───────────── Formulários ─────────────

export const classeInput = cn(
  "block w-full min-w-0 rounded-xl border border-linha bg-white px-3.5 py-2.5 text-[15px] text-tinta",
  "placeholder:text-stone-400 transition-shadow",
  "focus:border-acento-500 focus:ring-3 focus:ring-acento-100 focus:outline-none",
  "disabled:bg-stone-50 disabled:text-suave",
);

export function Campo({
  rotulo,
  ajuda,
  children,
  className,
}: {
  rotulo: ReactNode;
  ajuda?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("grid gap-1.5", className)}>
      <span className="text-sm font-medium">{rotulo}</span>
      {children}
      {ajuda && <span className="text-xs text-suave">{ajuda}</span>}
    </label>
  );
}

export function Interruptor({
  ligado,
  aoMudar,
  rotulo,
  desativado,
}: {
  ligado: boolean;
  aoMudar: (valor: boolean) => void;
  rotulo: string;
  desativado?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      disabled={desativado}
      onClick={() => aoMudar(!ligado)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
        ligado ? "bg-escuro" : "bg-stone-300",
      )}
    >
      <span
        className={cn(
          "inline-block size-5 rounded-full bg-white shadow transition-transform",
          ligado ? "translate-x-5.5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export function Alerta({
  tipo = "erro",
  children,
}: {
  tipo?: "erro" | "sucesso" | "aviso" | "info";
  children: ReactNode;
}) {
  const estilos = {
    erro: "border-red-200 bg-red-50 text-red-800",
    sucesso: "border-emerald-200 bg-emerald-50 text-emerald-800",
    aviso: "border-amber-200 bg-amber-50 text-amber-900",
    info: "border-linha bg-acento-50 text-acento-700",
  };
  return (
    <p
      role={tipo === "erro" ? "alert" : "status"}
      className={cn("rounded-xl border px-3.5 py-2.5 text-sm", estilos[tipo])}
    >
      {children}
    </p>
  );
}

// ───────────── Pequenos elementos ─────────────

type Tom = "neutro" | "acento" | "verde" | "ambar" | "vermelho" | "azul";

const TONS: Record<Tom, string> = {
  neutro: "bg-stone-100 text-stone-700",
  acento: "bg-acento-100 text-acento-700",
  verde: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60",
  ambar: "bg-amber-50 text-amber-800 ring-1 ring-amber-200/60",
  vermelho: "bg-red-50 text-red-700 ring-1 ring-red-200/60",
  azul: "bg-sky-50 text-sky-700 ring-1 ring-sky-200/60",
};

export function Distintivo({ tom = "neutro", children }: { tom?: Tom; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONS[tom],
      )}
    >
      {children}
    </span>
  );
}

export function Avatar({
  nome,
  cor,
  tamanho = "md",
}: {
  nome: string;
  cor: string;
  tamanho?: "sm" | "md" | "lg";
}) {
  const tamanhos = { sm: "size-7 text-[11px]", md: "size-9 text-xs", lg: "size-12 text-sm" };
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        tamanhos[tamanho],
      )}
      style={{ backgroundColor: cor }}
    >
      {iniciais(nome)}
    </span>
  );
}
