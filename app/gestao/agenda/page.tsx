/**
 * Agenda do proprietário (Server Component).
 *
 * O estado vive no URL, para se poder partilhar/recarregar sem perder nada:
 *   ?data=YYYY-MM-DD      dia mostrado (por omissão, hoje)
 *   ?profissional=id      filtra um profissional (plano Equipa)
 *   ?nova=1&hora=HH:MM    abre o formulário de nova marcação
 *
 * Para cada profissional mostra a "linha do tempo" do dia (marcações, espaços
 * livres, pausas e bloqueios), calculada em `lib/disponibilidade.ts`.
 */

import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { IconeEsquerda, IconeDireita } from "@/components/icones";
import { Avatar, BotaoLink, CabecalhoPagina, Cartao, cn, Distintivo } from "@/components/ui";
import { diaNaAgenda, vagasDoDia, type DiaDoProfissional } from "@/lib/agendamento";
import { repo } from "@/lib/dados";
import {
  formatarDataLonga,
  formatarDuracao,
  formatarIntervalo,
  formatarPreco,
} from "@/lib/formatar";
import { obterNegocioAtual } from "@/lib/sessao";
import {
  agoraNoFuso,
  diasNoMes,
  ehDataValida,
  ehHoraValida,
  horaParaMin,
  isoParaPartes,
  mesSeguinte,
  minParaHora,
  partesParaIso,
  somarDias,
} from "@/lib/tempo";
import type { EstadoMarcacao } from "@/lib/tipos";
import { AcoesMarcacao } from "./acoes-marcacao";
import { NovaMarcacao } from "./nova-marcacao";
import { SeletorData } from "./seletor-data";

export const metadata: Metadata = { title: "Agenda" };

type Props = {
  searchParams: Promise<{ data?: string; profissional?: string; nova?: string; hora?: string }>;
};

const ESTADOS: Record<EstadoMarcacao, { rotulo: string; tom: "acento" | "verde" | "vermelho" | "neutro" }> = {
  confirmada: { rotulo: "Confirmada", tom: "acento" },
  concluida: { rotulo: "Concluída", tom: "verde" },
  falta: { rotulo: "Faltou", tom: "vermelho" },
  cancelada: { rotulo: "Cancelada", tom: "neutro" },
};

export default async function Agenda({ searchParams }: Props) {
  const negocio = await obterNegocioAtual();
  const filtros = await searchParams;
  const agora = agoraNoFuso(negocio.fusoHorario);
  const hoje = agora.data;
  const data = filtros.data && ehDataValida(filtros.data) ? filtros.data : hoje;

  const [profissionais, servicos, clientes] = await Promise.all([
    repo.profissionais.listar(negocio.id),
    repo.servicos.listar(negocio.id),
    repo.clientes.listar(negocio.id),
  ]);
  const ativos = profissionais.filter((p) => p.ativo);
  const filtroProfissional = ativos.find((p) => p.id === filtros.profissional)?.id;

  const dias = await diaNaAgenda(negocio, data, filtroProfissional);

  // Pontos no calendário: dias com marcações (mês anterior, atual e seguinte).
  const { ano, mes } = isoParaPartes(data);
  const anterior = mesSeguinte(ano, mes, -1);
  const seguinte = mesSeguinte(ano, mes, 1);
  const comMarcacoes = await repo.marcacoes.listar({
    negocioId: negocio.id,
    de: partesParaIso(anterior.ano, anterior.mes, 1),
    ate: partesParaIso(seguinte.ano, seguinte.mes, diasNoMes(seguinte.ano, seguinte.mes)),
    profissionalId: filtroProfissional,
  });
  const diasMarcados = [...new Set(comMarcacoes.filter((m) => m.estado !== "cancelada").map((m) => m.data))];

  // Formulário de nova marcação (aberto com ?nova=1, opcionalmente com hora e profissional).
  const servicosAtivos = servicos.filter((s) => s.ativo);
  const abrirNova = filtros.nova === "1" && servicosAtivos.length > 0;
  const horaInicial = filtros.hora && ehHoraValida(filtros.hora) ? horaParaMin(filtros.hora) : null;
  const profissionalInicial = filtroProfissional ?? ativos[0]?.id ?? null;
  const servicoInicial =
    servicosAtivos.find((s) => !profissionalInicial || s.profissionalIds.includes(profissionalInicial)) ??
    servicosAtivos[0];
  const vagasIniciais =
    abrirNova && servicoInicial
      ? await vagasDoDia(negocio, servicoInicial, profissionalInicial, data, { ignorarLimitesDoCliente: true })
      : [];

    // Monta o URL da agenda mantendo os filtros atuais e alterando só `extra`.
  const parametros = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const valores = { data, profissional: filtroProfissional, ...extra };
    for (const [chave, valor] of Object.entries(valores)) if (valor) p.set(chave, valor);
    return `/gestao/agenda?${p.toString()}`;
  };

  const totalDia = dias.reduce((s, d) => s + d.marcacoes.length, 0);

  return (
    <>
      <CabecalhoPagina
        titulo="Agenda"
        descricao="As marcações do dia, os horários livres e as pausas de cada profissional."
        acoes={
          servicosAtivos.length > 0 && (
            <BotaoLink href={parametros({ nova: "1" })} scroll={false}>
              Nova marcação
            </BotaoLink>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[19rem_1fr]">
        <div className="grid content-start gap-4">
          <Cartao>
            <SeletorData
              data={data}
              hoje={hoje}
              diasMarcados={diasMarcados}
              profissionalId={filtroProfissional}
            />
          </Cartao>

          {negocio.plano === "equipa" && ativos.length > 1 && (
            <Cartao titulo="Profissionais">
              <nav className="-mx-2 -mt-2 grid gap-0.5" aria-label="Filtrar por profissional">
                <FiltroLink href={parametros({ profissional: "" })} ativo={!filtroProfissional}>
                  <span className="grid size-7 place-items-center rounded-full bg-stone-100 text-xs">
                    {ativos.length}
                  </span>
                  Todos
                </FiltroLink>
                {ativos.map((p) => (
                  <FiltroLink key={p.id} href={parametros({ profissional: p.id })} ativo={filtroProfissional === p.id}>
                    <Avatar nome={p.nome} cor={p.cor} tamanho="sm" />
                    {p.nome}
                  </FiltroLink>
                ))}
              </nav>
            </Cartao>
          )}
        </div>

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">{formatarDataLonga(data)}</h2>
              <p className="text-sm text-suave">
                {totalDia === 0 ? "Sem marcações" : `${totalDia} marcação${totalDia === 1 ? "" : "ões"}`}
                {data === hoje && " · hoje"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {data !== hoje && (
                <BotaoLink href={parametros({ data: hoje })} variante="secundario" tamanho="sm">
                  Hoje
                </BotaoLink>
              )}
              <BotaoLink href={parametros({ data: somarDias(data, -1) })} variante="fantasma" tamanho="sm" aria-label="Dia anterior">
                <IconeEsquerda />
              </BotaoLink>
              <BotaoLink href={parametros({ data: somarDias(data, 1) })} variante="fantasma" tamanho="sm" aria-label="Dia seguinte">
                <IconeDireita />
              </BotaoLink>
            </div>
          </div>

          <div className={cn("grid gap-4", dias.length > 1 && "2xl:grid-cols-2")}>
            {dias.map((dia) => (
              <ColunaProfissional
                key={dia.profissional.id}
                dia={dia}
                mostrarNome={negocio.plano === "equipa"}
                minutoLimite={data < hoje ? Infinity : data === hoje ? agora.minutos : -1}
                linkNova={(hora) => parametros({ nova: "1", hora, profissional: dia.profissional.id })}
              />
            ))}
          </div>
        </div>
      </div>

      {abrirNova && servicoInicial && (
        <NovaMarcacao
          plano={negocio.plano}
          servicos={servicosAtivos.map((s) => ({
            id: s.id,
            nome: s.nome,
            duracaoMin: s.duracaoMin,
            precoCentimos: s.precoCentimos,
            profissionalIds: s.profissionalIds,
          }))}
          profissionais={ativos.map((p) => ({ id: p.id, nome: p.nome }))}
          clientes={clientes.map((c) => ({ nome: c.nome, telefone: c.telefone, email: c.email }))}
          inicial={{
            data,
            servicoId: servicoInicial.id,
            profissionalId: profissionalInicial,
            inicioMin: horaInicial,
            vagas: vagasIniciais,
          }}
          urlFechar={parametros({})}
        />
      )}
    </>
  );
}

function FiltroLink({ href, ativo, children }: { href: string; ativo: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "true" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm",
        ativo ? "bg-stone-100 font-medium" : "text-suave hover:bg-stone-50 hover:text-tinta",
      )}
    >
      {children}
    </Link>
  );
}

/** Cartão com o dia de um profissional: horário, linha do tempo e canceladas. */
function ColunaProfissional({
  dia,
  mostrarNome,
  minutoLimite,
  linkNova,
}: {
  dia: DiaDoProfissional;
  mostrarNome: boolean;
  /** Espaços livres que acabam antes deste minuto já passaram. */
  minutoLimite: number;
  linkNova: (hora: string) => string;
}) {
  const { profissional } = dia;
  const marcacoes = new Map(dia.marcacoes.map((m) => [m.id, m]));

  return (
    <Cartao semPadding className="overflow-hidden">
      {mostrarNome && (
        <div className="flex items-center gap-3 border-b border-linha px-5 py-3.5">
          <Avatar nome={profissional.nome} cor={profissional.cor} />
          <div className="min-w-0">
            <p className="truncate font-medium">{profissional.nome}</p>
            <p className="text-xs text-suave">
              {dia.periodos.length > 0
                ? dia.periodos.map((p) => formatarIntervalo(p.inicioMin, p.fimMin)).join(" · ")
                : "Não trabalha"}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-2 p-4 sm:p-5">
        {dia.periodos.length === 0 && dia.marcacoes.length === 0 && (
          <div className="rounded-xl bg-stone-50 px-4 py-6 text-center text-sm text-suave">
            {dia.diaEspecial ? (
              <>
                <span className="font-medium text-tinta">Folga</span>
                {dia.diaEspecial.motivo && ` · ${dia.diaEspecial.motivo}`}
              </>
            ) : (
              "Dia de descanso no horário semanal."
            )}{" "}
            <Link href="/gestao/horarios" className="underline hover:text-tinta">
              Alterar horários
            </Link>
          </div>
        )}

        {dia.linha.map((item) => {
          const chave = `${item.tipo}-${item.inicioMin}`;
          if (item.tipo === "pausa") {
            return (
              <div key={chave} className="flex items-center gap-3 px-1 py-1 text-xs text-suave">
                <span className="w-24 tabular-nums">{formatarIntervalo(item.inicioMin, item.fimMin)}</span>
                <span className="h-px flex-1 bg-linha" />
                Pausa
                <span className="h-px flex-1 bg-linha" />
              </div>
            );
          }

          if (item.tipo === "bloqueio") {
            return (
              <div
                key={chave}
                className="flex items-center gap-3 rounded-xl bg-[repeating-linear-gradient(135deg,var(--color-stone-100)_0_8px,transparent_8px_16px)] px-3.5 py-3 text-sm text-suave ring-1 ring-linha ring-inset"
              >
                <span className="w-24 shrink-0 tabular-nums">{formatarIntervalo(item.inicioMin, item.fimMin)}</span>
                Bloqueado{item.motivo && ` · ${item.motivo}`}
              </div>
            );
          }

          if (item.tipo === "livre") {
            const duracao = item.fimMin - item.inicioMin;
            return (
              <div
                key={chave}
                className="flex items-center gap-3 rounded-xl border border-dashed border-linha px-3.5 py-2.5 text-sm whitespace-nowrap text-suave"
              >
                <span className="w-24 shrink-0 tabular-nums">{formatarIntervalo(item.inicioMin, item.fimMin)}</span>
                <span className="min-w-0 flex-1 truncate">Livre · {formatarDuracao(duracao)}</span>
                {item.fimMin > minutoLimite && (
                  <Link
                    href={linkNova(minParaHora(Math.max(item.inicioMin, Math.ceil(minutoLimite / 5) * 5)))}
                    scroll={false}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-tinta hover:bg-stone-100"
                  >
                    + Marcar
                  </Link>
                )}
              </div>
            );
          }

          const m = marcacoes.get(item.marcacaoId);
          if (!m) return null;
          const estado = ESTADOS[m.estado];
          return (
            <article
              key={m.id}
              className={cn(
                "rounded-xl border border-linha bg-white p-3.5 shadow-cartao",
                m.estado !== "confirmada" && "bg-stone-50/60",
              )}
              style={{ borderLeft: `4px solid ${profissional.cor}` }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold tabular-nums">{formatarIntervalo(m.inicioMin, m.fimMin)}</p>
                  <p className={cn("mt-0.5 font-medium", m.estado === "falta" && "line-through decoration-red-300")}>
                    {m.cliente?.nome ?? "Cliente"}
                  </p>
                  <p className="text-sm text-suave">
                    {m.servico?.nome ?? "Serviço removido"} · {formatarPreco(m.precoCentimos)}
                  </p>
                  {m.cliente?.telefone && (
                    <a href={`tel:${m.cliente.telefone.replace(/\s/g, "")}`} className="text-sm text-suave hover:text-tinta">
                      {m.cliente.telefone}
                    </a>
                  )}
                  {m.notas && <p className="mt-1.5 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-900">{m.notas}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Distintivo tom={estado.tom}>{estado.rotulo}</Distintivo>
                  {m.origem === "manual" && <span className="text-[11px] text-suave">Marcada por ti</span>}
                </div>
              </div>
              <AcoesMarcacao id={m.id} estado={m.estado} />
            </article>
          );
        })}

        {dia.canceladas.length > 0 && (
          <details className="mt-1 text-sm">
            <summary className="cursor-pointer text-suave hover:text-tinta">
              {dia.canceladas.length} cancelada{dia.canceladas.length > 1 ? "s" : ""}
            </summary>
            <ul className="mt-2 grid gap-1.5">
              {dia.canceladas.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2 text-suave">
                  <span>
                    <span className="tabular-nums">{minParaHora(m.inicioMin)}</span> · {m.cliente?.nome} · {m.servico?.nome}
                  </span>
                  <AcoesMarcacao id={m.id} estado={m.estado} compacto />
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </Cartao>
  );
}
