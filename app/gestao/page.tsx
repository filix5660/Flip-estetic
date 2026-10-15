import NavegacaoGestao from "./navegacao-gestao";
import styles from "./page.module.css";

export default function GestaoPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p>ÁREA DO NEGÓCIO</p>
        <h1>Painel de gestão</h1>
        <p>Resumo de hoje na Barbearia Central.</p>
      </header>

      <NavegacaoGestao />

      <section className={styles.summary}>
        <h2>Hoje</h2>

        <article>
          <h3>Agendamentos</h3>
          <p>8</p>
        </article>

        <article>
          <h3>Próximo horário</h3>
          <p>10:30 · Corte de cabelo</p>
        </article>

        <article>
          <h3>Horários livres</h3>
          <p>4</p>
        </article>
      </section>

      <section className={styles.agenda}>
        <h2>Agenda de hoje</h2>
        <div className={styles.timeline}>
          <div className={styles.timeRow}>
            <span>09:00</span>
            <div className={styles.free}>Livre</div>
          </div>

          <div className={styles.timeRow}>
            <span>10:00</span>
            <div className={styles.busy}>
              <strong>10:00 – 10:30</strong>
              <span>João · Corte de cabelo</span>
            </div>
          </div>

          <div className={styles.timeRow}>
            <span>11:00</span>
            <div className={styles.busy}>
              <strong>11:00 – 11:20</strong>
              <span>Rui · Barba</span>
            </div>
          </div>

          <div className={styles.timeRow}>
            <span>12:00</span>
            <div className={styles.free}>Livre</div>
          </div>
        </div>
      </section>
    </main>
  );
}
