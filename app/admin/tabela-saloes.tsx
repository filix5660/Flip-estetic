"use client";

import { useState, useTransition } from "react";
import { definirPlano } from "./acoes";
import styles from "./page.module.css";

export type SalaoAdmin = {
  id: string;
  slug: string;
  nome: string;
  plano: string;
  criadoEm: string;
  emailDono: string;
  totalMarcacoes: number;
  marcacoes30Dias: number;
  cortesia: boolean;
  notaCortesia: string;
};

type Props = {
  saloes: SalaoAdmin[];
  planos: { id: string; nome: string }[];
};

const formatoData = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Lisbon",
});

function LinhaSalao({ salao, planos }: { salao: SalaoAdmin; planos: Props["planos"] }) {
  const [plano, setPlano] = useState(salao.plano);
  const [cortesia, setCortesia] = useState(salao.cortesia);
  const [nota, setNota] = useState(salao.notaCortesia);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [aGuardar, iniciarTransicao] = useTransition();

  const alterado =
    plano !== salao.plano || cortesia !== salao.cortesia || (cortesia && nota !== salao.notaCortesia);

  function guardar() {
    setMensagem(null);
    iniciarTransicao(async () => {
      const resultado = await definirPlano({ salaoId: salao.id, plano, cortesia, nota });
      setMensagem(
        resultado.ok ? { tipo: "ok", texto: "Guardado." } : { tipo: "erro", texto: resultado.erro },
      );
    });
  }

  return (
    <tr>
      <td>
        <a href={`/${salao.slug}`} target="_blank" rel="noreferrer" className={styles.nome}>
          {salao.nome}
        </a>
        <span className={styles.secundario}>/{salao.slug}</span>
      </td>
      <td>
        <span className={styles.email}>{salao.emailDono || "—"}</span>
        <span className={styles.secundario}>
          desde {salao.criadoEm ? formatoData.format(new Date(salao.criadoEm)) : "—"}
        </span>
      </td>
      <td className={styles.numero}>
        {salao.totalMarcacoes}
        <span className={styles.secundario}>{salao.marcacoes30Dias} nos últimos 30 dias</span>
      </td>
      <td>
        <select
          value={plano}
          onChange={(e) => setPlano(e.target.value)}
          aria-label={`Plano de ${salao.nome}`}
        >
          {planos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </td>
      <td>
        <label className={styles.cortesia}>
          <input
            type="checkbox"
            checked={cortesia}
            onChange={(e) => setCortesia(e.target.checked)}
          />
          Cortesia
        </label>
        {cortesia && (
          <input
            className={styles.nota}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            maxLength={200}
            placeholder="Nota (ex.: parceria)"
            aria-label={`Nota de cortesia de ${salao.nome}`}
          />
        )}
      </td>
      <td>
        <button type="button" onClick={guardar} disabled={!alterado || aGuardar}>
          {aGuardar ? "A guardar…" : "Guardar"}
        </button>
        {mensagem && (
          <span
            className={mensagem.tipo === "ok" ? styles.ok : styles.erro}
            role={mensagem.tipo === "erro" ? "alert" : "status"}
          >
            {mensagem.texto}
          </span>
        )}
      </td>
    </tr>
  );
}

export default function TabelaSaloes({ saloes, planos }: Props) {
  const [filtro, setFiltro] = useState("");
  const termo = filtro.trim().toLowerCase();
  const visiveis = termo
    ? saloes.filter((s) =>
        [s.nome, s.slug, s.emailDono].some((v) => v.toLowerCase().includes(termo)),
      )
    : saloes;

  return (
    <section className={styles.cartao}>
      <input
        className={styles.pesquisa}
        type="search"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        placeholder="Procurar por nome, endereço ou email"
        aria-label="Procurar salões"
      />

      {visiveis.length === 0 ? (
        <p className={styles.vazio}>Nenhum salão encontrado.</p>
      ) : (
        <div className={styles.tabelaContentor}>
          <table className={styles.tabela}>
            <thead>
              <tr>
                <th>Salão</th>
                <th>Dono</th>
                <th>Marcações</th>
                <th>Plano</th>
                <th>Cortesia</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visiveis.map((s) => (
                <LinhaSalao key={s.id} salao={s} planos={planos} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
