import { listarBloqueios, obterHorariosSemanais } from "@/lib/dados";
import { obterSalaoDaSessao } from "@/lib/sessao";
import NavegacaoGestao from "../navegacao-gestao";
import EditorHorarios from "./editor-horarios";
import styles from "./page.module.css";

export default async function HorariosPage() {
  const salao = await obterSalaoDaSessao();
  const [horarios, bloqueios] = await Promise.all([
    obterHorariosSemanais(salao.id),
    listarBloqueios(salao.id),
  ]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p>ÁREA DO NEGÓCIO</p>
        <h1>Horários</h1>
        <p>Define os dias e horários de atendimento.</p>
      </header>

      <NavegacaoGestao />

      <EditorHorarios
        horariosIniciais={horarios}
        bloqueiosIniciais={bloqueios}
      />
    </main>
  );
}
