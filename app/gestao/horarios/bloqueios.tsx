"use client";

/**
 * Fechar algumas horas num dia concreto (consulta, compromisso…) sem mexer
 * no resto do horário. As vagas que se sobrepõem deixam de aparecer.
 */

import { useState, useTransition, type FormEvent } from "react";
import { IconeLixo } from "@/components/icones";
import { Alerta, Botao, Campo, Cartao, classeInput, EstadoVazio } from "@/components/ui";
import { formatarDataLonga, formatarIntervalo } from "@/lib/formatar";
import { horaParaMin, type DataISO } from "@/lib/tempo";
import type { Bloqueio } from "@/lib/tipos";
import { criarBloqueio, removerBloqueio } from "../acoes";

export function Bloqueios({
  profissionalId,
  bloqueios,
  hoje,
}: {
  profissionalId: string;
  bloqueios: Bloqueio[];
  hoje: DataISO;
}) {
  const [aberto, setAberto] = useState(false);
  const [data, setData] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aGuardar, iniciar] = useTransition();

  const ordenados = [...bloqueios].sort((a, b) => a.data.localeCompare(b.data) || a.inicioMin - b.inicioMin);

  function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    if (fim <= inicio) return setErro("A hora de fim tem de ser depois da hora de início.");
    iniciar(async () => {
      const resposta = await criarBloqueio({
        profissionalId,
        data,
        inicioMin: horaParaMin(inicio),
        fimMin: horaParaMin(fim),
        motivo,
      });
      if (!resposta.ok) return setErro(resposta.erro);
      setAberto(false);
      setData("");
      setInicio("");
      setFim("");
      setMotivo("");
    });
  }

  return (
    <Cartao
      titulo="Fechar algumas horas"
      descricao="Para uma consulta, um compromisso ou um intervalo extra num dia concreto."
      acoes={
        !aberto && (
          <Botao variante="secundario" tamanho="sm" onClick={() => setAberto(true)}>
            Fechar horas
          </Botao>
        )
      }
    >
      {aberto && (
        <form onSubmit={guardar} className="mb-5 grid gap-4 rounded-xl bg-stone-50 p-4">
          <Campo rotulo="Dia">
            <input type="date" className={classeInput} min={hoje} value={data} onChange={(e) => setData(e.target.value)} required />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Das">
              <input type="time" step={300} className={classeInput} value={inicio} onChange={(e) => setInicio(e.target.value)} required />
            </Campo>
            <Campo rotulo="Até às">
              <input type="time" step={300} className={classeInput} value={fim} onChange={(e) => setFim(e.target.value)} required />
            </Campo>
          </div>
          <Campo rotulo={<>Motivo <span className="font-normal text-suave">(só tu vês)</span></>}>
            <input className={classeInput} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: Consulta médica" />
          </Campo>
          {erro && <Alerta>{erro}</Alerta>}
          <div className="flex justify-end gap-2">
            <Botao variante="fantasma" onClick={() => setAberto(false)}>
              Cancelar
            </Botao>
            <Botao type="submit" disabled={aGuardar}>
              Fechar estas horas
            </Botao>
          </div>
        </form>
      )}

      {!aberto && erro && (
        <div className="mb-4">
          <Alerta>{erro}</Alerta>
        </div>
      )}

      {ordenados.length === 0 ? (
        !aberto && <EstadoVazio titulo="Sem horas fechadas" />
      ) : (
        <ul className="grid gap-2">
          {ordenados.map((b) => (
            <li key={b.id} className="flex items-center gap-3 rounded-xl border border-linha px-3.5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{formatarDataLonga(b.data)}</p>
                <p className="text-sm text-suave">
                  <span className="tabular-nums">{formatarIntervalo(b.inicioMin, b.fimMin)}</span>
                  {b.motivo && ` · ${b.motivo}`}
                </p>
              </div>
              <button
                type="button"
                disabled={aGuardar}
                onClick={() =>
                  iniciar(async () => {
                    const resposta = await removerBloqueio(b.id, profissionalId);
                    if (!resposta.ok) setErro(resposta.erro);
                  })
                }
                aria-label="Remover"
                className="grid size-9 place-items-center rounded-lg text-suave hover:bg-red-50 hover:text-red-700"
              >
                <IconeLixo tamanho={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}
