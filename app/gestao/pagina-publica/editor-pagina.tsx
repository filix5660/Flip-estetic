"use client";

import { useState, useTransition, type CSSProperties, type FormEvent } from "react";
import { formatarDuracao, formatarEuros } from "@/lib/formatar";
import type { Salao, Servico } from "@/lib/modelo";
import { guardarPaginaPublica } from "../acoes";
import styles from "./page.module.css";

type Props = {
  salao: Salao;
  servicos: Servico[];
  nomePlano: string;
  permiteLogotipoECor: boolean;
};

export default function EditorPagina({
  salao,
  servicos,
  nomePlano,
  permiteLogotipoECor,
}: Props) {
  const [aGuardar, iniciarTransicao] = useTransition();
  const [erro, setErro] = useState("");
  const [nome, setNome] = useState(salao.nome);
  const [apresentacao, setApresentacao] = useState(salao.apresentacao);
  const [morada, setMorada] = useState(salao.morada);
  const [telefone, setTelefone] = useState(salao.telefone);
  const [mensagem, setMensagem] = useState("");
  const [logotipo, setLogotipo] = useState<string | null>(salao.logotipoUrl);
  const [corPrincipal, setCorPrincipal] = useState(salao.corPrincipal);

  function guardarPagina(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    setMensagem("");
    iniciarTransicao(async () => {
      const resultado = await guardarPaginaPublica({
        nome,
        apresentacao,
        morada,
        telefone,
        corPrincipal,
      });
      if (resultado.ok) setMensagem("Alterações guardadas.");
      else setErro(resultado.erro);
    });
  }

  const iniciais = nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className={styles.content}>
      <section className={styles.card}>
        <h2>Informações do negócio</h2>
        <p className={styles.description}>
          Estes dados aparecem na tua página de marcação:{" "}
          <a href={`/${salao.slug}`} target="_blank" rel="noreferrer">
            /{salao.slug}
          </a>
        </p>

        <form className={styles.form} onSubmit={guardarPagina}>
          <label>
            Nome do salão
            <input
              value={nome}
              onChange={(event) => {
                setNome(event.target.value);
                setMensagem("");
              }}
              maxLength={50}
              required
            />
          </label>

          <label>
            Apresentação
            <textarea
              value={apresentacao}
              onChange={(event) => {
                setApresentacao(event.target.value);
                setMensagem("");
              }}
              rows={3}
              maxLength={140}
              placeholder="Conta aos clientes o que torna o teu negócio especial."
            />
          </label>

          <label>
            Morada
            <input
              value={morada}
              onChange={(event) => {
                setMorada(event.target.value);
                setMensagem("");
              }}
              placeholder="Rua, número e localidade"
              maxLength={120}
            />
          </label>

          <label>
            Telefone ou WhatsApp
            <input
              type="tel"
              value={telefone}
              onChange={(event) => {
                setTelefone(event.target.value);
                setMensagem("");
              }}
              placeholder="+351 900 000 000"
              maxLength={30}
            />
          </label>

          {permiteLogotipoECor ? (
            <>
              <label>
                Logótipo (só pré-visualização por agora)
                <input
                  className={styles.fileInput}
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const ficheiro = event.target.files?.[0];
                    if (!ficheiro) return;

                    const leitor = new FileReader();
                    leitor.onload = () => {
                      if (typeof leitor.result === "string") {
                        setLogotipo(leitor.result);
                      }
                    };
                    leitor.readAsDataURL(ficheiro);
                  }}
                />
              </label>
              <label>
                Cor principal
                <span className={styles.colorControl}>
                  <input
                    className={styles.colorPicker}
                    type="color"
                    value={corPrincipal}
                    onChange={(event) => setCorPrincipal(event.target.value)}
                  />
                  <span>{corPrincipal.toUpperCase()}</span>
                </span>
              </label>
            </>
          ) : (
            <p className={styles.description}>
              Logótipo e cor personalizada não estão incluídos no plano{" "}
              {nomePlano}.
            </p>
          )}

          {erro && (
            <p className={styles.error} role="alert">
              {erro}
            </p>
          )}

          <button className={styles.saveButton} type="submit" disabled={aGuardar}>
            Guardar alterações
          </button>
          {mensagem && (
            <p className={styles.message} role="status">
              {mensagem}
            </p>
          )}
        </form>
      </section>

      <section className={styles.card} aria-label="Pré-visualização da página">
        <div className={styles.previewHeading}>
          <div>
            <p className={styles.eyebrow}>PRÉ-VISUALIZAÇÃO</p>
            <h2>A tua página</h2>
          </div>
          <span className={styles.liveBadge}>Online</span>
        </div>

        <div
          className={styles.preview}
          style={{ "--cor-principal": corPrincipal } as CSSProperties}
        >
          <div className={styles.brandMark}>
            {logotipo ? (
              // Pré-visualização de um ficheiro local (data URL): next/image não se aplica.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className={styles.logoImage}
                src={logotipo}
                alt={`Logótipo de ${nome || "salão"}`}
              />
            ) : (
              iniciais || "S"
            )}
          </div>
          <h3>{nome || "Nome do salão"}</h3>
          <p className={styles.previewIntro}>
            {apresentacao || "A apresentação do teu negócio aparece aqui."}
          </p>
          {morada && <p className={styles.location}>{morada}</p>}

          <div className={styles.previewDivider} />

          <h4>Serviços disponíveis</h4>
          {servicos.slice(0, 3).map((servico) => (
            <div className={styles.serviceRow} key={servico.id}>
              <span>{servico.nome}</span>
              <span>
                {formatarDuracao(servico.duracaoMinutos)} ·{" "}
                {formatarEuros(servico.precoCentimos)}
              </span>
            </div>
          ))}
          <button className={styles.previewButton} type="button">
            Marcar um serviço
          </button>
          {telefone && <p className={styles.contact}>Contacto: {telefone}</p>}
        </div>
      </section>
    </div>
  );
}
