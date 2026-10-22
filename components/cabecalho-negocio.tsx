import type { CSSProperties } from "react";
import { corTextoSobre, iniciais } from "@/lib/formatar";
import { IconeLocal, IconeTelefone } from "./icones";
import { cn } from "./ui";

export interface DadosCabecalho {
  nome: string;
  apresentacao: string;
  morada: string;
  telefone: string;
  corPrincipal: string;
  logotipoUrl: string | null;
}

/** Variáveis CSS com a cor da marca, para usar com bg-(--marca) etc. */
export function variaveisMarca(cor: string): CSSProperties {
  return { "--marca": cor, "--marca-texto": corTextoSobre(cor) } as CSSProperties;
}

export function LogotipoNegocio({
  nome,
  logotipoUrl,
  className,
}: {
  nome: string;
  logotipoUrl: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-2xl bg-(--marca) font-semibold text-(--marca-texto) ring-4 ring-white",
        className,
      )}
    >
      {logotipoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- pode ser data URL ou de qualquer storage
        <img src={logotipoUrl} alt={`Logótipo de ${nome}`} className="size-full object-cover" />
      ) : (
        iniciais(nome) || "?"
      )}
    </span>
  );
}

/** Cabeçalho da página pública (também usado na pré-visualização da gestão). */
export function CabecalhoNegocio({ dados, compacto }: { dados: DadosCabecalho; compacto?: boolean }) {
  const nome = dados.nome || "Nome do negócio";
  return (
    <header style={variaveisMarca(dados.corPrincipal)}>
      <div className={cn("bg-(--marca)", compacto ? "h-16" : "h-28 sm:h-36")} />
      <div className={cn("mx-auto max-w-3xl", compacto ? "px-4" : "px-4 sm:px-6")}>
        <LogotipoNegocio
          nome={nome}
          logotipoUrl={dados.logotipoUrl}
          className={cn(compacto ? "-mt-8 size-16 text-lg" : "-mt-12 size-24 text-2xl")}
        />
        <h1
          className={cn(
            "mt-3 font-semibold tracking-tight",
            compacto ? "text-xl" : "text-3xl sm:text-4xl",
          )}
        >
          {nome}
        </h1>
        {dados.apresentacao && (
          <p className={cn("mt-1.5 text-suave", compacto && "text-sm")}>{dados.apresentacao}</p>
        )}
        {(dados.morada || dados.telefone) && (
          <div className={cn("mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-suave", compacto ? "text-xs" : "text-sm")}>
            {dados.morada && (
              <span className="inline-flex items-center gap-1.5">
                <IconeLocal tamanho={15} /> {dados.morada}
              </span>
            )}
            {dados.telefone && (
              <a
                href={`tel:${dados.telefone.replace(/\s/g, "")}`}
                className="inline-flex items-center gap-1.5 hover:text-tinta"
              >
                <IconeTelefone tamanho={15} /> {dados.telefone}
              </a>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
