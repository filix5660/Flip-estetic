import { nomesEstadoMarcacao, type EstadoMarcacao } from "@/lib/modelo";
import styles from "./etiqueta-estado.module.css";

export default function EtiquetaEstado({ estado }: { estado: EstadoMarcacao }) {
  return (
    <span className={`${styles.etiqueta} ${styles[estado]}`}>
      {nomesEstadoMarcacao[estado]}
    </span>
  );
}
