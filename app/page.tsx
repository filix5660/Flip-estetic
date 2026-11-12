import Link from "next/link";
import { listarSaloesDeExemplo } from "@/lib/dados";
import { nomesTipoSalao } from "@/lib/modelo";
import { supabaseConfigurado } from "@/lib/supabase/config";
import styles from "./page.module.css";

export default async function Inicio() {
  const saloesDeExemplo = await listarSaloesDeExemplo();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p>FLIP</p>
        <h1>A gestão do teu salão, num só sítio.</h1>
        <p>
          Marcações online, agenda da equipa e o resumo do que ganhaste em cada
          dia. Para salões de estética, cabeleireiros e barbearias.
        </p>
      </header>

      {supabaseConfigurado ? (
        <section className={styles.card}>
          <h2>Começa agora</h2>
          <Link className={styles.primaryLink} href="/criar-conta">
            Criar conta grátis
          </Link>
          <p className={styles.secondary}>
            Já tens conta? <Link href="/entrar">Entrar</Link>
          </p>
        </section>
      ) : (
        <section className={styles.card}>
          <h2>Experimenta a demonstração</h2>

          <Link className={styles.primaryLink} href="/gestao">
            Abrir a área de gestão
          </Link>

          <h3>Páginas de marcação de exemplo</h3>
          <ul className={styles.list}>
            {saloesDeExemplo.map((salao) => (
              <li key={salao.id}>
                <Link href={`/${salao.slug}`}>
                  <strong>{salao.nome}</strong>
                  <span>
                    {nomesTipoSalao[salao.tipo]} · /{salao.slug}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
