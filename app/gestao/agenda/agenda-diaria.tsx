"use client";

import { useState, useTransition, type FormEvent } from "react";
import { DayPicker } from "react-day-picker";
import { pt } from "react-day-picker/locale";
import "react-day-picker/style.css";
import {
  deDateLocal,
  formatarDataLonga,
  paraDateLocal,
  somarDias,
} from "@/lib/datas";
import {
  centimosParaCampo,
  eurosParaCentimos,
  formatarEuros,
} from "@/lib/formatar";
import { resumirGanhos, valorDaMarcacao } from "@/lib/ganhos";
import type {
  Cliente,
  Data,
  EstadoMarcacao,
  Marcacao,
  Profissional,
  Servico,
} from "@/lib/modelo";
import { alterarEstadoMarcacao, anotarMarcacao } from "../acoes";
import EtiquetaEstado from "../etiqueta-estado";
import styles from "./page.module.css";

type Props = {
  hoje: Data;
  marcacoesIniciais: Marcacao[];
  servicos: Servico[];
  profissionais: Profissional[];
  clientes: Cliente[];
};

export default function AgendaDiaria({
  hoje,
  marcacoesIniciais,
  servicos,
  profissionais,
  clientes,
}: Props) {
  const [data, setData] = useState(hoje);
  const [mesVisivel, setMesVisivel] = useState(() => paraDateLocal(hoje));
  const [marcacoes, setMarcacoes] = useState(marcacoesIniciais);
  const [aGuardar, iniciarTransicao] = useTransition();
  const [erroAgenda, setErroAgenda] = useState("");
  const [aConcluir, setAConcluir] = useState<string | null>(null);
  const [valorTexto, setValorTexto] = useState("");
  const [erroValor, setErroValor] = useState("");
  const [listaClientes, setListaClientes] = useState(clientes);

  // Formulário "Anotar marcação"
  const servicosAtivos = servicos.filter((s) => s.ativo);
  const [aAnotar, setAAnotar] = useState(false);
  const [servicoNovo, setServicoNovo] = useState(servicosAtivos[0]?.id ?? "");
  const [profissionalNovo, setProfissionalNovo] = useState(profissionais[0]?.id ?? "");
  const [horaNova, setHoraNova] = useState("10:00");
  const [nomeNovo, setNomeNovo] = useState("");
  const [contactoNovo, setContactoNovo] = useState("");
  const [erroNovo, setErroNovo] = useState("");

  const doDia = marcacoes.filter((m) => m.data === data);
  const resumo = resumirGanhos(doDia, servicos, profissionais);
  const variosProfissionais = profissionais.length > 1;

  const nomeServico = (id: string) =>
    servicos.find((s) => s.id === id)?.nome ?? "Serviço";
  const nomeCliente = (id: string) =>
    listaClientes.find((c) => c.id === id)?.nome ?? "Cliente";
  const nomeProfissional = (id: string) =>
    profissionais.find((p) => p.id === id)?.nome ?? "";

  function mudarDia(novaData: Data) {
    setData(novaData);
    setMesVisivel(paraDateLocal(novaData));
    setAConcluir(null);
  }

  function alterarMarcacao(
    id: string,
    estado: EstadoMarcacao,
    valorCentimos: number | null = null,
  ) {
    setErroAgenda("");
    iniciarTransicao(async () => {
      const resultado = await alterarEstadoMarcacao({ id, estado, valorCentimos });
      if (!resultado.ok) {
        setErroAgenda(resultado.erro);
        return;
      }
      setMarcacoes((atuais) =>
        atuais.map((m) => (m.id === id ? { ...m, estado, valorCentimos } : m)),
      );
    });
  }

  function anotar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErroNovo("");
    iniciarTransicao(async () => {
      const resultado = await anotarMarcacao({
        servicoId: servicoNovo,
        profissionalId: variosProfissionais ? profissionalNovo : null,
        data,
        hora: horaNova,
        nome: nomeNovo,
        contacto: contactoNovo,
      });
      if (!resultado.ok) {
        setErroNovo(resultado.erro);
        return;
      }
      const { marcacao, cliente } = resultado.dados;
      setListaClientes((atuais) =>
        atuais.some((c) => c.id === cliente.id) ? atuais : [...atuais, cliente],
      );
      setMarcacoes((atuais) =>
        [...atuais, marcacao].sort((a, b) =>
          (a.data + a.inicio).localeCompare(b.data + b.inicio),
        ),
      );
      setNomeNovo("");
      setContactoNovo("");
      setAAnotar(false);
    });
  }

  function abrirConclusao(marcacao: Marcacao) {
    setAConcluir(marcacao.id);
    setValorTexto(centimosParaCampo(valorDaMarcacao(marcacao, servicos)));
    setErroValor("");
  }

  function confirmarConclusao(event: FormEvent<HTMLFormElement>, marcacao: Marcacao) {
    event.preventDefault();
    const valor = eurosParaCentimos(valorTexto);
    if (valor === null) {
      setErroValor("Indica um valor válido.");
      return;
    }

    const preco = servicos.find((s) => s.id === marcacao.servicoId)?.precoCentimos;
    alterarMarcacao(marcacao.id, "concluida", valor === preco ? null : valor);
    setAConcluir(null);
  }

  return (
    <section className={styles.card}>
      <div className={styles.dayHeader}>
        <button
          className={styles.dayButton}
          type="button"
          onClick={() => mudarDia(somarDias(data, -1))}
          aria-label="Dia anterior"
        >
          ←
        </button>

        <div className={styles.dayTitle}>
          <h2>{formatarDataLonga(data)}</h2>
          {data !== hoje && (
            <button className={styles.todayButton} type="button" onClick={() => mudarDia(hoje)}>
              Voltar a hoje
            </button>
          )}
        </div>

        <button
          className={styles.dayButton}
          type="button"
          onClick={() => mudarDia(somarDias(data, 1))}
          aria-label="Dia seguinte"
        >
          →
        </button>
      </div>

      <div className={styles.daySummary}>
        <div>
          <span>Ganho do dia</span>
          <strong>{formatarEuros(resumo.ganhoCentimos)}</strong>
        </div>
        <div>
          <span>Concluídos</span>
          <strong>{resumo.concluidas}</strong>
        </div>
        <div>
          <span>Por concluir</span>
          <strong>{resumo.porConcluir}</strong>
        </div>
        {resumo.faltas > 0 && (
          <div>
            <span>Faltas</span>
            <strong>{resumo.faltas}</strong>
          </div>
        )}
      </div>

      {servicosAtivos.length === 0 ? (
        <p className={styles.empty}>
          Adiciona um serviço em Serviços para poderes anotar marcações.
        </p>
      ) : !aAnotar ? (
        <button className={styles.annotateButton} type="button" onClick={() => setAAnotar(true)}>
          + Anotar marcação
        </button>
      ) : (
        <form className={styles.annotateForm} onSubmit={anotar}>
          <h3>Anotar marcação · {formatarDataLonga(data)}</h3>

          <div className={styles.annotateFields}>
            <label>
              Serviço
              <select value={servicoNovo} onChange={(e) => setServicoNovo(e.target.value)}>
                {servicosAtivos.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Hora
              <input
                type="time"
                value={horaNova}
                onChange={(e) => setHoraNova(e.target.value)}
                required
              />
            </label>

            {variosProfissionais && (
              <label>
                Profissional
                <select value={profissionalNovo} onChange={(e) => setProfissionalNovo(e.target.value)}>
                  {profissionais.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              Nome do cliente
              <input
                value={nomeNovo}
                onChange={(e) => setNomeNovo(e.target.value)}
                minLength={2}
                maxLength={80}
                required
              />
            </label>

            <label>
              Telefone ou email (opcional)
              <input
                value={contactoNovo}
                onChange={(e) => setContactoNovo(e.target.value)}
                maxLength={120}
              />
            </label>
          </div>

          {erroNovo && (
            <p className={styles.error} role="alert">
              {erroNovo}
            </p>
          )}

          <div className={styles.actions}>
            <button className={styles.confirmButton} type="submit" disabled={aGuardar}>
              Guardar
            </button>
            <button type="button" onClick={() => setAAnotar(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {erroAgenda && (
        <p className={styles.error} role="alert">
          {erroAgenda}
        </p>
      )}

      {doDia.length === 0 ? (
        <p className={styles.empty}>Sem marcações neste dia.</p>
      ) : (
        <div className={styles.timeline}>
          {doDia.map((m) => (
            <div className={styles.timeRow} key={m.id}>
              <span>{m.inicio}</span>

              <div className={styles.busy}>
                <div className={styles.busyTop}>
                  <strong>
                    {m.inicio} – {m.fim}
                  </strong>
                  <EtiquetaEstado estado={m.estado} />
                </div>
                <span>
                  {nomeCliente(m.clienteId)} · {nomeServico(m.servicoId)}
                  {variosProfissionais && ` · ${nomeProfissional(m.profissionalId)}`}
                </span>
                {m.estado === "concluida" && (
                  <span>Recebido: {formatarEuros(valorDaMarcacao(m, servicos))}</span>
                )}

                {m.estado === "marcada" && aConcluir !== m.id && (
                  <fieldset className={styles.actions} disabled={aGuardar}>
                    <button
                      className={styles.confirmButton}
                      type="button"
                      onClick={() => abrirConclusao(m)}
                    >
                      Concluir
                    </button>
                    <button type="button" onClick={() => alterarMarcacao(m.id, "faltou")}>
                      Faltou
                    </button>
                    <button type="button" onClick={() => alterarMarcacao(m.id, "cancelada")}>
                      Cancelar
                    </button>
                  </fieldset>
                )}

                {aConcluir === m.id && (
                  <form className={styles.valueForm} onSubmit={(event) => confirmarConclusao(event, m)}>
                    <label>
                      Valor recebido (€)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={valorTexto}
                        onChange={(event) => setValorTexto(event.target.value)}
                        autoFocus
                        required
                      />
                    </label>
                    <button className={styles.confirmButton} type="submit">
                      Confirmar
                    </button>
                    <button type="button" onClick={() => setAConcluir(null)}>
                      Voltar
                    </button>
                    {erroValor && (
                      <p className={styles.error} role="alert">
                        {erroValor}
                      </p>
                    )}
                  </form>
                )}

                {(m.estado === "faltou" || m.estado === "cancelada") && (
                  <div className={styles.actions}>
                    <button type="button" onClick={() => alterarMarcacao(m.id, "marcada")}>
                      Repor como marcada
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.calendar}>
        <h3>Ir para uma data</h3>

        <DayPicker
          mode="single"
          locale={pt}
          today={paraDateLocal(hoje)}
          selected={paraDateLocal(data)}
          month={mesVisivel}
          onMonthChange={setMesVisivel}
          onSelect={(dia) => {
            if (dia) mudarDia(deDateLocal(dia));
          }}
        />
      </div>
    </section>
  );
}
