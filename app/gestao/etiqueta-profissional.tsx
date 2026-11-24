import type { CSSProperties } from "react";
import type { Profissional } from "@/lib/modelo";
import styles from "./etiqueta-profissional.module.css";

/** Cores suaves, com texto escuro legível (contraste AA sobre o fundo). */
const PALETA = [
  { fundo: "#e3edf7", texto: "#1f4a73", forte: "#3b6ea5" },
  { fundo: "#f6e6ec", texto: "#7a2948", forte: "#b04d74" },
  { fundo: "#e4f1e6", texto: "#255b31", forte: "#3f8a4f" },
  { fundo: "#f8ecdc", texto: "#74461a", forte: "#b9792f" },
  { fundo: "#ece7f6", texto: "#4a3478", forte: "#7559b0" },
  { fundo: "#e0f1f0", texto: "#1d5a56", forte: "#2f8c85" },
] as const;

export type CorProfissional = (typeof PALETA)[number];

/**
 * Uma cor fixa para cada pessoa da equipa. Ordena por id (que não muda ao
 * renomear nem ao desativar), para a mesma pessoa ter sempre a mesma cor.
 */
export function coresDaEquipa(equipa: Pick<Profissional, "id">[]) {
  const ids = equipa.map((p) => p.id).sort();
  return new Map(ids.map((id, i) => [id, PALETA[i % PALETA.length]]));
}

export const COR_NEUTRA: CorProfissional = PALETA[0];

export default function EtiquetaProfissional({
  nome,
  cor,
}: {
  nome: string;
  cor: CorProfissional;
}) {
  return (
    <div
      className={styles.etiqueta}
      style={{ "--fundo": cor.fundo, "--texto": cor.texto, "--forte": cor.forte } as CSSProperties}
      title={`Profissional: ${nome}`}
    >
      <b className={styles.inicial} aria-hidden="true">
        {nome.trim().charAt(0).toUpperCase() || "?"}
      </b>
      <b className={styles.nome}>
        <i className={styles.paraLeitor}>Profissional: </i>
        {nome || "Sem profissional"}
      </b>
    </div>
  );
}
