"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { nomesTipoSalao, type TipoSalao } from "@/lib/modelo";
import { criarConta, criarSalao, entrar, type EstadoFormulario } from "./acoes";
import styles from "./auth.module.css";

function Avisos({ estado }: { estado: EstadoFormulario }) {
  return (
    <>
      {estado?.erro && (
        <p className={styles.error} role="alert">
          {estado.erro}
        </p>
      )}
      {estado?.mensagem && (
        <p className={styles.message} role="status">
          {estado.mensagem}
        </p>
      )}
    </>
  );
}

export function FormEntrar() {
  const [estado, acao, aEnviar] = useActionState(entrar, null);

  return (
    <form className={styles.form} action={acao}>
      <label>
        Email
        <input name="email" type="email" autoComplete="email" maxLength={254} required />
      </label>
      <label>
        Palavra-passe
        <input
          name="palavraPasse"
          type="password"
          autoComplete="current-password"
          maxLength={200}
          required
        />
      </label>

      <Avisos estado={estado} />

      <button type="submit" disabled={aEnviar}>
        {aEnviar ? "A entrar…" : "Entrar"}
      </button>
      <p className={styles.alternative}>
        Ainda não tens conta? <Link href="/criar-conta">Criar conta</Link>
      </p>
    </form>
  );
}

export function FormCriarConta({ minimo }: { minimo: number }) {
  const [estado, acao, aEnviar] = useActionState(criarConta, null);

  if (estado?.mensagem) {
    return (
      <div className={styles.form}>
        <Avisos estado={estado} />
        <p className={styles.alternative}>
          Já confirmaste? <Link href="/entrar">Entrar</Link>
        </p>
      </div>
    );
  }

  return (
    <form className={styles.form} action={acao}>
      <label>
        Email
        <input name="email" type="email" autoComplete="email" maxLength={254} required />
      </label>
      <label>
        Palavra-passe
        <input
          name="palavraPasse"
          type="password"
          autoComplete="new-password"
          minLength={minimo}
          maxLength={72}
          required
        />
        <span className={styles.hint}>
          Pelo menos {minimo} caracteres. Uma frase longa é melhor do que símbolos difíceis.
        </span>
      </label>

      <Avisos estado={estado} />

      <button type="submit" disabled={aEnviar}>
        {aEnviar ? "A criar…" : "Criar conta"}
      </button>
      <p className={styles.alternative}>
        Já tens conta? <Link href="/entrar">Entrar</Link>
      </p>
    </form>
  );
}

/** "Estúdio Bela & Cia" → "estudio-bela-cia" */
function sugerirSlug(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
}

export function FormCriarSalao() {
  const [estado, acao, aEnviar] = useActionState(criarSalao, null);
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEditado, setSlugEditado] = useState(false);

  return (
    <form className={styles.form} action={acao}>
      <label>
        Nome do salão
        <input
          name="nome"
          value={nome}
          onChange={(event) => {
            setNome(event.target.value);
            if (!slugEditado) setSlug(sugerirSlug(event.target.value));
          }}
          minLength={2}
          maxLength={50}
          required
        />
      </label>

      <label>
        Tipo de negócio
        <select name="tipo" defaultValue="cabeleireiro">
          {(Object.keys(nomesTipoSalao) as TipoSalao[]).map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo === "outro" ? "Outro" : nomesTipoSalao[tipo]}
            </option>
          ))}
        </select>
      </label>

      <label>
        Endereço da tua página de marcações
        <input
          name="slug"
          value={slug}
          onChange={(event) => {
            setSlug(event.target.value.toLowerCase());
            setSlugEditado(true);
          }}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          minLength={3}
          maxLength={40}
          autoCapitalize="none"
          spellCheck={false}
          required
        />
        <span className={styles.hint}>
          Os clientes marcam em /{slug || "o-teu-salao"}. Não pode ser alterado depois.
        </span>
      </label>

      <label>
        O teu nome (como aparece na agenda)
        <input name="nomeProfissional" autoComplete="given-name" maxLength={60} required />
      </label>

      <Avisos estado={estado} />

      <button type="submit" disabled={aEnviar}>
        {aEnviar ? "A criar…" : "Criar salão"}
      </button>
    </form>
  );
}
