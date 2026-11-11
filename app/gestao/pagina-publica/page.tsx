import { listarServicos } from "@/lib/dados";
import { planos } from "@/lib/planos";
import { obterSalaoDaSessao } from "@/lib/sessao";
import NavegacaoGestao from "../navegacao-gestao";
import EditorPagina from "./editor-pagina";
import styles from "./page.module.css";

export default async function PaginaPublicaPage() {
  const salao = await obterSalaoDaSessao();
  const servicos = await listarServicos(salao.id);
  const plano = planos[salao.plano];

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p>ÁREA DO NEGÓCIO</p>
        <h1>Página pública</h1>
        <p>Personaliza o que os clientes veem antes de fazer uma marcação.</p>
      </header>

      <NavegacaoGestao />

      <EditorPagina
        salao={salao}
        servicos={servicos.filter((s) => s.ativo)}
        nomePlano={plano.nome}
        permiteLogotipoECor={plano.recursos.logotipoECor}
      />
    </main>
  );
}
