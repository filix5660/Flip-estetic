"use client";

import { useState } from "react";
import NavegacaoGestao from "../navegacao-gestao";
import styles from "./page.module.css";

const servicosIniciais = [
  { nome: "Corte de cabelo", duracao: "30", preco: "15" },
  { nome: "Barba", duracao: "20", preco: "10" },
  { nome: "Corte + barba", duracao: "45", preco: "22" },
];

export default function ServicosPage() {
  const [servicos, setServicos] = useState(servicosIniciais);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [indiceEmEdicao, setIndiceEmEdicao] = useState<number | null>(null);
  const [nome, setNome] = useState("");
  const [duracao, setDuracao] = useState("");
  const [preco, setPreco] = useState("");

  function limparFormulario() {
    setNome("");
    setDuracao("");
    setPreco("");
    setIndiceEmEdicao(null);
    setFormularioAberto(false);
  }

  function abrirEdicao(indice: number) {
    const servico = servicos[indice];

    setNome(servico.nome);
    setDuracao(servico.duracao);
    setPreco(servico.preco);
    setIndiceEmEdicao(indice);
    setFormularioAberto(true);
  }

  function guardarServico(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const novoServico = { nome, duracao, preco };

    if (indiceEmEdicao === null) {
      setServicos((atuais) => [...atuais, novoServico]);
    } else {
      setServicos((atuais) =>
        atuais.map((servico, indice) =>
          indice === indiceEmEdicao ? novoServico : servico,
        ),
      );
    }

    limparFormulario();
  }

  function removerServico(indiceParaRemover: number) {
    setServicos((atuais) =>
      atuais.filter((_, indice) => indice !== indiceParaRemover),
    );
    limparFormulario();
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p>ÁREA DO NEGÓCIO</p>
        <h1>Serviços</h1>
        <p>Consulta e gere os serviços oferecidos pelo teu negócio.</p>
      </header>

      <NavegacaoGestao />

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Os teus serviços</h2>

          <button
            className={styles.addButton}
            type="button"
            onClick={() => {
              if (formularioAberto) {
                limparFormulario();
              } else {
                setIndiceEmEdicao(null);
                setNome("");
                setDuracao("");
                setPreco("");
                setFormularioAberto(true);
              }
            }}
          >
            {formularioAberto ? "Cancelar" : "+ Adicionar"}
          </button>
        </div>

        {formularioAberto && (
          <form className={styles.form} onSubmit={guardarServico}>
            <h3>
              {indiceEmEdicao === null ? "Novo serviço" : "Editar serviço"}
            </h3>

            <label>
              Nome do serviço
              <input
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                placeholder="Ex.: Corte de cabelo"
                required
              />
            </label>

            <div className={styles.fields}>
              <label>
                Duração (minutos)
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={duracao}
                  onChange={(event) => setDuracao(event.target.value)}
                  placeholder="30"
                  required
                />
              </label>

              <label>
                Preço (€)
                <input
                  type="number"
                  min="0"
                  step="0.50"
                  value={preco}
                  onChange={(event) => setPreco(event.target.value)}
                  placeholder="15"
                  required
                />
              </label>
            </div>

            <button type="submit">
              {indiceEmEdicao === null
                ? "Adicionar serviço"
                : "Guardar alterações"}
            </button>
          </form>
        )}

        {servicos.map((servico, indice) => (
          <article className={styles.service} key={`${servico.nome}-${indice}`}>
            <div>
              <h3>{servico.nome}</h3>
              <p>
                {servico.duracao} min · {servico.preco} €
              </p>
            </div>

            <div className={styles.actions}>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => abrirEdicao(indice)}
              >
                Editar
              </button>
              <button
                className={styles.removeButton}
                type="button"
                onClick={() => removerServico(indice)}
              >
                Remover
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
