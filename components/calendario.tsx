"use client";

/**
 * Calendário mensal reutilizável (página pública e agenda).
 * Semana começa à segunda. Trabalha só com datas ISO "YYYY-MM-DD" para não
 * haver problemas de fuso horário. Com `diasDisponiveis`, os restantes dias
 * ficam desativados.
 */

import type { CSSProperties } from "react";
import { nomeDoMes } from "@/lib/formatar";
import {
  diaDaSemana,
  diasNoMes,
  isoParaPartes,
  mesSeguinte,
  partesParaIso,
  type DataISO,
} from "@/lib/tempo";
import { cn } from "./ui";
import { IconeDireita, IconeEsquerda } from "./icones";

const CABECALHO = ["S", "T", "Q", "Q", "S", "S", "D"];
const NOMES_COMPLETOS = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];

export interface PropsCalendario {
  ano: number;
  mes: number;
  selecionada?: DataISO | null;
  hoje: DataISO;
  aoSelecionar: (data: DataISO) => void;
  aoMudarMes: (ano: number, mes: number) => void;
  /** Se definido, só estes dias podem ser escolhidos. */
  diasDisponiveis?: Set<DataISO>;
  /** Pequeno ponto por baixo do número (ex.: dias com marcações). */
  diasMarcados?: Set<DataISO>;
  mesMinimo?: { ano: number; mes: number };
  mesMaximo?: { ano: number; mes: number };
  carregando?: boolean;
  corDestaque?: string;
}

function compararMes(a: { ano: number; mes: number }, b: { ano: number; mes: number }) {
  return a.ano * 12 + a.mes - (b.ano * 12 + b.mes);
}

export function Calendario({
  ano,
  mes,
  selecionada,
  hoje,
  aoSelecionar,
  aoMudarMes,
  diasDisponiveis,
  diasMarcados,
  mesMinimo,
  mesMaximo,
  carregando,
  corDestaque = "var(--color-escuro)",
}: PropsCalendario) {
  const primeiroDia = partesParaIso(ano, mes, 1);
  // Semana começa à segunda-feira.
  const deslocamento = (diaDaSemana(primeiroDia) + 6) % 7;
  const total = diasNoMes(ano, mes);
  const celulas: (DataISO | null)[] = [
    ...Array.from({ length: deslocamento }, () => null),
    ...Array.from({ length: total }, (_, i) => partesParaIso(ano, mes, i + 1)),
  ];

  const anterior = mesSeguinte(ano, mes, -1);
  const seguinte = mesSeguinte(ano, mes, 1);
  const podeRecuar = !mesMinimo || compararMes(anterior, mesMinimo) >= 0;
  const podeAvancar = !mesMaximo || compararMes(seguinte, mesMaximo) <= 0;

  return (
    <div className="w-full select-none" style={{ "--destaque": corDestaque } as CSSProperties}>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => aoMudarMes(anterior.ano, anterior.mes)}
          disabled={!podeRecuar}
          aria-label="Mês anterior"
          className="grid size-9 place-items-center rounded-full text-suave hover:bg-stone-100 hover:text-tinta disabled:opacity-30"
        >
          <IconeEsquerda />
        </button>
        <p className="text-[15px] font-semibold" aria-live="polite">
          {nomeDoMes(ano, mes)}
        </p>
        <button
          type="button"
          onClick={() => aoMudarMes(seguinte.ano, seguinte.mes)}
          disabled={!podeAvancar}
          aria-label="Mês seguinte"
          className="grid size-9 place-items-center rounded-full text-suave hover:bg-stone-100 hover:text-tinta disabled:opacity-30"
        >
          <IconeDireita />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-medium text-suave">
        {CABECALHO.map((letra, i) => (
          <span key={i} className="py-1.5" title={NOMES_COMPLETOS[i]}>
            {letra}
          </span>
        ))}
      </div>

      <div
        className={cn(
          "grid grid-cols-7 gap-y-1 transition-opacity",
          carregando && "pointer-events-none opacity-40",
        )}
      >
        {celulas.map((data, i) => {
          if (!data) return <span key={`v${i}`} />;
          const { dia } = isoParaPartes(data);
          const disponivel = diasDisponiveis ? diasDisponiveis.has(data) : true;
          const ativo = selecionada === data;
          const ehHoje = data === hoje;

          return (
            <div key={data} className="flex justify-center">
              <button
                type="button"
                disabled={!disponivel}
                onClick={() => aoSelecionar(data)}
                aria-pressed={ativo}
                aria-label={new Date(`${data}T12:00:00Z`).toLocaleDateString("pt-PT", {
                  timeZone: "UTC",
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
                className={cn(
                  "relative grid size-10 place-items-center rounded-full text-sm tabular-nums transition-colors",
                  ativo && "bg-(--destaque) font-semibold text-white",
                  !ativo && disponivel && "font-medium hover:bg-stone-100",
                  !ativo && disponivel && diasDisponiveis && "bg-stone-100/70",
                  !disponivel && "text-stone-300",
                  ehHoje && !ativo && "ring-1 ring-stone-300 ring-inset",
                )}
              >
                {dia}
                {diasMarcados?.has(data) && (
                  <span
                    className={cn(
                      "absolute bottom-1 size-1 rounded-full",
                      ativo ? "bg-white" : "bg-acento-500",
                    )}
                  />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
