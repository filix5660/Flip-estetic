"use client";

/**
 * Fluxo de marcação do cliente (Client Component).
 *
 * Passos: serviço → profissional (só no plano Equipa e se houver mais de um)
 * → dia → hora → dados → confirmado.
 *
 * Notas de implementação:
 * - Os dados são carregados nos próprios handlers (ao escolher serviço, mês ou
 *   dia) e não em useEffect, para evitar pedidos duplicados e efeitos em cadeia.
 * - `pedidoAtual` numera cada pedido: se o cliente mudar de opção antes da
 *   resposta chegar, a resposta antiga é ignorada.
 * - A confirmação volta a validar a vaga no servidor; se entretanto foi ocupada,
 *   o cliente regressa à escolha da hora com as vagas atualizadas.
 * - Os dados do cliente podem ficar guardados no localStorage (opcional) para
 *   preencher automaticamente a próxima marcação.
 */

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Calendario } from "@/components/calendario";
import {
  IconeAgenda,
  IconeCalendarioMais,
  IconeEsquerda,
  IconeRelogio,
  IconeVisto,
} from "@/components/icones";
import { Alerta, Avatar, Botao, Campo, classeInput, cn } from "@/components/ui";
import type { Vaga } from "@/lib/agendamento";
import { formatarDataLonga, formatarDuracao, formatarPreco } from "@/lib/formatar";
import { isoParaPartes, mesSeguinte, minParaHora, somarDias, type DataISO } from "@/lib/tempo";
import type { NegocioPublico, ProfissionalPublico, ServicoPublico } from "@/lib/tipos";
import { emailValido, telefoneValido } from "@/lib/validar";
import { carregarDiasComVaga, carregarHorarios, confirmarMarcacao } from "./acoes";

type Passo = "servico" | "profissional" | "data" | "hora" | "dados" | "feito";

const ROTULOS: Record<Passo, string> = {
  servico: "Serviço",
  profissional: "Profissional",
  data: "Dia",
  hora: "Hora",
  dados: "Os teus dados",
  feito: "Confirmado",
};

const CHAVE_DADOS = "flip:dados-cliente";

interface Props {
  negocio: NegocioPublico;
  servicos: ServicoPublico[];
  profissionais: ProfissionalPublico[];
  hoje: DataISO;
}

export function FluxoMarcacao({ negocio, servicos, profissionais, hoje }: Props) {
  const [passo, setPasso] = useState<Passo>("servico");
  const [servico, setServico] = useState<ServicoPublico | null>(null);
  const [profissionalId, setProfissionalId] = useState<string | null>(null);
  const [data, setData] = useState<DataISO | null>(null);
  const [inicioMin, setInicioMin] = useState<number | null>(null);

  const partesHoje = isoParaPartes(hoje);
  const ultimoDia = isoParaPartes(somarDias(hoje, negocio.janelaMarcacaoDias));
  const [mes, setMes] = useState({ ano: partesHoje.ano, mes: partesHoje.mes });
  const [dias, setDias] = useState<Set<DataISO> | null>(null);
  const [vagas, setVagas] = useState<Vaga[] | null>(null);
  const [carregando, setCarregando] = useState(false);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [notas, setNotas] = useState("");
  const [lembrar, setLembrar] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmacao, setConfirmacao] = useState<{ profissionalNome: string } | null>(null);

  // Ignora respostas antigas quando o cliente muda de opção rapidamente.
  const pedidoAtual = useRef(0);

    // Passos visíveis: o de profissional só aparece quando há escolha a fazer.
  const profissionaisDoServico = servico
    ? profissionais.filter((p) => servico.profissionalIds.includes(p.id))
    : [];
  const escolheProfissional = negocio.plano === "equipa" && profissionaisDoServico.length > 1;
  const passos: Passo[] = [
    "servico",
    ...(escolheProfissional ? (["profissional"] as const) : []),
    "data",
    "hora",
    "dados",
  ];
  const indicePasso = passos.indexOf(passo);
  const profissional = profissionais.find((p) => p.id === profissionalId) ?? null;

  // ───────── Carregamento de dados ─────────

    /**
     * Carrega os dias com vaga de um mês. Com `procurarSeguinte`, se o mês
     * atual não tiver vagas (ex.: estamos no fim do mês), salta para o seguinte.
     */
  async function carregarDias(
    ano: number,
    m: number,
    servicoId: string,
    profId: string | null,
    procurarSeguinte = false,
  ) {
    const id = ++pedidoAtual.current;
    setMes({ ano, mes: m });
    setCarregando(true);
    setErro(null);
    const resposta = await carregarDiasComVaga(negocio.slug, servicoId, profId, ano, m);
    if (id !== pedidoAtual.current) return;

    if (!resposta.ok) {
      setErro(resposta.erro);
      setDias(new Set());
    } else if (resposta.dados.length === 0 && procurarSeguinte) {
      // Mês sem vagas: salta automaticamente para o seguinte (dentro da janela).
      const seguinte = mesSeguinte(ano, m, 1);
      if (seguinte.ano * 12 + seguinte.mes <= ultimoDia.ano * 12 + ultimoDia.mes) {
        return carregarDias(seguinte.ano, seguinte.mes, servicoId, profId, false);
      }
      setDias(new Set());
    } else {
      setDias(new Set(resposta.dados));
    }
    setCarregando(false);
  }

  async function carregarVagas(dia: DataISO) {
    if (!servico) return;
    const id = ++pedidoAtual.current;
    setCarregando(true);
    setVagas(null);
    setErro(null);
    const resposta = await carregarHorarios(negocio.slug, servico.id, profissionalId, dia);
    if (id !== pedidoAtual.current) return;
    if (resposta.ok) setVagas(resposta.dados);
    else setErro(resposta.erro);
    setCarregando(false);
  }

  // ───────── Navegação ─────────

  function irParaData(servicoId: string, profId: string | null) {
    setPasso("data");
    setDias(null);
    void carregarDias(partesHoje.ano, partesHoje.mes, servicoId, profId, true);
  }

  function escolherServico(escolhido: ServicoPublico) {
    setServico(escolhido);
    setData(null);
    setInicioMin(null);
    const doServico = profissionais.filter((p) => escolhido.profissionalIds.includes(p.id));
    if (negocio.plano === "equipa" && doServico.length > 1) {
      setProfissionalId(null);
      setPasso("profissional");
    } else {
      const unico = doServico[0]?.id ?? null;
      setProfissionalId(unico);
      irParaData(escolhido.id, unico);
    }
  }

  function escolherProfissional(id: string | null) {
    if (!servico) return;
    setProfissionalId(id);
    setData(null);
    setInicioMin(null);
    irParaData(servico.id, id);
  }

  function escolherData(dia: DataISO) {
    setData(dia);
    setInicioMin(null);
    setPasso("hora");
    void carregarVagas(dia);
  }

  function escolherHora(minutos: number) {
    setInicioMin(minutos);
    setPasso("dados");
    setErro(null);
    try {
      const guardado = JSON.parse(localStorage.getItem(CHAVE_DADOS) ?? "null");
      if (guardado && !nome && !telefone) {
        setNome(guardado.nome ?? "");
        setTelefone(guardado.telefone ?? "");
        setEmail(guardado.email ?? "");
      }
    } catch {
      // armazenamento indisponível: o cliente preenche à mão
    }
  }

  function voltar() {
    setErro(null);
    const anterior = passos[indicePasso - 1];
    if (!anterior) return;
    if (anterior === "data" && servico) {
      setPasso("data");
      if (!dias) void carregarDias(mes.ano, mes.mes, servico.id, profissionalId);
      return;
    }
    setPasso(anterior);
  }

  function irPara(alvo: Passo) {
    if (passos.indexOf(alvo) < indicePasso) {
      setErro(null);
      setPasso(alvo);
    }
  }

  function recomecar() {
    setPasso("servico");
    setServico(null);
    setProfissionalId(null);
    setData(null);
    setInicioMin(null);
    setDias(null);
    setVagas(null);
    setNotas("");
    setConfirmacao(null);
    setErro(null);
  }

  async function confirmar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!servico || !data || inicioMin === null) return;

    if (!telefoneValido(telefone)) return setErro("Indica um número de telefone válido.");
    if (email && !emailValido(email)) return setErro("O email não parece válido.");

    setEnviando(true);
    setErro(null);
    const resposta = await confirmarMarcacao(negocio.slug, {
      servicoId: servico.id,
      profissionalId,
      data,
      inicioMin,
      nome,
      telefone,
      email,
      notas,
    });
    setEnviando(false);

    if (!resposta.ok) {
      setErro(resposta.erro);
      // Se o horário foi ocupado entretanto, volta à escolha da hora com vagas novas.
      if (resposta.erro.includes("horário")) {
        setPasso("hora");
        void carregarVagas(data);
      }
      return;
    }

    try {
      if (lembrar) localStorage.setItem(CHAVE_DADOS, JSON.stringify({ nome, telefone, email }));
      else localStorage.removeItem(CHAVE_DADOS);
    } catch {
      // sem armazenamento local
    }
    setConfirmacao({ profissionalNome: resposta.dados.profissionalNome });
    setPasso("feito");
  }

  // ───────── Interface ─────────

  if (servicos.length === 0) {
    return (
      <Painel>
        <p className="py-8 text-center text-suave">
          De momento não há serviços disponíveis para marcação online.
          {negocio.telefone && ` Contacta-nos pelo ${negocio.telefone}.`}
        </p>
      </Painel>
    );
  }

  if (passo === "feito" && servico && data && inicioMin !== null) {
    return (
      <Painel>
        <div className="animate-entrar py-4 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <IconeVisto tamanho={28} />
          </span>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">Marcação confirmada!</h2>
          <p className="mt-1 text-suave">Até breve, {nome.split(" ")[0]}.</p>
        </div>

        <Resumo
          servico={servico}
          profissionalNome={confirmacao?.profissionalNome || profissional?.nome}
          data={data}
          inicioMin={inicioMin}
        />

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Botao
            variante="secundario"
            tamanho="lg"
            onClick={() => descarregarIcs(negocio, servico, data, inicioMin)}
          >
            <IconeCalendarioMais /> Adicionar ao calendário
          </Botao>
          <Botao tamanho="lg" onClick={recomecar} className="bg-(--marca) text-(--marca-texto) hover:opacity-90">
            Fazer outra marcação
          </Botao>
        </div>
        {negocio.telefone && (
          <p className="mt-5 text-center text-sm text-suave">
            Precisas de alterar ou cancelar? Liga para{" "}
            <a className="font-medium text-tinta underline" href={`tel:${negocio.telefone.replace(/\s/g, "")}`}>
              {negocio.telefone}
            </a>
            .
          </p>
        )}
      </Painel>
    );
  }

  return (
    <Painel>
      {/* Progresso */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3">
          {indicePasso > 0 ? (
            <button
              type="button"
              onClick={voltar}
              className="-ml-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-suave hover:bg-stone-100 hover:text-tinta"
            >
              <IconeEsquerda tamanho={16} /> Voltar
            </button>
          ) : (
            <span className="text-sm text-suave">Marcação online</span>
          )}
          <span className="text-sm text-suave">
            Passo {indicePasso + 1} de {passos.length}
          </span>
        </div>
        <ol className="mt-3 flex gap-1.5" aria-label="Progresso da marcação">
          {passos.map((p, i) => (
            <li key={p} className="flex-1">
              <button
                type="button"
                onClick={() => irPara(p)}
                disabled={i >= indicePasso}
                aria-current={i === indicePasso ? "step" : undefined}
                aria-label={ROTULOS[p]}
                className={cn(
                  "block h-1.5 w-full rounded-full transition-colors",
                  i <= indicePasso ? "bg-(--marca)" : "bg-stone-200",
                )}
              />
            </li>
          ))}
        </ol>
      </div>

      {/* Escolhas feitas até agora */}
      {servico && passo !== "servico" && (
        <div className="mb-6 flex flex-wrap gap-2">
          <Escolha onClick={() => irPara("servico")}>{servico.nome}</Escolha>
          {escolheProfissional && passo !== "profissional" && (
            <Escolha onClick={() => irPara("profissional")}>
              {profissional?.nome ?? "Sem preferência"}
            </Escolha>
          )}
          {data && (passo === "hora" || passo === "dados") && (
            <Escolha onClick={() => irPara("data")}>
              {formatarDataLonga(data)}
            </Escolha>
          )}
          {inicioMin !== null && passo === "dados" && (
            <Escolha onClick={() => irPara("hora")}>{minParaHora(inicioMin)}</Escolha>
          )}
        </div>
      )}

      {erro && (
        <div className="mb-4">
          <Alerta>{erro}</Alerta>
        </div>
      )}

      <div key={passo} className="animate-entrar">
        {passo === "servico" && (
          <>
            <Titulo>Que serviço queres marcar?</Titulo>
            <ul className="grid gap-2.5">
              {servicos.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => escolherServico(s)}
                    className="group flex w-full items-center justify-between gap-4 rounded-xl border border-linha bg-white p-4 text-left transition hover:border-stone-300 hover:shadow-cartao"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium">{s.nome}</span>
                      {s.descricao && (
                        <span className="mt-0.5 block text-sm text-suave">{s.descricao}</span>
                      )}
                      <span className="mt-1.5 inline-flex items-center gap-1 text-sm text-suave">
                        <IconeRelogio tamanho={14} /> {formatarDuracao(s.duracaoMin)}
                      </span>
                    </span>
                    <span className="shrink-0 text-right font-semibold tabular-nums">
                      {formatarPreco(s.precoCentimos)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {passo === "profissional" && (
          <>
            <Titulo>Com quem queres marcar?</Titulo>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              <li>
                <OpcaoProfissional
                  nome="Sem preferência"
                  descricao="Mostramos todas as vagas"
                  onClick={() => escolherProfissional(null)}
                  avatar={
                    <span className="grid size-12 place-items-center rounded-full bg-stone-100 text-suave">
                      <IconeAgenda />
                    </span>
                  }
                />
              </li>
              {profissionaisDoServico.map((p) => (
                <li key={p.id}>
                  <OpcaoProfissional
                    nome={p.nome}
                    descricao={p.cargo}
                    onClick={() => escolherProfissional(p.id)}
                    avatar={<Avatar nome={p.nome} cor={p.cor} tamanho="lg" />}
                  />
                </li>
              ))}
            </ul>
          </>
        )}

        {passo === "data" && servico && (
          <>
            <Titulo>Escolhe o dia</Titulo>
            <div className="mx-auto max-w-sm">
              <Calendario
                ano={mes.ano}
                mes={mes.mes}
                hoje={hoje}
                selecionada={data}
                diasDisponiveis={dias ?? new Set()}
                carregando={carregando || !dias}
                mesMinimo={{ ano: partesHoje.ano, mes: partesHoje.mes }}
                mesMaximo={{ ano: ultimoDia.ano, mes: ultimoDia.mes }}
                corDestaque="var(--marca)"
                aoSelecionar={escolherData}
                aoMudarMes={(ano, m) => carregarDias(ano, m, servico.id, profissionalId)}
              />
              {dias && !carregando && dias.size === 0 && (
                <p className="mt-4 text-center text-sm text-suave">
                  Não há vagas neste mês. Experimenta o mês seguinte.
                </p>
              )}
            </div>
          </>
        )}

        {passo === "hora" && data && (
          <>
            <Titulo>
              Escolhe a hora <span className="font-normal text-suave">· {formatarDuracao(servico?.duracaoMin ?? 0)}</span>
            </Titulo>
            {!vagas || carregando ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" aria-busy>
                {Array.from({ length: 10 }, (_, i) => (
                  <span key={i} className="h-11 animate-pulse rounded-xl bg-stone-100" />
                ))}
              </div>
            ) : vagas.length === 0 ? (
              <div className="rounded-xl border border-dashed border-linha p-6 text-center text-suave">
                Este dia ficou sem vagas.{" "}
                <button type="button" className="font-medium text-tinta underline" onClick={() => irPara("data")}>
                  Escolher outro dia
                </button>
              </div>
            ) : (
              <div className="grid gap-5">
                {agruparPorPeriodo(vagas).map(([periodo, lista]) => (
                  <div key={periodo}>
                    <p className="mb-2 text-xs font-semibold tracking-wider text-suave uppercase">{periodo}</p>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {lista.map((v) => (
                        <button
                          key={v.inicioMin}
                          type="button"
                          onClick={() => escolherHora(v.inicioMin)}
                          className={cn(
                            "h-11 rounded-xl border text-sm font-medium tabular-nums transition",
                            inicioMin === v.inicioMin
                              ? "border-transparent bg-(--marca) text-(--marca-texto)"
                              : "border-linha bg-white hover:border-stone-400",
                          )}
                        >
                          {minParaHora(v.inicioMin)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {passo === "dados" && servico && data && inicioMin !== null && (
          <>
            <Titulo>Só falta saber quem és</Titulo>
            <Resumo servico={servico} profissionalNome={profissional?.nome} data={data} inicioMin={inicioMin} />
            <form onSubmit={confirmar} className="mt-6 grid gap-4">
              <Campo rotulo="Nome">
                <input
                  className={classeInput}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  autoComplete="name"
                  required
                  minLength={2}
                />
              </Campo>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo rotulo="Telemóvel" ajuda="Para te lembrarmos da marcação.">
                  <input
                    className={classeInput}
                    type="tel"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    autoComplete="tel"
                    placeholder="+351 9xx xxx xxx"
                    required
                  />
                </Campo>
                <Campo rotulo={<>Email <span className="font-normal text-suave">(opcional)</span></>}>
                  <input
                    className={classeInput}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </Campo>
              </div>
              <Campo rotulo={<>Observações <span className="font-normal text-suave">(opcional)</span></>}>
                <textarea
                  className={cn(classeInput, "resize-y")}
                  rows={2}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  maxLength={500}
                  placeholder="Alguma coisa que devamos saber?"
                />
              </Campo>
              <label className="flex items-center gap-2 text-sm text-suave">
                <input
                  type="checkbox"
                  checked={lembrar}
                  onChange={(e) => setLembrar(e.target.checked)}
                  className="size-4 accent-(--marca)"
                />
                Lembrar os meus dados neste dispositivo
              </label>
              <Botao
                type="submit"
                tamanho="lg"
                disabled={enviando}
                className="mt-1 bg-(--marca) text-(--marca-texto) hover:bg-(--marca) hover:opacity-90"
              >
                {enviando ? "A confirmar…" : "Confirmar marcação"}
              </Botao>
            </form>
          </>
        )}
      </div>
    </Painel>
  );
}

// ───────── Componentes auxiliares ─────────

function Painel({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-linha bg-superficie p-5 shadow-cartao sm:p-8">{children}</section>
  );
}

function Titulo({ children }: { children: ReactNode }) {
  return <h2 className="mb-4 text-xl font-semibold tracking-tight">{children}</h2>;
}

function Escolha({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700 transition hover:bg-stone-200"
      title="Alterar"
    >
      {children}
    </button>
  );
}

function OpcaoProfissional({
  nome,
  descricao,
  avatar,
  onClick,
}: {
  nome: string;
  descricao: string;
  avatar: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-linha bg-white p-4 text-left transition hover:border-stone-300 hover:shadow-cartao"
    >
      {avatar}
      <span>
        <span className="block font-medium">{nome}</span>
        {descricao && <span className="block text-sm text-suave">{descricao}</span>}
      </span>
    </button>
  );
}

function Resumo({
  servico,
  profissionalNome,
  data,
  inicioMin,
}: {
  servico: ServicoPublico;
  profissionalNome?: string;
  data: DataISO;
  inicioMin: number;
}) {
  const linhas: [string, ReactNode][] = [
    ["Serviço", servico.nome],
    ...(profissionalNome ? ([["Com", profissionalNome]] as [string, ReactNode][]) : []),
    ["Dia", formatarDataLonga(data)],
    ["Hora", `${minParaHora(inicioMin)} – ${minParaHora(inicioMin + servico.duracaoMin)}`],
    ["Preço", formatarPreco(servico.precoCentimos)],
  ];
  return (
    <dl className="divide-y divide-linha rounded-2xl bg-fundo px-4 text-sm">
      {linhas.map(([rotulo, valor]) => (
        <div key={rotulo} className="flex justify-between gap-4 py-2.5">
          <dt className="text-suave">{rotulo}</dt>
          <dd className="text-right font-medium">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}

function agruparPorPeriodo(vagas: Vaga[]): [string, Vaga[]][] {
  const grupos: [string, Vaga[]][] = [
    ["Manhã", vagas.filter((v) => v.inicioMin < 12 * 60)],
    ["Tarde", vagas.filter((v) => v.inicioMin >= 12 * 60 && v.inicioMin < 19 * 60)],
    ["Noite", vagas.filter((v) => v.inicioMin >= 19 * 60)],
  ];
  return grupos.filter(([, lista]) => lista.length > 0);
}

/**
 * Gera um ficheiro .ics (calendário) para o cliente guardar a marcação no
 * telemóvel. Usa hora local (sem fuso), que é o esperado para quem está
 * na mesma zona do negócio.
 */
function descarregarIcs(
  negocio: NegocioPublico,
  servico: ServicoPublico,
  data: DataISO,
  inicioMin: number,
) {
  const dataCompacta = data.replaceAll("-", "");
  const hora = (min: number) => minParaHora(min).replace(":", "") + "00";
  const escapar = (texto: string) => texto.replace(/[\\,;]/g, (c) => `\\${c}`);
  const conteudo = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Flip Estetica//PT",
    "BEGIN:VEVENT",
    `UID:${dataCompacta}-${inicioMin}-${negocio.slug}@flip-estetica`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART:${dataCompacta}T${hora(inicioMin)}`,
    `DTEND:${dataCompacta}T${hora(inicioMin + servico.duracaoMin)}`,
    `SUMMARY:${escapar(`${servico.nome} · ${negocio.nome}`)}`,
    negocio.morada ? `LOCATION:${escapar(negocio.morada)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  const url = URL.createObjectURL(new Blob([conteudo], { type: "text/calendar" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "marcacao.ics";
  link.click();
  URL.revokeObjectURL(url);
}
