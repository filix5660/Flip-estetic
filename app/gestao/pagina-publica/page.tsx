"use client";
import { useState, type FormEvent, type CSSProperties } from "react";
import NavegacaoGestao from "../navegacao-gestao";
import styles from "./page.module.css";

export default function PaginaPublicaPage() {
  const [nome, setNome] = useState("Barbearia Central");
  const [apresentacao, setApresentacao] = useState(
    "Cortes e cuidados com atenção ao detalhe.",
  );
  const [morada, setMorada] = useState("Rua das Flores, 24 · Lisboa");
  const [telefone, setTelefone] = useState("+351 912 345 678");
  const [mensagem, setMensagem] = useState("");
  const [logotipo, setLogotipo] = useState<string | null>(null);
  const [corPrincipal, setCorPrincipal] = useState("#29251f");

  function guardarPagina(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMensagem("Alterações guardadas nesta sessão.");
  }

  const iniciais = nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p>ÁREA DO NEGÓCIO</p>
        <h1>Página pública</h1>
        <p>Personaliza o que os clientes veem antes de fazer uma marcação.</p>
      </header>

      <NavegacaoGestao />

      <div className={styles.content}>
        <section className={styles.card}>
          <h2>Informações do negócio</h2>
          <p className={styles.description}>
            Estes dados aparecem na tua página de marcação.
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
              />
            </label>
            <label>
              Logótipo
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

            <button className={styles.saveButton} type="submit">
              Guardar alterações
            </button>
            {mensagem && (
              <p className={styles.message} role="status">
                {mensagem}
              </p>
            )}
          </form>
        </section>

        <section
          className={styles.card}
          aria-label="Pré-visualização da página"
        >
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
            <div className={styles.serviceRow}>
              <span>Corte de cabelo</span>
              <span>30 min · 15 €</span>
            </div>
            <div className={styles.serviceRow}>
              <span>Barba</span>
              <span>20 min · 10 €</span>
            </div>
            <button className={styles.previewButton} type="button">
              Marcar um serviço
            </button>
            {telefone && <p className={styles.contact}>Contacto: {telefone}</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
