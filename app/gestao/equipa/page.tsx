import type { Metadata } from "next";
import {
  listarEquipa,
  listarHorariosProfissionais,
  obterHorariosSemanais,
} from "@/lib/dados";
import { obterSalaoDaSessao } from "@/lib/sessao";
import NavegacaoGestao from "../navegacao-gestao";
import EditorEquipa from "./editor-equipa";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Equipa | Flip" };

export default async function EquipaPage() {
  const salao = await obterSalaoDaSessao();
  const [equipa, horariosEquipa, horariosSalao] = await Promise.all([
    listarEquipa(salao.id),
    listarHorariosProfissionais(salao.id),
    obterHorariosSemanais(salao.id),
  ]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p>ÁREA DO NEGÓCIO</p>
        <h1>Equipa</h1>
        <p>Quem atende no teu salão, e em que dias e horas trabalha cada pessoa.</p>
      </header>

      <NavegacaoGestao />

      <EditorEquipa
        plano={salao.plano}
        equipaInicial={equipa}
        horariosIniciais={horariosEquipa}
        horariosSalao={horariosSalao}
      />
    </main>
  );
}
