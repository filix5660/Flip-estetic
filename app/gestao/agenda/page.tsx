"use client";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { useState } from "react";
import NavegacaoGestao from "../navegacao-gestao";
import styles from "./page.module.css";

const diasExemplo = [
  {
    nome: "Quarta-feira, 14 de outubro",
    marcacoes: [
      {
        hora: "09:00",
        cliente: "João",
        servico: "Corte de cabelo",
        duracao: "09:00 – 09:30",
      },
      {
        hora: "10:00",
        cliente: "Rui",
        servico: "Barba",
        duracao: "10:00 – 10:20",
      },
      { hora: "12:00", cliente: "—", servico: "Livre", duracao: "" },
      {
        hora: "14:00",
        cliente: "Miguel",
        servico: "Corte + barba",
        duracao: "14:00 – 14:45",
      },
    ],
  },
  {
    nome: "Quinta-feira, 15 de outubro",
    marcacoes: [
      { hora: "09:00", cliente: "—", servico: "Livre", duracao: "" },
      {
        hora: "10:00",
        cliente: "João",
        servico: "Corte de cabelo",
        duracao: "10:00 – 10:30",
      },
      {
        hora: "11:00",
        cliente: "Rui",
        servico: "Barba",
        duracao: "11:00 – 11:20",
      },
      { hora: "12:00", cliente: "—", servico: "Livre", duracao: "" },
    ],
  },
  {
    nome: "Sexta-feira, 16 de outubro",
    marcacoes: [
      {
        hora: "09:00",
        cliente: "Miguel",
        servico: "Corte + barba",
        duracao: "09:00 – 09:45",
      },
      { hora: "10:00", cliente: "—", servico: "Livre", duracao: "" },
      {
        hora: "11:00",
        cliente: "João",
        servico: "Corte de cabelo",
        duracao: "11:00 – 11:30",
      },
      { hora: "12:00", cliente: "—", servico: "Livre", duracao: "" },
    ],
  },
];

export default function AgendaPage() {
  const [dataEscolhida, setDataEscolhida] = useState(new Date(2026, 9, 15, 12));
  const [indiceDia, setIndiceDia] = useState(1);
  const dia = diasExemplo[indiceDia];

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p>ÁREA DO NEGÓCIO</p>
        <h1>Agenda</h1>
        <p>Consulta as marcações do teu negócio.</p>
      </header>

      <NavegacaoGestao />

      <section className={styles.card}>
        <div className={styles.dayHeader}>
          <button
            className={styles.dayButton}
            type="button"
            onClick={() => {
              setIndiceDia((atual) => Math.max(0, atual - 1));
              setDataEscolhida(
                new Date(2026, 9, 14 + Math.max(0, indiceDia - 1), 12),
              );
            }}
            disabled={indiceDia === 0}
            aria-label="Dia anterior"
          >
            ←
          </button>

          <h2>{dia.nome}</h2>

          <button
            className={styles.dayButton}
            type="button"
            onClick={() => {
              setIndiceDia((atual) =>
                Math.min(diasExemplo.length - 1, atual + 1),
              );
              setDataEscolhida(
                new Date(
                  2026,
                  9,
                  14 + Math.min(diasExemplo.length - 1, indiceDia + 1),
                  12,
                ),
              );
            }}
            disabled={indiceDia === diasExemplo.length - 1}
            aria-label="Próximo dia"
          >
            →
          </button>
        </div>

        <div className={styles.timeline}>
          {dia.marcacoes.map((marcacao, indice) => (
            <div className={styles.timeRow} key={`${marcacao.hora}-${indice}`}>
              <span>{marcacao.hora}</span>

              {marcacao.cliente === "—" ? (
                <div className={styles.free}>Livre</div>
              ) : (
                <div className={styles.busy}>
                  <strong>{marcacao.duracao}</strong>
                  <span>
                    {marcacao.cliente} · {marcacao.servico}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className={styles.calendar}>
          <h3>Ir para uma data</h3>

          <DayPicker
            mode="single"
            selected={dataEscolhida}
            onSelect={(data) => {
              if (!data) return;

              setDataEscolhida(data);

              const indice = diasExemplo.findIndex((dia) =>
                dia.nome.includes(
                  data.toLocaleDateString("pt-PT", {
                    day: "numeric",
                    month: "long",
                  }),
                ),
              );

              if (indice >= 0) {
                setIndiceDia(indice);
              }
            }}
          />
        </div>
      </section>
    </main>
  );
}

