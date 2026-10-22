"use client";

/**
 * Folgas, férias, feriados ou horário diferente num intervalo de datas.
 * Nessas datas substituem por completo a semana normal. Se já houver marcações
 * no período, o servidor devolve um aviso (as marcações não são apagadas).
 */

import { useState, useTransition, type FormEvent } from "react";
import { IconeLixo } from "@/components/icones";
import { Alerta, Botao, Campo, Cartao, classeInput, cn, Distintivo, EstadoVazio } from "@/components/ui";
import { validarIntervalos } from "@/lib/disponibilidade";
import { formatarDataCurta, formatarIntervalo } from "@/lib/formatar";
import { diasEntre, type DataISO } from "@/lib/tempo";
import type { DiaEspecial } from "@/lib/tipos";
import { criarDiaEspecial, removerDiaEspecial } from "../acoes";
import { EditorPeriodos, paraIntervalos, type PeriodoTexto } from "./periodos";

export function DiasEspeciais({
  profissionalId,
  dias,
  hoje,
}: {
  profissionalId: string;
  dias: DiaEspecial[];
  hoje: DataISO;
}) {
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<"folga" | "horario">("folga");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [periodos, setPeriodos] = useState<PeriodoTexto[]>([{ inicio: "10:00", fim: "14:00" }]);
  const [motivo, setMotivo] = useState("");
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "aviso" | "sucesso"; texto: string } | null>(null);
  const [aGuardar, iniciar] = useTransition();

  const ordenados = [...dias].sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));

  function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const intervalos = tipo === "folga" ? [] : paraIntervalos(periodos);
    if (tipo === "horario") {
      if (intervalos.length === 0) return setMensagem({ tipo: "erro", texto: "Adiciona pelo menos um período." });
      const problema = validarIntervalos(intervalos);
      if (problema) return setMensagem({ tipo: "erro", texto: problema });
    }
    iniciar(async () => {
      const resposta = await criarDiaEspecial({
        profissionalId,
        dataInicio,
        dataFim: dataFim || dataInicio,
        intervalos,
        motivo,
      });
      if (!resposta.ok) return setMensagem({ tipo: "erro", texto: resposta.erro });
      setMensagem(
        resposta.dados.aviso
          ? { tipo: "aviso", texto: resposta.dados.aviso }
          : { tipo: "sucesso", texto: "Guardado." },
      );
      setAberto(false);
      setDataInicio("");
      setDataFim("");
      setMotivo("");
    });
  }

  function remover(id: string) {
    iniciar(async () => {
      const resposta = await removerDiaEspecial(id, profissionalId);
      if (!resposta.ok) setMensagem({ tipo: "erro", texto: resposta.erro });
    });
  }

  return (
    <Cartao
      titulo="Folgas, férias e dias diferentes"
      descricao="Substituem a semana normal nas datas que escolheres."
      acoes={
        !aberto && (
          <Botao variante="secundario" tamanho="sm" onClick={() => setAberto(true)}>
            Adicionar
          </Botao>
        )
      }
    >
      {aberto && (
        <form onSubmit={guardar} className="mb-5 grid gap-4 rounded-xl bg-stone-50 p-4">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-200/60 p-1 text-sm">
            {(
              [
                ["folga", "Não trabalho"],
                ["horario", "Horário diferente"],
              ] as const
            ).map(([valor, rotulo]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setTipo(valor)}
                aria-pressed={tipo === valor}
                className={cn(
                  "rounded-lg py-1.5 font-medium transition",
                  tipo === valor ? "bg-white shadow-cartao" : "text-suave",
                )}
              >
                {rotulo}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="De">
              <input
                type="date"
                className={classeInput}
                min={hoje}
                value={dataInicio}
                onChange={(e) => {
                  setDataInicio(e.target.value);
                  if (!dataFim || dataFim < e.target.value) setDataFim(e.target.value);
                }}
                required
              />
            </Campo>
            <Campo rotulo="Até">
              <input
                type="date"
                className={classeInput}
                min={dataInicio || hoje}
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </Campo>
          </div>
          {tipo === "horario" && (
            <div className="grid gap-1.5">
              <span className="text-sm font-medium">Nesses dias trabalho</span>
              <EditorPeriodos periodos={periodos} aoMudar={setPeriodos} />
            </div>
          )}
          <Campo rotulo={<>Motivo <span className="font-normal text-suave">(só tu vês)</span></>}>
            <input
              className={classeInput}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={tipo === "folga" ? "Ex.: Férias, feriado, formação" : "Ex.: Abertura especial de Natal"}
            />
          </Campo>
          <div className="flex justify-end gap-2">
            <Botao variante="fantasma" onClick={() => setAberto(false)}>
              Cancelar
            </Botao>
            <Botao type="submit" disabled={aGuardar}>
              Guardar
            </Botao>
          </div>
        </form>
      )}

      {mensagem && (
        <div className="mb-4">
          <Alerta tipo={mensagem.tipo}>{mensagem.texto}</Alerta>
        </div>
      )}

      {ordenados.length === 0 ? (
        !aberto && <EstadoVazio titulo="Nada agendado" descricao="Marca aqui as tuas férias, feriados ou dias com horário especial." />
      ) : (
        <ul className="grid gap-2">
          {ordenados.map((d) => {
            const nDias = diasEntre(d.dataInicio, d.dataFim) + 1;
            return (
              <li key={d.id} className="flex items-center gap-3 rounded-xl border border-linha px-3.5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {formatarDataCurta(d.dataInicio)}
                    {nDias > 1 && ` – ${formatarDataCurta(d.dataFim)}`}
                    <span className="font-normal text-suave"> · {nDias} dia{nDias > 1 ? "s" : ""}</span>
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-suave">
                    {d.intervalos.length === 0 ? (
                      <Distintivo tom="ambar">Não trabalha</Distintivo>
                    ) : (
                      <Distintivo tom="azul">
                        {d.intervalos.map((i) => formatarIntervalo(i.inicioMin, i.fimMin)).join(" · ")}
                      </Distintivo>
                    )}
                    {d.motivo}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remover(d.id)}
                  disabled={aGuardar}
                  aria-label="Remover"
                  className="grid size-9 place-items-center rounded-lg text-suave hover:bg-red-50 hover:text-red-700"
                >
                  <IconeLixo tamanho={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Cartao>
  );
}
