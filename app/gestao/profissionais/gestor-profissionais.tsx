"use client";

/**
 * Equipa (plano Equipa) ou perfil (plano Solo).
 * Um novo profissional começa com o horário do primeiro e com todos os
 * serviços. Não é possível remover quem tem marcações futuras — desativa-se.
 */

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { Dialogo } from "@/components/dialogo";
import { IconeMais } from "@/components/icones";
import {
  Alerta,
  Avatar,
  Botao,
  BotaoLink,
  Campo,
  Cartao,
  classeInput,
  cn,
  Distintivo,
  Interruptor,
} from "@/components/ui";
import type { Plano, Profissional } from "@/lib/tipos";
import { guardarProfissional, removerProfissional, type DadosProfissional } from "../acoes";

const CORES = ["#8a6a4b", "#3f6b5c", "#9b4f63", "#4f5d9b", "#b0702a", "#5b7f2e", "#6b4f9b", "#2f6f8f", "#a04444", "#57534e"];

type ProfissionalComResumo = Profissional & { proximas: number; servicos: number };

export function GestorProfissionais({
  plano,
  maxProfissionais,
  profissionais,
}: {
  plano: Plano;
  maxProfissionais: number;
  profissionais: ProfissionalComResumo[];
}) {
  const [emEdicao, setEmEdicao] = useState<DadosProfissional | null>(null);
  const podeAdicionar = profissionais.length < maxProfissionais;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {profissionais.map((p) => (
          <Cartao key={p.id} className={cn(!p.ativo && "opacity-70")}>
            <div className="flex items-start gap-3">
              <Avatar nome={p.nome} cor={p.cor} tamanho="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.nome}</p>
                <p className="truncate text-sm text-suave">{p.cargo || "—"}</p>
              </div>
              {!p.ativo && <Distintivo>Inativo</Distintivo>}
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-stone-50 px-3 py-2">
                <dt className="text-xs text-suave">Próximas marcações</dt>
                <dd className="text-lg font-semibold tabular-nums">{p.proximas}</dd>
              </div>
              <div className="rounded-xl bg-stone-50 px-3 py-2">
                <dt className="text-xs text-suave">Serviços</dt>
                <dd className="text-lg font-semibold tabular-nums">{p.servicos}</dd>
              </div>
            </dl>
            <div className="mt-4 flex gap-2">
              <Botao
                variante="secundario"
                tamanho="sm"
                className="flex-1"
                onClick={() => setEmEdicao({ id: p.id, nome: p.nome, cargo: p.cargo, cor: p.cor, ativo: p.ativo })}
              >
                Editar
              </Botao>
              <BotaoLink href={`/gestao/horarios?profissional=${p.id}`} variante="secundario" tamanho="sm" className="flex-1">
                Horários
              </BotaoLink>
            </div>
          </Cartao>
        ))}

        {plano === "equipa" && podeAdicionar && (
          <button
            type="button"
            onClick={() => setEmEdicao({ nome: "", cargo: "", cor: CORES[profissionais.length % CORES.length], ativo: true })}
            className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-linha text-suave transition hover:border-stone-300 hover:bg-white hover:text-tinta"
          >
            <IconeMais tamanho={22} />
            <span className="font-medium">Adicionar profissional</span>
          </button>
        )}
      </div>

      {plano === "solo" && (
        <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-escuro p-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">A tua equipa está a crescer?</p>
            <p className="mt-1 text-sm text-stone-300">
              Com o plano Equipa, cada profissional tem a sua agenda e o cliente escolhe com quem quer marcar.
            </p>
          </div>
          <BotaoLink href="/gestao/definicoes" variante="secundario">
            Ver plano Equipa
          </BotaoLink>
        </div>
      )}

      {plano === "equipa" && !podeAdicionar && (
        <p className="mt-4 text-sm text-suave">
          Chegaste ao limite de {maxProfissionais} profissionais do teu plano.
        </p>
      )}

      {emEdicao && (
        <FormularioProfissional
          inicial={emEdicao}
          podeRemover={plano === "equipa" && profissionais.length > 1}
          aoFechar={() => setEmEdicao(null)}
        />
      )}
    </>
  );
}

function FormularioProfissional({
  inicial,
  podeRemover,
  aoFechar,
}: {
  inicial: DadosProfissional;
  podeRemover: boolean;
  aoFechar: () => void;
}) {
  const [dados, setDados] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [aGuardar, iniciar] = useTransition();

  function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    iniciar(async () => {
      const resposta = await guardarProfissional(dados);
      if (resposta.ok) aoFechar();
      else setErro(resposta.erro);
    });
  }

  function remover() {
    if (!dados.id) return;
    const id = dados.id;
    iniciar(async () => {
      const resposta = await removerProfissional(id);
      if (resposta.ok) aoFechar();
      else {
        setErro(resposta.erro);
        setConfirmar(false);
      }
    });
  }

  return (
    <Dialogo
      titulo={inicial.id ? "Editar profissional" : "Novo profissional"}
      descricao={!inicial.id ? "Começa com o mesmo horário do primeiro profissional e com todos os serviços. Podes ajustar depois." : undefined}
      aoFechar={aoFechar}
    >
      <form onSubmit={guardar} className="grid gap-4">
        <div className="flex items-center gap-4">
          <Avatar nome={dados.nome || "?"} cor={dados.cor} tamanho="lg" />
          <Campo rotulo="Nome" className="flex-1">
            <input
              className={classeInput}
              value={dados.nome}
              onChange={(e) => setDados({ ...dados, nome: e.target.value })}
              required
              autoFocus
            />
          </Campo>
        </div>
        <Campo rotulo={<>Função <span className="font-normal text-suave">(opcional)</span></>}>
          <input
            className={classeInput}
            value={dados.cargo}
            onChange={(e) => setDados({ ...dados, cargo: e.target.value })}
            placeholder="Ex.: Barbeiro, Cabeleireira, Esteticista"
          />
        </Campo>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Cor na agenda</legend>
          <div className="flex flex-wrap gap-2">
            {CORES.map((cor) => (
              <button
                key={cor}
                type="button"
                onClick={() => setDados({ ...dados, cor })}
                aria-label={`Cor ${cor}`}
                aria-pressed={dados.cor === cor}
                className={cn(
                  "size-8 rounded-full ring-offset-2 transition",
                  dados.cor === cor ? "ring-2 ring-escuro" : "hover:scale-110",
                )}
                style={{ backgroundColor: cor }}
              />
            ))}
          </div>
        </fieldset>
        {inicial.id && (
          <div className="flex items-center justify-between gap-4 rounded-xl bg-stone-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Ativo</p>
              <p className="text-xs text-suave">Inativo: deixa de aparecer na página de marcação.</p>
            </div>
            <Interruptor ligado={dados.ativo} aoMudar={(ativo) => setDados({ ...dados, ativo })} rotulo="Ativo" />
          </div>
        )}

        {erro && <Alerta>{erro}</Alerta>}

        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          {inicial.id && podeRemover ? (
            confirmar ? (
              <span className="flex gap-1">
                <Botao variante="perigo" tamanho="sm" onClick={remover} disabled={aGuardar}>
                  Sim, remover
                </Botao>
                <Botao variante="fantasma" tamanho="sm" onClick={() => setConfirmar(false)}>
                  Não
                </Botao>
              </span>
            ) : (
              <Botao variante="fantasma" tamanho="sm" className="text-red-700" onClick={() => setConfirmar(true)}>
                Remover
              </Botao>
            )
          ) : (
            <Link href="/gestao/horarios" className="text-xs text-suave underline">
              Horários de cada profissional
            </Link>
          )}
          <div className="ml-auto flex gap-2">
            <Botao variante="fantasma" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao type="submit" disabled={aGuardar}>
              Guardar
            </Botao>
          </div>
        </div>
      </form>
    </Dialogo>
  );
}
