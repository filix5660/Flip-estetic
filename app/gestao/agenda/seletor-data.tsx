"use client";

/**
 * Calendário da agenda: escolher um dia muda o URL (?data=…) e o servidor
 * volta a desenhar a página. Os pontos indicam dias com marcações.
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Calendario } from "@/components/calendario";
import { isoParaPartes, type DataISO } from "@/lib/tempo";

export function SeletorData({
  data,
  hoje,
  diasMarcados,
  profissionalId,
}: {
  data: DataISO;
  hoje: DataISO;
  diasMarcados: DataISO[];
  profissionalId?: string;
}) {
  const router = useRouter();
  const [aCarregar, iniciar] = useTransition();
  const inicial = isoParaPartes(data);
  const [mes, setMes] = useState({ ano: inicial.ano, mes: inicial.mes, para: data });

  // Se a data mudar por fora (setas, "Hoje"), o calendário acompanha.
  if (mes.para !== data) {
    setMes({ ano: inicial.ano, mes: inicial.mes, para: data });
  }

  return (
    <Calendario
      ano={mes.ano}
      mes={mes.mes}
      hoje={hoje}
      selecionada={data}
      diasMarcados={new Set(diasMarcados)}
      carregando={aCarregar}
      aoMudarMes={(ano, m) => setMes({ ano, mes: m, para: data })}
      aoSelecionar={(dia) => {
        const p = new URLSearchParams({ data: dia });
        if (profissionalId) p.set("profissional", profissionalId);
        iniciar(() => router.push(`/gestao/agenda?${p.toString()}`, { scroll: false }));
      }}
    />
  );
}
