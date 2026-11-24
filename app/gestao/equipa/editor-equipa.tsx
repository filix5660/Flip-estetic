"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  diasDaSemana,
  nomesDiaSemana,
  type DiaSemana,
  type HorarioProfissional,
  type HorarioSemanal,
  type IdPlano,
  type Profissional,
} from "@/lib/modelo";
import { limiteAtingido, planos } from "@/lib/planos";
import {
  alterarAtivoProfissional,
  guardarHorarioProfissional,
  guardarProfissional,
} from "../acoes";
import styles from "./page.module.css";

type Props = {
  plano: IdPlano;
  equipaInicial: Profissional[];
  horariosIniciais: HorarioProfissional[];
  horariosSalao: HorarioSemanal[];
};

/** Como o profissional trabalha num dia, no formulário de horário. */
type ModoDia = "salao" | "folga" | "proprio";
type LinhaDia = { modo: ModoDia; entrada: string; saida: string };

export default function EditorEquipa({
  plano,
  equipaInicial,
  horariosIniciais,
  horariosSalao,
}: Props) {
  const [equipa, setEquipa] = useState(equipaInicial);
  const [horarios, setHorarios] = useState(horariosIniciais);
  const [aGuardar, iniciarTransicao] = useTransition();

  // Formulário de nome (novo ou editar)
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [idEmEdicao, setIdEmEdicao] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [erroNome, setErroNome] = useState("");

  // Painel de horário
  const [idHorario, setIdHorario] = useState<string | null>(null);
  const [dias, setDias] = useState<Record<DiaSemana, LinhaDia> | null>(null);
  const [erroHorario, setErroHorario] = useState("");

  const [erroLista, setErroLista] = useState("");
  const [mensagem, setMensagem] = useState("");

  const ativos = equipa.filter((p) => p.ativo).length;
  const noLimite = limiteAtingido(plano, "profissionais", ativos);
  const limite = planos[plano].limites.profissionais;

  const horarioSalao = (dia: DiaSemana) => horariosSalao.find((h) => h.diaSemana === dia);

  function limparMensagens() {
    setErroLista("");
    setMensagem("");
  }

  function fecharFormulario() {
    setFormularioAberto(false);
    setIdEmEdicao(null);
    setNome("");
    setErroNome("");
  }

  function abrirNovo() {
    fecharFormulario();
    setIdHorario(null);
    limparMensagens();
    setFormularioAberto(true);
  }

  function abrirEdicao(p: Profissional) {
    setIdHorario(null);
    limparMensagens();
    setNome(p.nome);
    setErroNome("");
    setIdEmEdicao(p.id);
    setFormularioAberto(true);
  }

  function guardarNome(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErroNome("");
    iniciarTransicao(async () => {
      const resultado = await guardarProfissional({
        id: idEmEdicao ?? undefined,
        nome: nome.trim(),
      });
      if (!resultado.ok) {
        setErroNome(resultado.erro);
        return;
      }
      const guardado = resultado.dados;
      setEquipa((atual) =>
        atual.some((p) => p.id === guardado.id)
          ? atual.map((p) => (p.id === guardado.id ? guardado : p))
          : [...atual, guardado],
      );
      fecharFormulario();
    });
  }

  function alterarAtivo(p: Profissional) {
    limparMensagens();
    iniciarTransicao(async () => {
      const resultado = await alterarAtivoProfissional({ id: p.id, ativo: !p.ativo });
      if (!resultado.ok) {
        setErroLista(resultado.erro);
        return;
      }
      setEquipa((atual) =>
        atual.map((x) => (x.id === p.id ? { ...x, ativo: !p.ativo } : x)),
      );
      if (idHorario === p.id) setIdHorario(null);
    });
  }

  function abrirHorario(p: Profissional) {
    fecharFormulario();
    limparMensagens();
    setErroHorario("");
    if (idHorario === p.id) {
      setIdHorario(null);
      return;
    }

    const linhas = {} as Record<DiaSemana, LinhaDia>;
    for (const dia of diasDaSemana) {
      const salao = horarioSalao(dia);
      const proprio = horarios.find((h) => h.profissionalId === p.id && h.diaSemana === dia);
      linhas[dia] = proprio
        ? {
            modo: proprio.trabalha ? "proprio" : "folga",
            entrada: proprio.entrada,
            saida: proprio.saida,
          }
        : { modo: "salao", entrada: salao?.abertura ?? "09:00", saida: salao?.fecho ?? "18:00" };
    }
    setDias(linhas);
    setIdHorario(p.id);
  }

  function mudarDia(dia: DiaSemana, alteracao: Partial<LinhaDia>) {
    setDias((atual) => (atual ? { ...atual, [dia]: { ...atual[dia], ...alteracao } } : atual));
    setErroHorario("");
  }

  function guardarHorario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dias || !idHorario) return;
    const profissionalId = idHorario;

    const diferentes = diasDaSemana
      .filter((dia) => dias[dia].modo !== "salao" && horarioSalao(dia)?.aberto)
      .map((dia) => ({
        diaSemana: dia,
        trabalha: dias[dia].modo === "proprio",
        entrada: dias[dia].entrada,
        saida: dias[dia].saida,
      }));

    const invalido = diferentes.find((d) => d.trabalha && d.saida <= d.entrada);
    if (invalido) {
      setErroHorario(
        `${nomesDiaSemana[invalido.diaSemana]}: a saída tem de ser depois da entrada.`,
      );
      return;
    }

    iniciarTransicao(async () => {
      const resultado = await guardarHorarioProfissional({ profissionalId, dias: diferentes });
      if (!resultado.ok) {
        setErroHorario(resultado.erro);
        return;
      }
      setHorarios((atual) => [
        ...atual.filter((h) => h.profissionalId !== profissionalId),
        ...diferentes.map((d) => ({ ...d, profissionalId })),
      ]);
      setIdHorario(null);
      setMensagem("Horário guardado.");
    });
  }

  function resumoHorario(p: Profissional) {
    const proprios = horarios.filter((h) => h.profissionalId === p.id);
    if (proprios.length === 0) return "Segue o horário do salão";
    const folgas = proprios.filter((h) => !h.trabalha).length;
    const partes = [];
    if (folgas) partes.push(`${folgas} ${folgas === 1 ? "folga" : "folgas"}`);
    if (proprios.length - folgas) {
      const n = proprios.length - folgas;
      partes.push(`${n} ${n === 1 ? "dia com horário próprio" : "dias com horário próprio"}`);
    }
    return partes.join(" · ");
  }

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>Profissionais</h2>
        <button
          className={styles.addButton}
          type="button"
          onClick={formularioAberto ? fecharFormulario : abrirNovo}
          disabled={!formularioAberto && noLimite}
        >
          {formularioAberto ? "Cancelar" : "+ Adicionar"}
        </button>
      </div>

      {noLimite && !formularioAberto && (
        <p className={styles.limit}>
          O plano {planos[plano].nome} inclui {limite}{" "}
          {limite === 1 ? "profissional" : "profissionais"}. Para adicionar a tua equipa,
          muda para o plano {planos.profissional.nome}.
        </p>
      )}

      {formularioAberto && (
        <form className={styles.form} onSubmit={guardarNome}>
          <h3>{idEmEdicao === null ? "Novo profissional" : "Mudar o nome"}</h3>
          <label>
            Nome
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Joana"
              maxLength={60}
              required
              autoFocus
            />
          </label>
          {idEmEdicao === null && (
            <p className={styles.hint}>
              Começa com o horário do salão. Podes mudar os dias e horas a seguir.
            </p>
          )}
          {erroNome && (
            <p className={styles.error} role="alert">
              {erroNome}
            </p>
          )}
          <button type="submit" disabled={aGuardar}>
            {idEmEdicao === null ? "Adicionar profissional" : "Guardar nome"}
          </button>
        </form>
      )}

      {erroLista && (
        <p className={styles.error} role="alert">
          {erroLista}
        </p>
      )}
      {mensagem && (
        <p className={styles.ok} role="status">
          {mensagem}
        </p>
      )}

      {equipa.map((p) => (
        <article className={styles.pessoa} key={p.id}>
          <div className={styles.linha}>
            <div>
              <h3>
                {p.nome}
                {!p.ativo && <span className={styles.inativo}>Desativado</span>}
              </h3>
              <p>{p.ativo ? resumoHorario(p) : "Não recebe marcações"}</p>
            </div>

            <div className={styles.actions}>
              {p.ativo && (
                <>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={() => abrirHorario(p)}
                    aria-expanded={idHorario === p.id}
                  >
                    Horário
                  </button>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={() => abrirEdicao(p)}
                  >
                    Nome
                  </button>
                </>
              )}
              <button
                className={p.ativo ? styles.removeButton : styles.secondaryButton}
                type="button"
                onClick={() => alterarAtivo(p)}
                disabled={aGuardar || (!p.ativo && noLimite)}
                title={!p.ativo && noLimite ? "Atingiste o limite do teu plano" : undefined}
              >
                {p.ativo ? "Desativar" : "Reativar"}
              </button>
            </div>
          </div>

          {idHorario === p.id && dias && (
            <form className={styles.form} onSubmit={guardarHorario}>
              <h3>Horário de {p.nome}</h3>
              <p className={styles.hint}>
                Por omissão, cada pessoa trabalha no horário do salão. Marca as folgas e os
                dias em que entra ou sai a outra hora.
              </p>

              <div className={styles.dias}>
                {diasDaSemana.map((dia) => {
                  const salao = horarioSalao(dia);
                  const linha = dias[dia];
                  const idCampo = `modo-${p.id}-${dia}`;
                  return (
                    <div className={styles.dia} key={dia}>
                      <label htmlFor={idCampo} className={styles.nomeDia}>
                        {nomesDiaSemana[dia]}
                      </label>
                      {!salao?.aberto ? (
                        <span className={styles.fechado}>Salão fechado</span>
                      ) : (
                        <div className={styles.controlos}>
                          <select
                            id={idCampo}
                            value={linha.modo}
                            onChange={(e) => mudarDia(dia, { modo: e.target.value as ModoDia })}
                          >
                            <option value="salao">
                              Como o salão ({salao.abertura}–{salao.fecho})
                            </option>
                            <option value="folga">Folga</option>
                            <option value="proprio">Outro horário</option>
                          </select>
                          {linha.modo === "proprio" && (
                            <span className={styles.horas}>
                              <input
                                type="time"
                                step={1800}
                                value={linha.entrada}
                                onChange={(e) => mudarDia(dia, { entrada: e.target.value })}
                                aria-label={`${nomesDiaSemana[dia]}: entrada`}
                                required
                              />
                              <span aria-hidden="true">–</span>
                              <input
                                type="time"
                                step={1800}
                                value={linha.saida}
                                onChange={(e) => mudarDia(dia, { saida: e.target.value })}
                                aria-label={`${nomesDiaSemana[dia]}: saída`}
                                required
                              />
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className={styles.hint}>
                As marcações online só aparecem dentro do horário do salão.
              </p>

              {erroHorario && (
                <p className={styles.error} role="alert">
                  {erroHorario}
                </p>
              )}
              <button type="submit" disabled={aGuardar}>
                Guardar horário
              </button>
            </form>
          )}
        </article>
      ))}
    </section>
  );
}
