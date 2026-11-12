import { listarServicos } from "@/lib/dados";
import { obterSalaoDaSessao } from "@/lib/sessao";
import NavegacaoGestao from "../navegacao-gestao";
import EditorServicos from "./editor-servicos";
import styles from "./page.module.css";

export default async function ServicosPage() {
  const salao = await obterSalaoDaSessao();
  const servicos = await listarServicos(salao.id);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p>ÁREA DO NEGÓCIO</p>
        <h1>Serviços</h1>
        <p>Consulta e gere os serviços oferecidos pelo teu negócio.</p>
      </header>

      <NavegacaoGestao />

      <EditorServicos
        plano={salao.plano}
        servicosIniciais={servicos}
      />
    </main>
  );
}
