import {
  listarClientes,
  listarMarcacoes,
  listarProfissionais,
  listarServicos,
  obterAgora,
} from "@/lib/dados";
import { somarDias } from "@/lib/datas";
import { obterSalaoDaSessao } from "@/lib/sessao";
import NavegacaoGestao from "../navegacao-gestao";
import AgendaDiaria from "./agenda-diaria";
import styles from "./page.module.css";

export default async function AgendaPage() {
  const salao = await obterSalaoDaSessao();
  const { hoje } = await obterAgora(salao.fusoHorario);

  const [marcacoes, servicos, profissionais, clientes] = await Promise.all([
    listarMarcacoes(salao.id, somarDias(hoje, -30), somarDias(hoje, 60)),
    listarServicos(salao.id),
    listarProfissionais(salao.id),
    listarClientes(salao.id),
  ]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p>ÁREA DO NEGÓCIO</p>
        <h1>Agenda</h1>
        <p>Consulta as marcações e confirma os atendimentos concluídos.</p>
      </header>

      <NavegacaoGestao />

      <AgendaDiaria
        hoje={hoje}
        marcacoesIniciais={marcacoes}
        servicos={servicos}
        profissionais={profissionais}
        clientes={clientes}
      />
    </main>
  );
}
