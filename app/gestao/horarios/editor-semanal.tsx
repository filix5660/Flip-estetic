"use client";

/**
 * Editor da semana normal de um profissional.
 *
 * Cada dia tem uma lista de períodos (ex.: 09:00–13:00 e 14:00–19:00). Os
 * espaços entre períodos são as pausas — o proprietário decide se as tem.
 * Dia sem períodos = não trabalha. Só grava ao carregar em "Guardar horário".
 */

import { useState, useTransition } from "react";
import { Alerta, Botao, Cartao, cn, Interruptor } from "@/components/ui";
import { totalMinutos, validarIntervalos } from "@/lib/disponibilidade";
import { formatarDuracao, NOMES_DIAS, ORDEM_DIAS } from "@/lib/formatar";
import type { HorarioSemanal } from "@/lib/tipos";
import { guardarHorarioSemanal } from "../acoes";
import { EditorPeriodos, paraIntervalos, paraTexto, type PeriodoTexto } from "./periodos";

type Semana = Record<number, PeriodoTexto[]>;

function semanaInicial(semanal: HorarioSemanal[]): Semana {
  const semana: Semana = {};
  for (const dia of ORDEM_DIAS) {
    semana[dia] = paraTexto(semanal.find((h) => h.diaSemana === dia)?.intervalos ?? []);
  }
  return semana;
}

export function EditorSemanal({
  profissionalId,
  semanal,
}: {
  profissionalId: string;
  semanal: HorarioSemanal[];
}) {
  const [semana, setSemana] = useState<Semana>(() => semanaInicial(semanal));
  const [guardado, setGuardado] = useState(() => JSON.stringify(semanaInicial(semanal)));
  // Guarda o último horário de cada dia para o repor se voltar a ativá-lo.
  const [memoria, setMemoria] = useState<Semana>({});
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);
  const [aGuardar, iniciar] = useTransition();

    // Validação em tempo real: o botão fica desativado enquanto houver erros.
  const alterado = JSON.stringify(semana) !== guardado;
  const problemas = Object.fromEntries(
    ORDEM_DIAS.map((dia) => [dia, validarIntervalos(paraIntervalos(semana[dia]))]),
  ) as Record<number, string | null>;
  const temProblemas = Object.values(problemas).some(Boolean);
  const horasSemana = ORDEM_DIAS.reduce((s, d) => s + totalMinutos(paraIntervalos(semana[d])), 0);

  function mudarDia(dia: number, periodos: PeriodoTexto[]) {
    setSemana((atual) => ({ ...atual, [dia]: periodos }));
    setMensagem(null);
  }

  function alternarDia(dia: number, trabalha: boolean) {
    if (trabalha) {
      const anterior = memoria[dia];
      mudarDia(dia, anterior?.length ? anterior : [{ inicio: "09:00", fim: "18:00" }]);
    } else {
      setMemoria((m) => ({ ...m, [dia]: semana[dia] }));
      mudarDia(dia, []);
    }
  }

  function aplicarATodos(origem: number) {
    setSemana((atual) => {
      const nova = { ...atual };
      for (const dia of ORDEM_DIAS) {
        if (dia !== origem && atual[dia].length > 0) nova[dia] = atual[origem].map((p) => ({ ...p }));
      }
      return nova;
    });
    setMensagem({ tipo: "sucesso", texto: `Copiado para todos os dias em que trabalhas. Não te esqueças de guardar.` });
  }

  function guardar() {
    setMensagem(null);
    iniciar(async () => {
      const resposta = await guardarHorarioSemanal(
        profissionalId,
        ORDEM_DIAS.map((dia) => ({ diaSemana: dia, intervalos: paraIntervalos(semana[dia]) })),
      );
      if (resposta.ok) {
        setGuardado(JSON.stringify(semana));
        setMensagem({ tipo: "sucesso", texto: "Horário guardado. As vagas já estão atualizadas." });
      } else {
        setMensagem({ tipo: "erro", texto: resposta.erro });
      }
    });
  }

  return (
    <Cartao
      titulo="Semana normal"
      descricao={
        <>
          Sem pausa? Usa um só período. Com pausa? Adiciona outro período depois dela.
          <span className="ml-1 font-medium text-tinta">{formatarDuracao(horasSemana)} por semana.</span>
        </>
      }
      semPadding
    >
      <ul className="divide-y divide-linha border-t border-linha">
        {ORDEM_DIAS.map((dia) => {
          const periodos = semana[dia];
          const trabalha = periodos.length > 0;
          return (
            <li key={dia} className="grid gap-3 px-5 py-4 sm:grid-cols-[11rem_1fr] sm:px-6">
              <div className="flex items-center justify-between gap-3 sm:items-start sm:justify-start sm:pt-1.5">
                <div className="flex items-center gap-3">
                  <Interruptor
                    ligado={trabalha}
                    aoMudar={(v) => alternarDia(dia, v)}
                    rotulo={`Trabalho à ${NOMES_DIAS[dia]}`}
                  />
                  <span className={cn("font-medium", !trabalha && "text-suave")}>{NOMES_DIAS[dia]}</span>
                </div>
              </div>
              {trabalha ? (
                <div className="grid gap-2">
                  <EditorPeriodos
                    periodos={periodos}
                    aoMudar={(p) => mudarDia(dia, p)}
                    rotuloDia={NOMES_DIAS[dia]}
                  />
                  {problemas[dia] && <p className="text-sm text-red-700">{problemas[dia]}</p>}
                  <button
                    type="button"
                    onClick={() => aplicarATodos(dia)}
                    className="w-fit px-2 text-xs text-suave underline-offset-2 hover:text-tinta hover:underline"
                  >
                    Usar este horário nos outros dias de trabalho
                  </button>
                </div>
              ) : (
                <p className="text-sm text-suave sm:pt-2">Não trabalho</p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 rounded-b-2xl border-t border-linha bg-white/95 px-5 py-3 backdrop-blur sm:px-6">
        {mensagem && (
          <div className="mr-auto">
            <Alerta tipo={mensagem.tipo}>{mensagem.texto}</Alerta>
          </div>
        )}
        {alterado && !mensagem && <span className="mr-auto text-sm text-amber-700">Tens alterações por guardar.</span>}
        <Botao onClick={guardar} disabled={!alterado || temProblemas || aGuardar}>
          {aGuardar ? "A guardar…" : "Guardar horário"}
        </Botao>
      </div>
    </Cartao>
  );
}
