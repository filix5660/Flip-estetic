"use client";

import { useState, type FormEvent } from "react";
import NavegacaoGestao from "../navegacao-gestao";
import styles from "./page.module.css";

type HorarioDia = {
  dia: string;
  ativo: boolean;
  abertura: string;
  fecho: string;
};

type Bloqueio = {
  id: number;
  data: string;
  inicio: string;
  fim: string;
  motivo: string;
};

const horariosIniciais: HorarioDia[] = [
  { dia: "Segunda-feira", ativo: true, abertura: "09:00", fecho: "18:00" },
  { dia: "Terça-feira", ativo: true, abertura: "09:00", fecho: "18:00" },
  { dia: "Quarta-feira", ativo: true, abertura: "09:00", fecho: "18:00" },
  { dia: "Quinta-feira", ativo: true, abertura: "09:00", fecho: "18:00" },
  { dia: "Sexta-feira", ativo: true, abertura: "09:00", fecho: "18:00" },
  { dia: "Sábado", ativo: true, abertura: "09:00", fecho: "14:00" },
  { dia: "Domingo", ativo: false, abertura: "09:00", fecho: "14:00" },
];

function formatarData(data: string) {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

export default function HorariosPage() {
  const [horarios, setHorarios] = useState(horariosIniciais);
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [erroBloqueio, setErroBloqueio] = useState("");

  const [dataBloqueio, setDataBloqueio] = useState("");
  const [inicioBloqueio, setInicioBloqueio] = useState("");
  const [fimBloqueio, setFimBloqueio] = useState("");
  const [motivoBloqueio, setMotivoBloqueio] = useState("");

  function atualizarHorario(
    indice: number,
    campo: "ativo" | "abertura" | "fecho",
    valor: boolean | string,
  ) {
    setHorarios((atuais) =>
      atuais.map((item, i) =>
        i === indice ? { ...item, [campo]: valor } : item,
      ),
    );
    setMensagem("");
  }

  function guardarHorarios(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMensagem("Alterações guardadas nesta sessão.");
  }

  function adicionarBloqueio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErroBloqueio("");

    if (fimBloqueio <= inicioBloqueio) {
      setErroBloqueio("A hora de fim tem de ser posterior à hora de início.");
      return;
    }

    const novoBloqueio: Bloqueio = {
      id: Date.now(),
      data: dataBloqueio,
      inicio: inicioBloqueio,
      fim: fimBloqueio,
      motivo: motivoBloqueio.trim(),
    };

    setBloqueios((atuais) => [...atuais, novoBloqueio]);
    setDataBloqueio("");
    setInicioBloqueio("");
    setFimBloqueio("");
    setMotivoBloqueio("");
  }

  function removerBloqueio(id: number) {
    setBloqueios((atuais) => atuais.filter((item) => item.id !== id));
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p>ÁREA DO NEGÓCIO</p>
        <h1>Horários</h1>
        <p>Define os dias e horários de atendimento.</p>
      </header>

      <NavegacaoGestao />

      <section className={styles.card}>
        <h2>Disponibilidade semanal</h2>
        <p>Ativa os dias em que os clientes podem marcar.</p>

        <form className={styles.weeklyForm} onSubmit={guardarHorarios}>
          <div className={styles.dayList}>
            {horarios.map((item, indice) => (
              <article className={styles.dayItem} key={item.dia}>
                <label className={styles.dayTitle}>
                  <input
                    type="checkbox"
                    checked={item.ativo}
                    onChange={(event) =>
                      atualizarHorario(indice, "ativo", event.target.checked)
                    }
                  />
                  <strong>{item.dia}</strong>
                </label>

                {item.ativo ? (
                  <div className={styles.timeFields}>
                    <label>
                      Abre
                      <input
                        type="time"
                        value={item.abertura}
                        onChange={(event) =>
                          atualizarHorario(
                            indice,
                            "abertura",
                            event.target.value,
                          )
                        }
                      />
                    </label>

                    <label>
                      Fecha
                      <input
                        type="time"
                        value={item.fecho}
                        onChange={(event) =>
                          atualizarHorario(indice, "fecho", event.target.value)
                        }
                      />
                    </label>
                  </div>
                ) : (
                  <span className={styles.closed}>Fechado</span>
                )}
              </article>
            ))}
          </div>

          <button className={styles.saveButton} type="submit">Guardar horários</button>
          {mensagem && <p className={styles.message} role="status">{mensagem}</p>}
        </form>
      </section>

      <section className={styles.card}>
        <h2>Fechar um intervalo</h2>
        <p>
          Bloqueia algumas horas numa data específica sem alterar o horário
          semanal.
        </p>

        <form className={styles.blockForm} onSubmit={adicionarBloqueio}>
          <label>
            Data
            <input
              type="date"
              value={dataBloqueio}
              onChange={(event) => setDataBloqueio(event.target.value)}
              required
            />
          </label>

          <div className={styles.timeFields}>
            <label>
              Das
              <input
                type="time"
                value={inicioBloqueio}
                onChange={(event) => setInicioBloqueio(event.target.value)}
                required
              />
            </label>

            <label>
              Até
              <input
                type="time"
                value={fimBloqueio}
                onChange={(event) => setFimBloqueio(event.target.value)}
                required
              />
            </label>
          </div>

          <label>
            Motivo (opcional)
            <input
              value={motivoBloqueio}
              onChange={(event) => setMotivoBloqueio(event.target.value)}
              placeholder="Ex.: compromisso pessoal"
            />
          </label>

          {erroBloqueio && <p className={styles.error} role="alert">{erroBloqueio}</p>}

          <button className={styles.saveButton} type="submit">Fechar este intervalo</button>
        </form>

        {bloqueios.length > 0 && (
          <div className={styles.blockList}>
            <h3>Intervalos fechados</h3>

            {bloqueios.map((bloqueio) => (
              <article className={styles.blockItem} key={bloqueio.id}>
                <div>
                  <strong>
                    {formatarData(bloqueio.data)} · {bloqueio.inicio}–
                    {bloqueio.fim}
                  </strong>
                  {bloqueio.motivo && <p>{bloqueio.motivo}</p>}
                </div>

                <button
                  className={styles.removeButton}
                  type="button"
                  onClick={() => removerBloqueio(bloqueio.id)}
                >
                  Remover
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
