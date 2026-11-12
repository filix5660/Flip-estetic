import type { Metadata } from "next";
import Link from "next/link";
import { supabaseConfigurado } from "@/lib/supabase/config";
import styles from "../auth.module.css";
import { FormEntrar } from "../formularios";

export const metadata: Metadata = { title: "Entrar | Flip" };

// Mensagens fixas: o texto do endereço nunca é mostrado na página.
const AVISOS: Record<string, string> = {
  confirmacao:
    "O link de confirmação é inválido ou já expirou. Entra com a tua conta ou cria uma nova.",
};

export default async function EntrarPage(props: PageProps<"/entrar">) {
  const { erro } = await props.searchParams;
  const aviso = typeof erro === "string" ? AVISOS[erro] : undefined;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/">FLIP</Link>
        <h1>Entrar</h1>
        <p>Acede à área de gestão do teu salão.</p>
      </header>

      <section className={styles.card}>
        {!supabaseConfigurado && (
          <p className={styles.notice}>
            Modo de demonstração: as contas ainda não estão ativas. Podes ver a{" "}
            <Link href="/gestao">área de gestão de exemplo</Link>.
          </p>
        )}
        {aviso && <p className={styles.notice}>{aviso}</p>}
        <FormEntrar />
      </section>
    </main>
  );
}
