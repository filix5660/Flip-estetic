/**
 * Painel: resumo do dia (marcações, faturação prevista, ocupação, próxima
 * marcação), o que falta hoje, os próximos 7 dias e o link de marcação.
 */

import Link from "next/link";
import { IconeDireita } from "@/components/icones";
import { LinkPublico } from "@/components/link-publico";
import { Avatar, BotaoLink, CabecalhoPagina, Cartao, Distintivo, EstadoVazio } from "@/components/ui";
import { detalharMarcacoes, diaNaAgenda } from "@/lib/agendamento";
import { repo } from "@/lib/dados";
import { intervalosSobrepoem, totalMinutos } from "@/lib/disponibilidade";
import { formatarDataCurta, formatarDataLonga, formatarIntervalo, formatarPreco } from "@/lib/formatar";
import { obterNegocioAtual } from "@/lib/sessao";
import { agoraNoFuso, diaDaSemana, minParaHora, somarDias } from "@/lib/tempo";

const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export default async function Painel() {
  const negocio = await obterNegocioAtual();
  const agora = agoraNoFuso(negocio.fusoHorario);
  const hoje = agora.data;

  const dia = await diaNaAgenda(negocio, hoje);
  const marcacoesHoje = dia.flatMap((d) => d.marcacoes);
  const faturacaoPrevista = marcacoesHoje
    .filter((m) => m.estado !== "falta")
    .reduce((soma, m) => soma + m.precoCentimos, 0);

  // Ocupação: minutos marcados dentro dos períodos de trabalho.
  const minutosAbertos = dia.reduce((soma, d) => soma + totalMinutos(d.periodos), 0);
  const minutosMarcados = dia.reduce(
    (soma, d) =>
      soma +
      d.marcacoes
        .filter((m) => d.periodos.some((p) => intervalosSobrepoem(p, m)))
        .reduce((s, m) => s + (m.fimMin - m.inicioMin), 0),
    0,
  );
  const ocupacao = minutosAbertos ? Math.round((minutosMarcados / minutosAbertos) * 100) : 0;

  const proximas = marcacoesHoje
    .filter((m) => m.estado === "confirmada" && m.fimMin > agora.minutos)
    .sort((a, b) => a.inicioMin - b.inicioMin);

  // Próximos 7 dias
  const semana = await repo.marcacoes.listar({
    negocioId: negocio.id,
    de: somarDias(hoje, 1),
    ate: somarDias(hoje, 7),
  });
  const semanaDetalhada = await detalharMarcacoes(negocio.id, semana);
  const porDia = Array.from({ length: 7 }, (_, i) => {
    const data = somarDias(hoje, i + 1);
    const doDia = semanaDetalhada.filter((m) => m.data === data && m.estado === "confirmada");
    return { data, total: doDia.length, valor: doDia.reduce((s, m) => s + m.precoCentimos, 0) };
  });
  const maximo = Math.max(1, ...porDia.map((d) => d.total));

  const indicadores = [
    { rotulo: "Marcações hoje", valor: String(marcacoesHoje.length) },
    { rotulo: "Faturação prevista", valor: formatarPreco(faturacaoPrevista) },
    { rotulo: "Ocupação do dia", valor: `${ocupacao}%` },
    {
      rotulo: "Próxima",
      valor: proximas[0] ? minParaHora(proximas[0].inicioMin) : "—",
      detalhe: proximas[0]?.cliente?.nome,
    },
  ];

  return (
    <>
      <CabecalhoPagina
        titulo={agora.minutos < 12 * 60 ? "Bom dia" : agora.minutos < 20 * 60 ? "Boa tarde" : "Boa noite"}
        descricao={formatarDataLonga(hoje)}
        acoes={<BotaoLink href="/gestao/agenda?nova=1">Nova marcação</BotaoLink>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {indicadores.map((i) => (
          <div key={i.rotulo} className="rounded-2xl border border-linha bg-superficie p-4 shadow-cartao sm:p-5">
            <p className="text-sm text-suave">{i.rotulo}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{i.valor}</p>
            {i.detalhe && <p className="mt-0.5 truncate text-sm text-suave">{i.detalhe}</p>}
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Cartao
          titulo="Ainda hoje"
          acoes={
            <Link href="/gestao/agenda" className="inline-flex items-center gap-1 text-sm font-medium text-suave hover:text-tinta">
              Ver agenda <IconeDireita tamanho={16} />
            </Link>
          }
        >
          {proximas.length === 0 ? (
            <EstadoVazio
              titulo="Sem mais marcações para hoje"
              descricao="Partilha o teu link para receberes novas marcações."
            />
          ) : (
            <ul className="-my-2 divide-y divide-linha">
              {proximas.slice(0, 6).map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-3">
                  <span className="w-24 shrink-0 text-sm font-medium tabular-nums">
                    {formatarIntervalo(m.inicioMin, m.fimMin)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{m.cliente?.nome ?? "Cliente"}</span>
                    <span className="block truncate text-sm text-suave">{m.servico?.nome}</span>
                  </span>
                  {negocio.plano === "equipa" && m.profissional && (
                    <Avatar nome={m.profissional.nome} cor={m.profissional.cor} tamanho="sm" />
                  )}
                  {m.inicioMin <= agora.minutos && <Distintivo tom="verde">A decorrer</Distintivo>}
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        <div className="grid content-start gap-6">
          <Cartao titulo="Próximos 7 dias">
            <ul className="grid gap-2.5">
              {porDia.map((d) => (
                <li key={d.data}>
                  <Link
                    href={`/gestao/agenda?data=${d.data}`}
                    className="group grid grid-cols-[4.5rem_1fr_2rem] items-center gap-3 text-sm"
                  >
                    <span className="text-suave group-hover:text-tinta">
                      {DIAS_CURTOS[diaDaSemana(d.data)]} {formatarDataCurta(d.data)}
                    </span>
                    <span className="h-2 overflow-hidden rounded-full bg-stone-100">
                      <span
                        className="block h-full rounded-full bg-acento-500"
                        style={{ width: `${(d.total / maximo) * 100}%` }}
                      />
                    </span>
                    <span className="text-right font-medium tabular-nums">{d.total}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Cartao>

          <Cartao titulo="O teu link de marcação" descricao="Põe-no na bio do Instagram, no Google e no WhatsApp.">
            <LinkPublico slug={negocio.slug} />
          </Cartao>
        </div>
      </div>
    </>
  );
}
