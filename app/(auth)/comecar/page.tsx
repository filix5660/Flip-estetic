import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { obterSalaoOpcional, obterUtilizador } from "@/lib/sessao";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { sair } from "../acoes";
import styles from "../auth.module.css";
import { FormCriarSalao } from "../formularios";

export const metadata: Metadata = { title: "Criar o teu salão | Flip" };

export default async function ComecarPage() {
  if (!supabaseConfigurado) redirect("/gestao");

  const utilizador = await obterUtilizador();
  if (!utilizador) redirect("/entrar");

  const salao = await obterSalaoOpcional();
  if (salao) redirect("/gestao");

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/">FLIP</Link>
        <h1>Cria o teu salão</h1>
        <p>Só falta isto. Podes mudar o resto mais tarde na área de gestão.</p>
      </header>

      <section className={styles.card}>
        <FormCriarSalao />
      </section>

      <form className={styles.signOut} action={sair}>
        <button type="submit">Sair desta conta</button>
      </form>
    </main>
  );
}
