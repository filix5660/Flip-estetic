import Link from "next/link";
import { sair } from "@/app/(auth)/acoes";
import { supabaseConfigurado } from "@/lib/supabase/config";
import styles from "./navegacao-gestao.module.css";

export default function NavegacaoGestao() {
  return (
    <nav className={styles.nav} aria-label="Navegação da gestão">
      <Link href="/gestao">Início</Link>
      <Link href="/gestao/agenda">Agenda</Link>
      <Link href="/gestao/servicos">Serviços</Link>
      <Link href="/gestao/horarios">Horários</Link>
      <Link href="/gestao/pagina-publica">Página pública</Link>
      {supabaseConfigurado && (
        <form className={styles.signOut} action={sair}>
          <button type="submit">Sair</button>
        </form>
      )}
    </nav>
  );
}
