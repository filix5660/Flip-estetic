"use client";

/**
 * Componente reutilizável para editar os períodos de trabalho de um dia
 * (usado na semana normal e nos dias com horário diferente).
 * Trabalha com texto "HH:MM" no formulário e converte para minutos ao gravar.
 */

import { IconeLixo, IconeMais } from "@/components/icones";
import { classeInput, cn } from "@/components/ui";
import { horaParaMin, minParaHora } from "@/lib/tempo";
import type { Intervalo } from "@/lib/tipos";

export interface PeriodoTexto {
  inicio: string;
  fim: string;
}

export const paraTexto = (intervalos: Intervalo[]): PeriodoTexto[] =>
  intervalos.map((i) => ({ inicio: minParaHora(i.inicioMin), fim: minParaHora(i.fimMin) }));

export const paraIntervalos = (periodos: PeriodoTexto[]): Intervalo[] =>
  periodos
    .filter((p) => p.inicio && p.fim)
    .map((p) => ({ inicioMin: horaParaMin(p.inicio), fimMin: horaParaMin(p.fim) }));

/** Sugere o próximo período: 1 h depois do último, com 4 h de duração. */
function proximoPeriodo(periodos: PeriodoTexto[]): PeriodoTexto {
  const ultimo = periodos[periodos.length - 1];
  if (!ultimo) return { inicio: "09:00", fim: "13:00" };
  const inicio = Math.min(horaParaMin(ultimo.fim) + 60, 23 * 60);
  const fim = Math.min(inicio + 4 * 60, 23 * 60 + 55);
  return { inicio: minParaHora(inicio), fim: minParaHora(fim) };
}

/** Lista editável de períodos de trabalho de um dia. */
export function EditorPeriodos({
  periodos,
  aoMudar,
  rotuloDia,
}: {
  periodos: PeriodoTexto[];
  aoMudar: (novos: PeriodoTexto[]) => void;
  rotuloDia?: string;
}) {
  const atualizar = (indice: number, campo: keyof PeriodoTexto, valor: string) =>
    aoMudar(periodos.map((p, i) => (i === indice ? { ...p, [campo]: valor } : p)));

  return (
    <div className="grid gap-2">
      {periodos.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="time"
            step={300}
            className={cn(classeInput, "w-auto flex-1 py-2 tabular-nums sm:flex-none sm:w-32")}
            value={p.inicio}
            onChange={(e) => atualizar(i, "inicio", e.target.value)}
            aria-label={`${rotuloDia ?? ""} período ${i + 1}: início`}
            required
          />
          <span className="text-sm text-suave">até</span>
          <input
            type="time"
            step={300}
            className={cn(classeInput, "w-auto flex-1 py-2 tabular-nums sm:flex-none sm:w-32")}
            value={p.fim}
            onChange={(e) => atualizar(i, "fim", e.target.value)}
            aria-label={`${rotuloDia ?? ""} período ${i + 1}: fim`}
            required
          />
          <button
            type="button"
            onClick={() => aoMudar(periodos.filter((_, j) => j !== i))}
            aria-label={`Remover período ${i + 1}`}
            className="grid size-9 shrink-0 place-items-center rounded-lg text-suave hover:bg-red-50 hover:text-red-700"
          >
            <IconeLixo tamanho={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => aoMudar([...periodos, proximoPeriodo(periodos)])}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-acento-600 hover:bg-acento-50"
      >
        <IconeMais tamanho={15} />
        {periodos.length === 0 ? "Adicionar período" : "Adicionar período (depois de uma pausa)"}
      </button>
    </div>
  );
}
