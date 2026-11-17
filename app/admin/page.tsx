import type { Metadata } from "next";
import Link from "next/link";
import Logotipo from "@/components/logotipo";
import { planos } from "@/lib/planos";
import styles from "./page.module.css";
import TabelaSaloes, { type SalaoAdmin } from "./tabela-saloes";
import { exigirAdmin } from "./verificar";

export const metadata: Metadata = {
  title: "Painel de controlo | Flip",
  robots: { index: false, follow: false },
};

type Linha = Record<string, unknown>;
const texto = (v: unknown) => (typeof v === "string" ? v : "");
const numero = (v: unknown) => Number(v ?? 0) || 0;

export default async function PainelAdmin() {
  const supabase = await exigirAdmin();

  const { data, error } = await supabase.rpc("admin_listar_saloes");
  if (error) {
    console.error("[admin] listar salões:", error.code, error.message);
    throw new Error("Não foi possível carregar os salões.");
  }

  const saloes: SalaoAdmin[] = ((data ?? []) as Linha[]).map((l) => ({
    id: texto(l.id),
    slug: texto(l.slug),
    nome: texto(l.nome),
    plano: texto(l.plano),
    criadoEm: texto(l.criado_em),
    emailDono: texto(l.email_dono),
    totalMarcacoes: numero(l.total_marcacoes),
    marcacoes30Dias: numero(l.marcacoes_30_dias),
    cortesia: l.cortesia === true,
    notaCortesia: texto(l.nota_cortesia),
  }));

  const porPlano = Object.values(planos).map((p) => ({
    nome: p.nome,
    total: saloes.filter((s) => s.plano === p.id).length,
  }));
  const cortesias = saloes.filter((s) => s.cortesia).length;

  return (
    <main className={styles.pagina}>
      <header className={styles.topo}>
        <Link href="/" className={styles.marca}>
          <Logotipo tamanho={28} />
          Flip
        </Link>
        <span className={styles.etiqueta}>Painel de controlo</span>
      </header>

      <h1>Salões</h1>

      <section className={styles.resumo} aria-label="Resumo">
        <div>
          <span>Total</span>
          <strong>{saloes.length}</strong>
        </div>
        {porPlano.map((p) => (
          <div key={p.nome}>
            <span>{p.nome}</span>
            <strong>{p.total}</strong>
          </div>
        ))}
        <div>
          <span>Cortesias</span>
          <strong>{cortesias}</strong>
        </div>
      </section>

      <p className={styles.ajuda}>
        Para dar uma conta de demonstração a um parceiro: a pessoa cria a conta no site e o
        salão; depois, aqui, escolhe o plano e marca &quot;Cortesia&quot; com uma nota (ex.:
        &quot;Parceria com influencer&quot;). Cada alteração fica registada.
      </p>

      <TabelaSaloes
        saloes={saloes}
        planos={Object.values(planos).map((p) => ({ id: p.id, nome: p.nome }))}
      />
    </main>
  );
}
