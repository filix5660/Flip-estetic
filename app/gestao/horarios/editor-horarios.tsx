"use client";

import { useState, useTransition, type FormEvent } from "react";
import { formatarDataNumerica } from "@/lib/datas";
import {
  diasDaSemana,
  nomesDiaSemana,
  type Bloqueio,
  type DiaSemana,
  type HorarioSemanal,
} from "@/lib/modelo";
import {
  adicionarBloqueio as adicionarNoServidor,
  guardarHorarios as guardarNoServidor,
  removerBloqueio as removerNoServidor,
} from "../acoes";
import styles from "./page.module.css";

type Props = {
  horariosIniciais: HorarioSemanal[];
  bloqueiosIniciais: Bloqueio[];
};

export default function EditorHorarios({
  horariosIniciais,
  bloqueiosIniciais,
}: Props) {
  const [horarios, setHorarios] = useState(horariosIniciais);
  const [aGuardar, iniciarTransicao] = useTransition();
  const [bloqueios, setBloqueios] = useState(bloqueiosIniciais);
  const [mensagem, setMensagem] = useState("");
  const [erroHorarios, setErroHorarios] = useState("");
  const [erroBloqueio, setErroBloqueio] = useState("");

  const [dataBloqueio, setDataBloqueio] = useState("");
  const [inicioBloqueio, setInicioBloqueio] = useState("");
  const [fimBloqueio, setFimBloqueio] = useState("");
  const [motivoBloqueio, setMotivoBloqueio] = useState("");

  function atualizarHorario(
    diaSemana: DiaSemana,
    alteracao: Partial<Pick<HorarioSemanal, "aberto" | "abertura" | "fecho">>,
  ) {
    setHorarios((atuais) =>
      atuais.map((h) => (h.diaSemana === diaSemana ? { ...h, ...alteracao } : h)),
    );
    setMensagem("");
    setErroHorarios("");
  }

  function guardarHorarios(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const invalido = horarios.find((h) => h.aberto && h.fecho <= h.abertura);
    if (invalido) {
      setErroHorarios(
        `${nomesDiaSemana[invalido.diaSemana]}: a hora de fecho tem de ser depois da abertura.`,
      );
      return;
    }

    setErroHorarios("");
    iniciarTransicao(async () => {
      const resultado = await guardarNoServidor(
        horarios.map(({ diaSemana, aberto, abertura, fecho }) => ({
          diaSemana,
          aberto,
          abertura,
          fecho,
        })),
      );
      if (resultado.ok) setMensagem("Horários guardados.");
      else setErroHorarios(resultado.erro);
    });
  }

  function adicionarBloqueio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErroBloqueio("");

    if (fimBloqueio <= inicioBloqueio) {
      setErroBloqueio("A hora de fim tem de ser posterior à hora de início.");
      return;
    }

    iniciarTransicao(async () => {
      const resultado = await adicionarNoServidor({
        data: dataBloqueio,
        inicio: inicioBloqueio,
        fim: fimBloqueio,
        motivo: motivoBloqueio.trim(),
      });
      if (!resultado.ok) {
        setErroBloqueio(resultado.erro);
        return;
      }

      setBloqueios((atuais) => [...atuais, resultado.dados]);
      setDataBloqueio("");
      setInicioBloqueio("");
      setFimBloqueio("");
      setMotivoBloqueio("");
    });
  }

  function removerBloqueio(id: string) {
    setErroBloqueio("");
    iniciarTransicao(async () => {
      const resultado = await removerNoServidor(id);
      if (resultado.ok) {
        setBloqueios((atuais) => atuais.filter((item) => item.id !== id));
      } else {
        setErroBloqueio(resultado.erro);
      }
    });
  }

  return (
    <>
      <section className={styles.card}>
        <h2>Disponibilidade semanal</h2>
        <p>Ativa os dias em que os clientes podem marcar.</p>

        <form className={styles.weeklyForm} onSubmit={guardarHorarios}>
          <div className={styles.dayList}>
            {diasDaSemana.map((diaSemana) => {
              const item = horarios.find((h) => h.diaSemana === diaSemana);
              if (!item) return null;

              return (
                <article className={styles.dayItem} key={diaSemana}>
                  <label className={styles.dayTitle}>
                    <input
                      type="checkbox"
                      checked={item.aberto}
                      onChange={(event) =>
                        atualizarHorario(diaSemana, { aberto: event.target.checked })
                      }
                    />
                    <strong>{nomesDiaSemana[diaSemana]}</strong>
                  </label>

                  {item.aberto ? (
                    <div className={styles.timeFields}>
                      <label>
                        Abre
                        <input
                          type="time"
                          value={item.abertura}
                          onChange={(event) =>
                            atualizarHorario(diaSemana, { abertura: event.target.value })
                          }
                        />
                      </label>

                      <label>
                        Fecha
                        <input
                          type="time"
                          value={item.fecho}
                          onChange={(event) =>
                            atualizarHorario(diaSemana, { fecho: event.target.value })
                          }
                        />
                      </label>
                    </div>
                  ) : (
                    <span className={styles.closed}>Fechado</span>
                  )}
                </article>
              );
            })}
          </div>

          {erroHorarios && (
            <p className={styles.error} role="alert">
              {erroHorarios}
            </p>
          )}

          <button className={styles.saveButton} type="submit" disabled={aGuardar}>
            Guardar horários
          </button>
          {mensagem && (
            <p className={styles.message} role="status">
              {mensagem}
            </p>
          )}
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
              maxLength={120}
            />
          </label>

          {erroBloqueio && (
            <p className={styles.error} role="alert">
              {erroBloqueio}
            </p>
          )}

          <button className={styles.saveButton} type="submit" disabled={aGuardar}>
            Fechar este intervalo
          </button>
        </form>

        {bloqueios.length > 0 && (
          <div className={styles.blockList}>
            <h3>Intervalos fechados</h3>

            {bloqueios.map((bloqueio) => (
              <article className={styles.blockItem} key={bloqueio.id}>
                <div>
                  <strong>
                    {formatarDataNumerica(bloqueio.data)} · {bloqueio.inicio}–
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
    </>
  );
}
