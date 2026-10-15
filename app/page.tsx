"use client";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { useState } from "react";
import styles from "./page.module.css";

const servicos = [
  { nome: "Corte de cabelo", duracao: "30 min", preco: "15 €" },
  { nome: "Barba", duracao: "20 min", preco: "10 €" },
  { nome: "Corte + barba", duracao: "45 min", preco: "22 €" },
];

const horarios = ["09:00", "10:00", "11:30", "14:00", "15:30"];

export default function Home() {
  const [etapa, setEtapa] = useState(0);
  const [servicoSelecionado, setServicoSelecionado] = useState("");
  const [dataSelecionada, setDataSelecionada] = useState("");
  const [horarioSelecionado, setHorarioSelecionado] = useState("");
  const [nomeCliente, setNomeCliente] = useState("");
  const [contactoCliente, setContactoCliente] = useState("");
  const [confirmada, setConfirmada] = useState(false);
  function voltar() {
    setEtapa((etapaAtual) => Math.max(0, etapaAtual - 1));
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p>BARBEARIA</p>
        <h1>Barbearia Central</h1>
        <p>Cortes com estilo, feitos com cuidado.</p>
      </header>

      <section className={styles.card}>
        {etapa === 0 && (
          <>
            <h2>Os nossos serviços</h2>

            {servicos.map((servico) => (
              <article className={styles.service} key={servico.nome}>
                <h3>{servico.nome}</h3>
                <p>
                  {servico.duracao} · {servico.preco}
                </p>
              </article>
            ))}

            <button className={styles.primaryButton} type="button" onClick={() => setEtapa(1)}>
              Marcar horário
            </button>
          </>
        )}

        {etapa === 1 && (
          <>
            <h2>Escolha um serviço</h2>

            {servicos.map((servico) => (
              <button
                key={servico.nome}
                className={styles.optionButton}
                type="button"
                onClick={() => {
                  setServicoSelecionado(servico.nome);
                  setEtapa(2);
                }}
              >
                {servico.nome} · {servico.duracao} · {servico.preco}
              </button>
            ))}

            <button className={styles.backButton} type="button" onClick={voltar}>
              Voltar
            </button>
          </>
        )}

        {etapa === 2 && (
          <div className={styles.calendar}>
            <h2>Escolhe uma data</h2>
            <DayPicker
              mode="single"
              selected={
                dataSelecionada
                  ? new Date(`${dataSelecionada}T12:00:00`)
                  : undefined
              }
              onSelect={(data) => {
                if (!data) return;

                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                const dataEscolhida = new Date(
                  data.getFullYear(),
                  data.getMonth(),
                  data.getDate(),
                );

                if (dataEscolhida < hoje) return;

                const dataLocal = [
                  data.getFullYear(),
                  String(data.getMonth() + 1).padStart(2, "0"),
                  String(data.getDate()).padStart(2, "0"),
                ].join("-");

                setDataSelecionada(dataLocal);
                setEtapa(3);
              }}
            />
          </div>
        )}

        {etapa === 3 && (
          <>
            <h2>Escolha um horário</h2>
            <p>
              {servicoSelecionado} ·{" "}
              {new Date(`${dataSelecionada}T12:00:00`).toLocaleDateString(
                "pt-PT",
                {
                  day: "numeric",
                  month: "long",
                },
              )}
            </p>

            {horarios.map((horario) => (
              <button
                key={horario}
                className={styles.optionButton}
                type="button"
                onClick={() => {
                  setHorarioSelecionado(horario);
                  setEtapa(4);
                }}
              >
                {horario}
              </button>
            ))}

            <button className={styles.backButton} type="button" onClick={voltar}>
              Voltar
            </button>
          </>
        )}

        {etapa === 4 && (
          <>
            <h2>Os teus dados</h2>
            <p>
              {servicoSelecionado} ·{" "}
              {new Date(`${dataSelecionada}T12:00:00`).toLocaleDateString(
                "pt-PT",
                {
                  day: "numeric",
                  month: "long",
                },
              )}{" "}
              às {horarioSelecionado}
            </p>

            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                setConfirmada(true);
                setEtapa(5);
              }}
            >
              <label>
                Nome
                <input
                  value={nomeCliente}
                  onChange={(event) => setNomeCliente(event.target.value)}
                  required
                />
              </label>

              <label>
                Telefone ou email
                <input
                  value={contactoCliente}
                  onChange={(event) => setContactoCliente(event.target.value)}
                  required
                />
              </label>

              <button type="submit">Confirmar marcação</button>
            </form>

            <button className={styles.backButton} type="button" onClick={voltar}>
              Voltar
            </button>
          </>
        )}

        {etapa === 5 && confirmada && (
          <div className={styles.confirmation}>
            <h2>Marcação confirmada!</h2>
            <p>Cliente: {nomeCliente}</p>
            <p>Contacto: {contactoCliente}</p>
            <p>Serviço: {servicoSelecionado}</p>
            <p>
              Data:{" "}
              {new Date(`${dataSelecionada}T12:00:00`).toLocaleDateString(
                "pt-PT",
              )}
            </p>
            <p>Horário: {horarioSelecionado}</p>
          </div>
        )}
      </section>
    </main>
  );
}
