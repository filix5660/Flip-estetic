"use client";

/**
 * Regras de marcação do negócio (como as vagas são criadas, intervalo entre
 * marcações, antecedência mínima, até quando se pode marcar) e uma
 * pré-visualização das vagas tal como o cliente as vai ver.
 */

import { useRef, useState, useTransition } from "react";
import { Alerta, Botao, Campo, Cartao, classeInput, cn } from "@/components/ui";
import type { Vaga } from "@/lib/agendamento";
import { formatarDuracao } from "@/lib/formatar";
import { minParaHora, type DataISO } from "@/lib/tempo";
import type { ModoVagas, RegrasMarcacao } from "@/lib/tipos";
import { carregarVagasGestao, guardarRegras } from "../acoes";

const ANTECEDENCIAS = [
  { valor: 0, rotulo: "Sem antecedência" },
  { valor: 30, rotulo: "30 minutos" },
  { valor: 60, rotulo: "1 hora" },
  { valor: 120, rotulo: "2 horas" },
  { valor: 240, rotulo: "4 horas" },
  { valor: 720, rotulo: "12 horas" },
  { valor: 1440, rotulo: "1 dia" },
  { valor: 2880, rotulo: "2 dias" },
];

const JANELAS = [7, 14, 30, 45, 60, 90, 180];

export function RegrasVagas({
  regras: inicial,
  profissionalId,
  servicos,
  dataSugerida,
}: {
  regras: RegrasMarcacao;
  profissionalId: string;
  servicos: { id: string; nome: string; duracaoMin: number }[];
  dataSugerida: DataISO;
}) {
  const [regras, setRegras] = useState(inicial);
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);
  const [aGuardar, iniciar] = useTransition();

  const [servicoId, setServicoId] = useState(servicos[0]?.id ?? "");
  const [data, setData] = useState(dataSugerida);
  const [vagas, setVagas] = useState<Vaga[] | null>(null);
  const [aCarregar, setACarregar] = useState(false);
  const pedido = useRef(0);

  const alterado = JSON.stringify(regras) !== JSON.stringify(inicial);
  const alterar = <K extends keyof RegrasMarcacao>(campo: K, valor: RegrasMarcacao[K]) => {
    setRegras((r) => ({ ...r, [campo]: valor }));
    setMensagem(null);
    setVagas(null);
  };

  function guardar() {
    iniciar(async () => {
      const resposta = await guardarRegras(regras);
      setMensagem(
        resposta.ok
          ? { tipo: "sucesso", texto: "Regras guardadas." }
          : { tipo: "erro", texto: resposta.erro },
      );
    });
  }

  async function preVisualizar() {
    if (!servicoId) return;
    const id = ++pedido.current;
    setACarregar(true);
    const resposta = await carregarVagasGestao(servicoId, profissionalId, data, true);
    if (id !== pedido.current) return;
    setVagas(resposta.ok ? resposta.dados : []);
    setACarregar(false);
  }

  const servico = servicos.find((s) => s.id === servicoId);

  return (
    <div className="grid content-start gap-6">
      <Cartao titulo="Como as vagas são criadas" descricao="Vale para todos os profissionais do negócio.">
        <div className="grid gap-4">
          <fieldset className="grid gap-2">
            <legend className="sr-only">Modo das vagas</legend>
            {(
              [
                ["duracao_servico", "Pela duração do serviço", "Um corte de 30 min gera 09:00, 09:30, 10:00… Um de 45 min gera 09:00, 09:45, 10:30… Aproveita melhor o dia."],
                ["intervalo_fixo", "Em horários fixos", "As vagas começam sempre na mesma grelha (ex.: de 30 em 30 min), seja qual for o serviço."],
              ] as [ModoVagas, string, string][]
            ).map(([valor, titulo, texto]) => (
              <label
                key={valor}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-xl border p-3.5 transition",
                  regras.modoVagas === valor ? "border-escuro bg-stone-50" : "border-linha hover:bg-stone-50",
                )}
              >
                <input
                  type="radio"
                  name="modo"
                  className="mt-1 accent-stone-800"
                  checked={regras.modoVagas === valor}
                  onChange={() => alterar("modoVagas", valor)}
                />
                <span>
                  <span className="block text-sm font-medium">{titulo}</span>
                  <span className="block text-xs leading-relaxed text-suave">{texto}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {regras.modoVagas === "intervalo_fixo" && (
            <Campo rotulo="Uma vaga a cada">
              <select
                className={classeInput}
                value={regras.intervaloFixoMin}
                onChange={(e) => alterar("intervaloFixoMin", Number(e.target.value))}
              >
                {[10, 15, 20, 30, 45, 60, 90, 120].map((m) => (
                  <option key={m} value={m}>
                    {formatarDuracao(m)}
                  </option>
                ))}
              </select>
            </Campo>
          )}

          <Campo rotulo="Intervalo entre marcações" ajuda="Tempo para limpar ou preparar entre um cliente e o seguinte.">
            <select
              className={classeInput}
              value={regras.folgaEntreMarcacoesMin}
              onChange={(e) => alterar("folgaEntreMarcacoesMin", Number(e.target.value))}
            >
              {[0, 5, 10, 15, 20, 30].map((m) => (
                <option key={m} value={m}>
                  {m === 0 ? "Nenhum" : formatarDuracao(m)}
                </option>
              ))}
            </select>
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Antecedência mínima">
              <select
                className={classeInput}
                value={regras.antecedenciaMinimaMin}
                onChange={(e) => alterar("antecedenciaMinimaMin", Number(e.target.value))}
              >
                {ANTECEDENCIAS.map((a) => (
                  <option key={a.valor} value={a.valor}>
                    {a.rotulo}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Marcar até">
              <select
                className={classeInput}
                value={regras.janelaMarcacaoDias}
                onChange={(e) => alterar("janelaMarcacaoDias", Number(e.target.value))}
              >
                {JANELAS.map((d) => (
                  <option key={d} value={d}>
                    {d} dias antes
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          {mensagem && <Alerta tipo={mensagem.tipo}>{mensagem.texto}</Alerta>}
          <Botao onClick={guardar} disabled={!alterado || aGuardar} className="w-full">
            {aGuardar ? "A guardar…" : "Guardar regras"}
          </Botao>
        </div>
      </Cartao>

      <Cartao titulo="Pré-visualizar vagas" descricao="Vê o que o cliente vai ver na página de marcação.">
        {servicos.length === 0 ? (
          <p className="text-sm text-suave">Este profissional ainda não tem serviços ativos.</p>
        ) : (
          <div className="grid gap-3">
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <select
                className={classeInput}
                value={servicoId}
                onChange={(e) => {
                  setServicoId(e.target.value);
                  setVagas(null);
                }}
                aria-label="Serviço"
              >
                {servicos.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome} ({formatarDuracao(s.duracaoMin)})
                  </option>
                ))}
              </select>
              <input
                type="date"
                className={cn(classeInput, "w-40")}
                value={data}
                onChange={(e) => {
                  setData(e.target.value);
                  setVagas(null);
                }}
                aria-label="Dia"
              />
            </div>
            <Botao variante="secundario" onClick={preVisualizar} disabled={aCarregar}>
              {aCarregar ? "A calcular…" : "Ver vagas"}
            </Botao>
            {alterado && vagas === null && (
              <p className="text-xs text-amber-700">Guarda as regras para a pré-visualização as usar.</p>
            )}
            {vagas &&
              (vagas.length === 0 ? (
                <p className="rounded-xl bg-stone-50 px-3 py-3 text-sm text-suave">
                  Sem vagas para {servico?.nome.toLowerCase()} neste dia.
                </p>
              ) : (
                <div>
                  <p className="mb-2 text-xs text-suave">{vagas.length} vagas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {vagas.map((v) => (
                      <span key={v.inicioMin} className="rounded-lg bg-stone-100 px-2 py-1 text-xs font-medium tabular-nums">
                        {minParaHora(v.inicioMin)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </Cartao>
    </div>
  );
}
