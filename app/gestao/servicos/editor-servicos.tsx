"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  centimosParaCampo,
  eurosParaCentimos,
  formatarDuracao,
  formatarEuros,
} from "@/lib/formatar";
import type { IdPlano, Servico } from "@/lib/modelo";
import { limiteAtingido, planos } from "@/lib/planos";
import {
  guardarServico as guardarNoServidor,
  removerServico as removerNoServidor,
} from "../acoes";
import styles from "./page.module.css";

type Props = {
  plano: IdPlano;
  servicosIniciais: Servico[];
};

export default function EditorServicos({ plano, servicosIniciais }: Props) {
  const [servicos, setServicos] = useState(servicosIniciais);
  const [aGuardar, iniciarTransicao] = useTransition();
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [idEmEdicao, setIdEmEdicao] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [duracao, setDuracao] = useState("");
  const [preco, setPreco] = useState("");
  const [erro, setErro] = useState("");
  const [erroLista, setErroLista] = useState("");

  const noLimite = limiteAtingido(plano, "servicos", servicos.length);

  function limparFormulario() {
    setNome("");
    setDuracao("");
    setPreco("");
    setErro("");
    setIdEmEdicao(null);
    setFormularioAberto(false);
  }

  function abrirNovo() {
    limparFormulario();
    setFormularioAberto(true);
  }

  function abrirEdicao(servico: Servico) {
    setNome(servico.nome);
    setDuracao(String(servico.duracaoMinutos));
    setPreco(centimosParaCampo(servico.precoCentimos));
    setErro("");
    setIdEmEdicao(servico.id);
    setFormularioAberto(true);
  }

  function guardarServico(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const precoCentimos = eurosParaCentimos(preco);
    const duracaoMinutos = Number(duracao);
    if (precoCentimos === null || !Number.isInteger(duracaoMinutos) || duracaoMinutos <= 0) {
      setErro("Verifica a duração e o preço.");
      return;
    }

    setErro("");
    iniciarTransicao(async () => {
      const resultado = await guardarNoServidor({
        id: idEmEdicao ?? undefined,
        nome: nome.trim(),
        duracaoMinutos,
        precoCentimos,
      });
      if (!resultado.ok) {
        setErro(resultado.erro);
        return;
      }

      const guardado = resultado.dados;
      setServicos((atuais) =>
        atuais.some((s) => s.id === guardado.id)
          ? atuais.map((s) => (s.id === guardado.id ? guardado : s))
          : [...atuais, guardado],
      );
      limparFormulario();
    });
  }

  function removerServico(id: string) {
    setErroLista("");
    iniciarTransicao(async () => {
      const resultado = await removerNoServidor(id);
      if (!resultado.ok) {
        setErroLista(resultado.erro);
        return;
      }
      setServicos((atuais) => atuais.filter((s) => s.id !== id));
      limparFormulario();
    });
  }

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>Os teus serviços</h2>

        <button
          className={styles.addButton}
          type="button"
          onClick={formularioAberto ? limparFormulario : abrirNovo}
          disabled={!formularioAberto && noLimite}
        >
          {formularioAberto ? "Cancelar" : "+ Adicionar"}
        </button>
      </div>

      {noLimite && !formularioAberto && (
        <p className={styles.limit}>
          O plano {planos[plano].nome} permite até{" "}
          {planos[plano].limites.servicos} serviços. Muda de plano para
          adicionar mais.
        </p>
      )}

      {formularioAberto && (
        <form className={styles.form} onSubmit={guardarServico}>
          <h3>{idEmEdicao === null ? "Novo serviço" : "Editar serviço"}</h3>

          <label>
            Nome do serviço
            <input
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              placeholder="Ex.: Manicure"
              maxLength={60}
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

          {erro && (
            <p className={styles.error} role="alert">
              {erro}
            </p>
          )}

          <button type="submit" disabled={aGuardar}>
            {idEmEdicao === null ? "Adicionar serviço" : "Guardar alterações"}
          </button>
        </form>
      )}

      {erroLista && (
        <p className={styles.error} role="alert">
          {erroLista}
        </p>
      )}

      {servicos.map((servico) => (
        <article className={styles.service} key={servico.id}>
          <div>
            <h3>{servico.nome}</h3>
            <p>
              {formatarDuracao(servico.duracaoMinutos)} ·{" "}
              {formatarEuros(servico.precoCentimos)}
            </p>
          </div>

          <div className={styles.actions}>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={() => abrirEdicao(servico)}
            >
              Editar
            </button>
            <button
              className={styles.removeButton}
              type="button"
              onClick={() => removerServico(servico.id)}
              disabled={aGuardar}
            >
              Remover
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
