"use client";

/**
 * Lista de serviços + formulário (em janela) para criar, editar, desativar
 * ou remover. A duração definida aqui é a que gera as vagas na página pública.
 * Os preços são editados em euros e guardados em cêntimos.
 */

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { Dialogo } from "@/components/dialogo";
import { IconeMais, IconeRelogio } from "@/components/icones";
import {
  Alerta,
  Avatar,
  Botao,
  Campo,
  Cartao,
  classeInput,
  cn,
  Distintivo,
  EstadoVazio,
  Interruptor,
} from "@/components/ui";
import { formatarDuracao, formatarPreco } from "@/lib/formatar";
import type { ModoVagas, Plano, Servico } from "@/lib/tipos";
import { guardarServico, removerServico, type DadosServico } from "../acoes";

const DURACOES = [10, 15, 20, 25, 30, 40, 45, 50, 60, 75, 90, 105, 120, 150, 180, 240];

interface Props {
  servicos: Servico[];
  profissionais: { id: string; nome: string; cor: string }[];
  plano: Plano;
  modoVagas: ModoVagas;
  intervaloFixoMin: number;
}

export function GestorServicos({ servicos, profissionais, plano, modoVagas, intervaloFixoMin }: Props) {
  const [emEdicao, setEmEdicao] = useState<DadosServico | null>(null);

  const novo = (): DadosServico => ({
    nome: "",
    descricao: "",
    duracaoMin: 30,
    precoCentimos: 0,
    ativo: true,
    profissionalIds: profissionais.map((p) => p.id),
  });

  return (
    <>
      <Cartao
        semPadding
        titulo={`${servicos.length} serviço${servicos.length === 1 ? "" : "s"}`}
        descricao={
          modoVagas === "intervalo_fixo"
            ? `As vagas começam a cada ${intervaloFixoMin} min; cada serviço ocupa o tempo da sua duração.`
            : "As vagas seguem a duração de cada serviço."
        }
        acoes={
          <Botao onClick={() => setEmEdicao(novo())}>
            <IconeMais tamanho={16} /> Novo serviço
          </Botao>
        }
      >
        {servicos.length === 0 ? (
          <div className="px-5 pb-5 sm:px-6 sm:pb-6">
            <EstadoVazio
              titulo="Ainda não tens serviços"
              descricao="Adiciona o primeiro serviço para os clientes poderem marcar."
            />
          </div>
        ) : (
          <ul className="divide-y divide-linha border-t border-linha">
            {servicos.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setEmEdicao({ ...s })}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-stone-50 sm:px-6"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("font-medium", !s.ativo && "text-suave")}>{s.nome}</span>
                      {!s.ativo && <Distintivo>Desativado</Distintivo>}
                    </div>
                    {s.descricao && <p className="mt-0.5 truncate text-sm text-suave">{s.descricao}</p>}
                    <p className="mt-1 inline-flex items-center gap-1 text-sm text-suave">
                      <IconeRelogio tamanho={14} /> {formatarDuracao(s.duracaoMin)}
                    </p>
                  </div>
                  {plano === "equipa" && (
                    <div className="hidden -space-x-2 sm:flex">
                      {profissionais
                        .filter((p) => s.profissionalIds.includes(p.id))
                        .map((p) => (
                          <span key={p.id} className="rounded-full ring-2 ring-white" title={p.nome}>
                            <Avatar nome={p.nome} cor={p.cor} tamanho="sm" />
                          </span>
                        ))}
                    </div>
                  )}
                  <span className="w-20 text-right font-semibold tabular-nums">{formatarPreco(s.precoCentimos)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      {emEdicao && (
        <FormularioServico
          inicial={emEdicao}
          profissionais={profissionais}
          plano={plano}
          aoFechar={() => setEmEdicao(null)}
        />
      )}
    </>
  );
}

function FormularioServico({
  inicial,
  profissionais,
  plano,
  aoFechar,
}: {
  inicial: DadosServico;
  profissionais: Props["profissionais"];
  plano: Plano;
  aoFechar: () => void;
}) {
  const [dados, setDados] = useState(inicial);
  const [preco, setPreco] = useState(inicial.precoCentimos ? (inicial.precoCentimos / 100).toFixed(2) : "");
  const [duracaoPersonalizada, setDuracaoPersonalizada] = useState(!DURACOES.includes(inicial.duracaoMin));
  const [erro, setErro] = useState<string | null>(null);
  const [confirmarRemocao, setConfirmarRemocao] = useState(false);
  const [aGuardar, iniciar] = useTransition();

  const alterar = <K extends keyof DadosServico>(campo: K, valor: DadosServico[K]) =>
    setDados((atual) => ({ ...atual, [campo]: valor }));

  function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
        // "12,50" → 1250 cêntimos (aceita vírgula ou ponto).
    const centimos = Math.round(Number(preco.replace(",", ".")) * 100);
    if (!Number.isFinite(centimos)) return setErro("Indica um preço válido.");
    setErro(null);
    iniciar(async () => {
      const resposta = await guardarServico({ ...dados, precoCentimos: centimos });
      if (resposta.ok) aoFechar();
      else setErro(resposta.erro);
    });
  }

  function remover() {
    if (!dados.id) return;
    const id = dados.id;
    iniciar(async () => {
      const resposta = await removerServico(id);
      if (resposta.ok) aoFechar();
      else {
        setErro(resposta.erro);
        setConfirmarRemocao(false);
      }
    });
  }

  return (
    <Dialogo titulo={inicial.id ? "Editar serviço" : "Novo serviço"} aoFechar={aoFechar}>
      <form onSubmit={guardar} className="grid gap-4">
        <Campo rotulo="Nome">
          <input
            className={classeInput}
            value={dados.nome}
            onChange={(e) => alterar("nome", e.target.value)}
            placeholder="Ex.: Corte de cabelo"
            required
            autoFocus
          />
        </Campo>
        <Campo rotulo={<>Descrição <span className="font-normal text-suave">(opcional)</span></>}>
          <input
            className={classeInput}
            value={dados.descricao}
            onChange={(e) => alterar("descricao", e.target.value)}
            maxLength={120}
            placeholder="Aparece por baixo do nome na página de marcação"
          />
        </Campo>
        <div className="grid grid-cols-2 gap-4">
          <Campo rotulo="Duração">
            {duracaoPersonalizada ? (
              <div className="relative">
                <input
                  type="number"
                  className={cn(classeInput, "pr-12")}
                  min={5}
                  max={600}
                  step={5}
                  value={dados.duracaoMin}
                  onChange={(e) => alterar("duracaoMin", Number(e.target.value))}
                  required
                />
                <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-suave">
                  min
                </span>
              </div>
            ) : (
              <select
                className={classeInput}
                value={dados.duracaoMin}
                onChange={(e) => {
                  if (e.target.value === "outra") setDuracaoPersonalizada(true);
                  else alterar("duracaoMin", Number(e.target.value));
                }}
              >
                {DURACOES.map((d) => (
                  <option key={d} value={d}>
                    {formatarDuracao(d)}
                  </option>
                ))}
                <option value="outra">Outra…</option>
              </select>
            )}
          </Campo>
          <Campo rotulo="Preço">
            <div className="relative">
              <input
                className={cn(classeInput, "pr-9")}
                inputMode="decimal"
                value={preco}
                onChange={(e) => setPreco(e.target.value.replace(/[^\d.,]/g, ""))}
                placeholder="0,00"
                required
              />
              <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-suave">€</span>
            </div>
          </Campo>
        </div>

        {plano === "equipa" && profissionais.length > 1 && (
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Quem faz este serviço</legend>
            <div className="flex flex-wrap gap-2">
              {profissionais.map((p) => {
                const marcado = dados.profissionalIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={marcado}
                    onClick={() =>
                      alterar(
                        "profissionalIds",
                        marcado
                          ? dados.profissionalIds.filter((id) => id !== p.id)
                          : [...dados.profissionalIds, p.id],
                      )
                    }
                    className={cn(
                      "flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm transition",
                      marcado ? "border-escuro bg-stone-50 font-medium" : "border-linha text-suave",
                    )}
                  >
                    <Avatar nome={p.nome} cor={p.cor} tamanho="sm" />
                    {p.nome}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <div className="flex items-center justify-between gap-4 rounded-xl bg-stone-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Disponível para marcação online</p>
            <p className="text-xs text-suave">Desativa sem apagar o histórico.</p>
          </div>
          <Interruptor ligado={dados.ativo} aoMudar={(v) => alterar("ativo", v)} rotulo="Disponível para marcação" />
        </div>

        {erro && <Alerta>{erro}</Alerta>}

        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          {inicial.id ? (
            confirmarRemocao ? (
              <span className="flex items-center gap-1">
                <Botao variante="perigo" tamanho="sm" onClick={remover} disabled={aGuardar}>
                  Sim, remover
                </Botao>
                <Botao variante="fantasma" tamanho="sm" onClick={() => setConfirmarRemocao(false)}>
                  Não
                </Botao>
              </span>
            ) : (
              <Botao variante="fantasma" tamanho="sm" className="text-red-700" onClick={() => setConfirmarRemocao(true)}>
                Remover serviço
              </Botao>
            )
          ) : (
            <Link href="/gestao/horarios" className="text-xs text-suave underline">
              Como são calculadas as vagas?
            </Link>
          )}
          <div className="ml-auto flex gap-2">
            <Botao variante="fantasma" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao type="submit" disabled={aGuardar}>
              {aGuardar ? "A guardar…" : "Guardar"}
            </Botao>
          </div>
        </div>
      </form>
    </Dialogo>
  );
}
