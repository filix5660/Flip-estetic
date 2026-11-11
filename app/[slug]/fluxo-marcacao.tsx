"use client";

import { useState, useTransition, type CSSProperties, type FormEvent } from "react";
import { DayPicker } from "react-day-picker";
import { pt } from "react-day-picker/locale";
import "react-day-picker/style.css";
import {
  deDateLocal,
  formatarDataCurta,
  formatarDataNumerica,
  paraDateLocal,
} from "@/lib/datas";
import { formatarDuracao, formatarEuros } from "@/lib/formatar";
import {
  nomesTipoSalao,
  type Data,
  type HorarioSemanal,
  type Hora,
  type Salao,
  type Servico,
} from "@/lib/modelo";
import { criarMarcacao, obterHorariosLivres } from "./acoes";
import styles from "./page.module.css";

type Props = {
  salao: Salao;
  servicos: Servico[];
  horarios: HorarioSemanal[];
  hoje: Data;
  /** false no modo de demonstração: a marcação não fica guardada. */
  guardaMarcacoes: boolean;
};

export default function FluxoMarcacao({
  salao,
  servicos,
  horarios,
  hoje,
  guardaMarcacoes,
}: Props) {
  const [etapa, setEtapa] = useState(0);
  const [servico, setServico] = useState<Servico | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [hora, setHora] = useState<Hora | null>(null);
  const [horariosLivres, setHorariosLivres] = useState<Hora[]>([]);
  const [nomeCliente, setNomeCliente] = useState("");
  const [contactoCliente, setContactoCliente] = useState("");
  const [erro, setErro] = useState("");
  const [aCarregar, iniciarTransicao] = useTransition();

  const diasFechados = horarios.filter((h) => !h.aberto).map((h) => h.diaSemana);

  function voltar() {
    setErro("");
    setEtapa((atual) => Math.max(0, atual - 1));
  }

  // A disponibilidade vem sempre do servidor: é ele que sabe o que está ocupado.
  function carregarHorarios(servicoId: string, dia: Data) {
    setErro("");
    setHorariosLivres([]);
    iniciarTransicao(async () => {
      const resultado = await obterHorariosLivres({
        slug: salao.slug,
        servicoId,
        data: dia,
      });
      if (resultado.ok) setHorariosLivres(resultado.dados);
      else setErro(resultado.erro);
    });
  }

  function confirmar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!servico || !data || !hora) return;

    setErro("");
    iniciarTransicao(async () => {
      const resultado = await criarMarcacao({
        slug: salao.slug,
        servicoId: servico.id,
        data,
        hora,
        nome: nomeCliente,
        contacto: contactoCliente,
      });
      if (resultado.ok) setEtapa(5);
      else setErro(resultado.erro);
    });
  }

  const resumo =
    servico && data
      ? `${servico.nome} · ${formatarDataCurta(data)}${hora ? ` às ${hora}` : ""}`
      : "";

  return (
    <main
      className={styles.page}
      style={
        {
          "--color-button": salao.corPrincipal,
          "--color-button-hover": salao.corPrincipal,
          "--color-accent": salao.corPrincipal,
        } as CSSProperties
      }
    >
      <header className={styles.header}>
        <p>{nomesTipoSalao[salao.tipo].toUpperCase()}</p>
        <h1>{salao.nome}</h1>
        <p>{salao.apresentacao}</p>
        {salao.morada && <p className={styles.details}>{salao.morada}</p>}
      </header>

      <section className={styles.card}>
        {etapa === 0 && (
          <>
            <h2>Os nossos serviços</h2>

            {servicos.length === 0 && (
              <p className={styles.details}>
                Este salão ainda não tem serviços disponíveis para marcação.
              </p>
            )}

            {servicos.map((s) => (
              <article className={styles.service} key={s.id}>
                <h3>{s.nome}</h3>
                <p>
                  {formatarDuracao(s.duracaoMinutos)} · {formatarEuros(s.precoCentimos)}
                </p>
              </article>
            ))}

            {servicos.length > 0 && (
              <button className={styles.primaryButton} type="button" onClick={() => setEtapa(1)}>
                Marcar horário
              </button>
            )}
          </>
        )}

        {etapa === 1 && (
          <>
            <h2>Escolhe um serviço</h2>

            {servicos.map((s) => (
              <button
                key={s.id}
                className={styles.optionButton}
                type="button"
                onClick={() => {
                  setServico(s);
                  setHora(null);
                  setEtapa(2);
                }}
              >
                {s.nome} · {formatarDuracao(s.duracaoMinutos)} · {formatarEuros(s.precoCentimos)}
              </button>
            ))}

            <button className={styles.backButton} type="button" onClick={voltar}>
              Voltar
            </button>
          </>
        )}

        {etapa === 2 && servico && (
          <>
            <div className={styles.calendar}>
              <h2>Escolhe uma data</h2>
              <DayPicker
                mode="single"
                locale={pt}
                today={paraDateLocal(hoje)}
                selected={data ? paraDateLocal(data) : undefined}
                disabled={[
                  { before: paraDateLocal(hoje) },
                  { dayOfWeek: diasFechados },
                ]}
                onSelect={(dia) => {
                  if (!dia) return;
                  const escolhida = deDateLocal(dia);
                  setData(escolhida);
                  setHora(null);
                  setEtapa(3);
                  carregarHorarios(servico.id, escolhida);
                }}
              />
            </div>

            <button className={styles.backButton} type="button" onClick={voltar}>
              Voltar
            </button>
          </>
        )}

        {etapa === 3 && (
          <>
            <h2>Escolhe um horário</h2>
            <p className={styles.details}>{resumo}</p>

            {aCarregar && <p className={styles.details}>A ver os horários livres…</p>}
            {erro && (
              <p className={styles.error} role="alert">
                {erro}
              </p>
            )}
            {!aCarregar && !erro && horariosLivres.length === 0 && (
              <p className={styles.details}>
                Já não há horários livres neste dia. Escolhe outra data.
              </p>
            )}

            <div className={styles.slots}>
              {horariosLivres.map((h) => (
                <button
                  key={h}
                  className={styles.optionButton}
                  type="button"
                  onClick={() => {
                    setHora(h);
                    setEtapa(4);
                  }}
                >
                  {h}
                </button>
              ))}
            </div>

            <button className={styles.backButton} type="button" onClick={voltar}>
              Voltar
            </button>
          </>
        )}

        {etapa === 4 && (
          <>
            <h2>Os teus dados</h2>
            <p className={styles.details}>{resumo}</p>

            <form className={styles.form} onSubmit={confirmar}>
              <label>
                Nome
                <input
                  value={nomeCliente}
                  onChange={(event) => setNomeCliente(event.target.value)}
                  autoComplete="name"
                  minLength={2}
                  maxLength={80}
                  required
                />
              </label>

              <label>
                Telefone ou email
                <input
                  value={contactoCliente}
                  onChange={(event) => setContactoCliente(event.target.value)}
                  minLength={5}
                  maxLength={120}
                  required
                />
              </label>

              <p className={styles.privacy}>
                O teu nome e contacto são partilhados apenas com {salao.nome}, para
                gerir esta marcação.
              </p>

              {erro && (
                <p className={styles.error} role="alert">
                  {erro}
                </p>
              )}

              <button type="submit" disabled={aCarregar}>
                {aCarregar ? "A confirmar…" : "Confirmar marcação"}
              </button>
            </form>

            <button
              className={styles.backButton}
              type="button"
              onClick={() => {
                voltar();
                if (servico && data) carregarHorarios(servico.id, data);
              }}
            >
              Voltar
            </button>
          </>
        )}

        {etapa === 5 && servico && data && hora && (
          <div className={styles.confirmation}>
            <h2>Marcação confirmada!</h2>
            <p>Cliente: {nomeCliente}</p>
            <p>Contacto: {contactoCliente}</p>
            <p>Serviço: {servico.nome}</p>
            <p>Data: {formatarDataNumerica(data)}</p>
            <p>Horário: {hora}</p>
            {!guardaMarcacoes && (
              <p className={styles.details}>
                Versão de demonstração: a marcação não fica guardada.
              </p>
            )}
          </div>
        )}
      </section>

      {salao.telefone && (
        <p className={styles.footer}>Contacto: {salao.telefone}</p>
      )}
    </main>
  );
}
