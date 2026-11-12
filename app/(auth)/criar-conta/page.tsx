import type { Metadata } from "next";
import Link from "next/link";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { PALAVRA_PASSE_MINIMO } from "@/lib/validacao";
import styles from "../auth.module.css";
import { FormCriarConta } from "../formularios";

export const metadata: Metadata = { title: "Criar conta | Flip" };

export default function CriarContaPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/">FLIP</Link>
        <h1>Criar conta</h1>
        <p>Começa com o plano de demonstração, sem custos.</p>
      </header>

      <section className={styles.card}>
        {!supabaseConfigurado && (
          <p className={styles.notice}>
            Modo de demonstração: as contas ainda não estão ativas.
          </p>
        )}
        <FormCriarConta minimo={PALAVRA_PASSE_MINIMO} />
      </section>
    </main>
  );
}
