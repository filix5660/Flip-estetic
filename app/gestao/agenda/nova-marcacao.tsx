"use client";

/**
 * Formulário de marcação feita pelo proprietário (cliente ao telefone ou ao balcão).
 *
 * - Por omissão mostra as vagas calculadas, ignorando a antecedência mínima e a
 *   janela de marcação (que só se aplicam aos clientes).
 * - "Outra hora" permite marcar fora das vagas (ex.: depois do fecho); o servidor
 *   só garante que não fica por cima de outra marcação ou bloqueio.
 * - Escolher um nome existente na lista preenche o telemóvel do cliente.
 */

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, type FormEvent } from "react";
import { Dialogo } from "@/components/dialogo";
import { Alerta, Botao, Campo, classeInput, cn } from "@/components/ui";
import type { Vaga } from "@/lib/agendamento";
import { formatarDuracao, formatarPreco } from "@/lib/formatar";
import { ehDataValida, ehHoraValida, horaParaMin, minParaHora, type DataISO } from "@/lib/tempo";
import type { Plano } from "@/lib/tipos";
import { carregarVagasGestao, criarMarcacaoManual } from "../acoes";

interface Props {
  plano: Plano;
  servicos: { id: string; nome: string; duracaoMin: number; precoCentimos: number; profissionalIds: string[] }[];
  profissionais: { id: string; nome: string }[];
  clientes: { nome: string; telefone: string; email: string }[];
  inicial: {
    data: DataISO;
    servicoId: string;
    profissionalId: string | null;
    inicioMin: number | null;
    vagas: Vaga[];
  };
  urlFechar: string;
}

export function NovaMarcacao({ plano, servicos, profissionais, clientes, inicial, urlFechar }: Props) {
  const router = useRouter();
  const [servicoId, setServicoId] = useState(inicial.servicoId);
  const [profissionalId, setProfissionalId] = useState<string | null>(inicial.profissionalId);
  const [data, setData] = useState(inicial.data);
  const [vagas, setVagas] = useState<Vaga[]>(inicial.vagas);
  const [inicioMin, setInicioMin] = useState<number | null>(
    inicial.inicioMin !== null && inicial.vagas.some((v) => v.inicioMin === inicial.inicioMin)
      ? inicial.inicioMin
      : null,
  );
  const [horaLivre, setHoraLivre] = useState(
    inicial.inicioMin !== null && !inicial.vagas.some((v) => v.inicioMin === inicial.inicioMin),
  );
  const [horaManual, setHoraManual] = useState(inicial.inicioMin !== null ? minParaHora(inicial.inicioMin) : "");
  const [carregando, setCarregando] = useState(false);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [notas, setNotas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const pedido = useRef(0);

  const servico = servicos.find((s) => s.id === servicoId);
  const profissionaisDoServico = profissionais.filter((p) => servico?.profissionalIds.includes(p.id));

  const fechar = useCallback(() => router.replace(urlFechar, { scroll: false }), [router, urlFechar]);

    // Volta a pedir as vagas sempre que muda o serviço, o profissional ou o dia.
  async function recarregar(novoServico: string, novoProfissional: string | null, novaData: string) {
    setInicioMin(null);
    if (!ehDataValida(novaData)) return setVagas([]);
    const id = ++pedido.current;
    setCarregando(true);
    const resposta = await carregarVagasGestao(novoServico, novoProfissional, novaData);
    if (id !== pedido.current) return;
    setVagas(resposta.ok ? resposta.dados : []);
    setCarregando(false);
  }

  function escolherCliente(valor: string) {
    setNome(valor);
    const existente = clientes.find((c) => c.nome.toLowerCase() === valor.trim().toLowerCase());
    if (existente) {
      setTelefone(existente.telefone);
      setEmail(existente.email);
    }
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);

    let inicio = inicioMin;
    if (horaLivre) {
      if (!ehHoraValida(horaManual)) return setErro("Indica a hora de início.");
      if (!profissionalId) return setErro("Para uma hora fora das vagas, escolhe o profissional.");
      inicio = horaParaMin(horaManual);
    }
    if (inicio === null) return setErro("Escolhe uma hora.");

    setEnviando(true);
    const resposta = await criarMarcacaoManual({
      servicoId,
      profissionalId,
      data,
      inicioMin: inicio,
      horaLivre,
      cliente: { nome, telefone, email },
      notas,
    });
    setEnviando(false);
    if (!resposta.ok) return setErro(resposta.erro);
    fechar();
  }

  return (
    <Dialogo titulo="Nova marcação" descricao="Para clientes que ligam ou aparecem sem marcação." aoFechar={fechar}>
      <form onSubmit={guardar} className="grid gap-4">
        <Campo rotulo="Serviço">
          <select
            className={classeInput}
            value={servicoId}
            onChange={(e) => {
              const novo = e.target.value;
              setServicoId(novo);
              const doNovo = servicos.find((s) => s.id === novo)?.profissionalIds ?? [];
              const prof = profissionalId && doNovo.includes(profissionalId) ? profissionalId : null;
              setProfissionalId(prof);
              void recarregar(novo, prof, data);
            }}
          >
            {servicos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome} · {formatarDuracao(s.duracaoMin)} · {formatarPreco(s.precoCentimos)}
              </option>
            ))}
          </select>
        </Campo>

        <div className={cn("grid gap-4", plano === "equipa" && "sm:grid-cols-2")}>
          {plano === "equipa" && (
            <Campo rotulo="Profissional">
              <select
                className={classeInput}
                value={profissionalId ?? ""}
                onChange={(e) => {
                  const novo = e.target.value || null;
                  setProfissionalId(novo);
                  void recarregar(servicoId, novo, data);
                }}
              >
                <option value="">Qualquer disponível</option>
                {profissionaisDoServico.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </Campo>
          )}
          <Campo rotulo="Dia">
            <input
              type="date"
              className={classeInput}
              value={data}
              onChange={(e) => {
                setData(e.target.value);
                void recarregar(servicoId, profissionalId, e.target.value);
              }}
              required
            />
          </Campo>
        </div>

        <fieldset className="grid gap-2">
          <div className="flex items-center justify-between">
            <legend className="text-sm font-medium">Hora</legend>
            <label className="flex items-center gap-1.5 text-xs text-suave">
              <input
                type="checkbox"
                className="size-3.5 accent-stone-800"
                checked={horaLivre}
                onChange={(e) => setHoraLivre(e.target.checked)}
              />
              Outra hora (fora das vagas)
            </label>
          </div>
          {horaLivre ? (
            <input
              type="time"
              className={classeInput}
              value={horaManual}
              onChange={(e) => setHoraManual(e.target.value)}
              step={300}
              required
            />
          ) : carregando ? (
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className="h-9 animate-pulse rounded-lg bg-stone-100" />
              ))}
            </div>
          ) : vagas.length === 0 ? (
            <p className="rounded-xl bg-stone-50 px-3 py-3 text-sm text-suave">
              Sem vagas para este serviço neste dia.
            </p>
          ) : (
            <div className="grid max-h-44 grid-cols-4 gap-1.5 overflow-y-auto sm:grid-cols-6">
              {vagas.map((v) => (
                <button
                  key={v.inicioMin}
                  type="button"
                  onClick={() => setInicioMin(v.inicioMin)}
                  aria-pressed={inicioMin === v.inicioMin}
                  className={cn(
                    "h-9 rounded-lg border text-sm tabular-nums",
                    inicioMin === v.inicioMin
                      ? "border-transparent bg-escuro text-white"
                      : "border-linha hover:border-stone-400",
                  )}
                >
                  {minParaHora(v.inicioMin)}
                </button>
              ))}
            </div>
          )}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Cliente">
            <input
              className={classeInput}
              value={nome}
              onChange={(e) => escolherCliente(e.target.value)}
              list="lista-clientes"
              placeholder="Nome"
              required
              minLength={2}
            />
            <datalist id="lista-clientes">
              {clientes.map((c) => (
                <option key={c.telefone} value={c.nome} />
              ))}
            </datalist>
          </Campo>
          <Campo rotulo="Telemóvel">
            <input
              className={classeInput}
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              required
            />
          </Campo>
        </div>
        <Campo rotulo={<>Notas <span className="font-normal text-suave">(opcional)</span></>}>
          <input className={classeInput} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </Campo>

        {erro && <Alerta>{erro}</Alerta>}

        <div className="mt-1 flex justify-end gap-2">
          <Botao variante="fantasma" onClick={fechar}>
            Cancelar
          </Botao>
          <Botao type="submit" disabled={enviando}>
            {enviando ? "A guardar…" : "Guardar marcação"}
          </Botao>
        </div>
      </form>
    </Dialogo>
  );
}
