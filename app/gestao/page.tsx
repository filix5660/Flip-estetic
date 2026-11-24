import Link from "next/link";
import {
  listarClientes,
  listarMarcacoes,
  listarEquipa,
  listarServicos,
  obterAgora,
} from "@/lib/dados";
import { formatarDataLonga } from "@/lib/datas";
import { formatarEuros } from "@/lib/formatar";
import { resumirGanhos } from "@/lib/ganhos";
import { planos } from "@/lib/planos";
import { obterSalaoDaSessao } from "@/lib/sessao";
import EtiquetaEstado from "./etiqueta-estado";
import EtiquetaProfissional, { COR_NEUTRA, coresDaEquipa } from "./etiqueta-profissional";
import NavegacaoGestao from "./navegacao-gestao";
import styles from "./page.module.css";

export default async function GestaoPage() {
  const salao = await obterSalaoDaSessao();
  const { hoje, hora } = await obterAgora(salao.fusoHorario);

  const [marcacoes, servicos, equipa, clientes] = await Promise.all([
    listarMarcacoes(salao.id, hoje, hoje),
    listarServicos(salao.id),
    listarEquipa(salao.id),
    listarClientes(salao.id),
  ]);

  // Quem está ativo, mais quem já foi desativado mas tem marcações hoje.
  const profissionais = equipa.filter(
    (p) => p.ativo || marcacoes.some((m) => m.profissionalId === p.id),
  );
  const resumo = resumirGanhos(marcacoes, servicos, profissionais);
  const proxima = marcacoes.find(
    (m) => m.estado === "marcada" && m.inicio >= hora,
  );

  const nomeServico = (id: string) =>
    servicos.find((s) => s.id === id)?.nome ?? "Serviço";
  const nomeCliente = (id: string) =>
    clientes.find((c) => c.id === id)?.nome ?? "Cliente";
  // Cores calculadas com toda a equipa: a mesma pessoa tem a mesma cor na Agenda.
  const cores = coresDaEquipa(equipa);
  const corDe = (id: string) => cores.get(id) ?? COR_NEUTRA;
  const nomeProfissional = (id: string) =>
    profissionais.find((p) => p.id === id)?.nome ?? "";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p>ÁREA DO NEGÓCIO</p>
        <h1>{salao.nome}</h1>
        <p>
          Resumo de {formatarDataLonga(hoje)} ·{" "}
          <span className={styles.plano}>Plano {planos[salao.plano].nome}</span>
        </p>
      </header>

      <NavegacaoGestao />

      <section className={styles.summary}>
        <h2>Hoje</h2>

        <div className={styles.stats}>
          <article>
            <h3>Ganho do dia</h3>
            <p className={styles.bigNumber}>
              {formatarEuros(resumo.ganhoCentimos)}
            </p>
            <p>
              {resumo.concluidas}{" "}
              {resumo.concluidas === 1 ? "atendimento concluído" : "atendimentos concluídos"}
            </p>
          </article>

          <article>
            <h3>Por concluir</h3>
            <p className={styles.bigNumber}>{resumo.porConcluir}</p>
            <p>Previsto: {formatarEuros(resumo.previstoCentimos)}</p>
          </article>

          <article>
            <h3>Próximo atendimento</h3>
            <p className={styles.bigNumber}>{proxima ? proxima.inicio : "—"}</p>
            <p>
              {proxima
                ? `${nomeCliente(proxima.clienteId)} · ${nomeServico(proxima.servicoId)}`
                : "Sem mais marcações hoje"}
            </p>
          </article>
        </div>

        {profissionais.length > 1 && (
          <div className={styles.byProfessional}>
            <h3>Por profissional</h3>
            {resumo.porProfissional.map((p) => (
              <div className={styles.professionalRow} key={p.profissionalId}>
                <span>{p.nome}</span>
                <span>
                  {p.concluidas} · <strong>{formatarEuros(p.ganhoCentimos)}</strong>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.agenda}>
        <div className={styles.agendaHeader}>
          <h2>Agenda de hoje</h2>
          <Link href="/gestao/agenda">Ver agenda</Link>
        </div>

        {marcacoes.length === 0 ? (
          <p className={styles.empty}>Sem marcações hoje.</p>
        ) : (
          <div className={styles.timeline}>
            {marcacoes.map((m) => (
              <div className={styles.timeRow} key={m.id}>
                <span>{m.inicio}</span>
                <div
                  className={styles.busy}
                  style={
                    profissionais.length > 1
                      ? { borderLeftColor: corDe(m.profissionalId).forte }
                      : undefined
                  }
                >
                  <strong>
                    {m.inicio} – {m.fim}
                  </strong>
                  {profissionais.length > 1 && (
                    <EtiquetaProfissional
                      nome={nomeProfissional(m.profissionalId)}
                      cor={corDe(m.profissionalId)}
                    />
                  )}
                  <span>
                    {nomeCliente(m.clienteId)} · {nomeServico(m.servicoId)}
                  </span>
                  <EtiquetaEstado estado={m.estado} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
