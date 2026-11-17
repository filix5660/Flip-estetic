import type { Metadata } from "next";
import Link from "next/link";
import Logotipo from "@/components/logotipo";
import { formatarEuros } from "@/lib/formatar";
import { planos, type Plano } from "@/lib/planos";
import { supabaseConfigurado } from "@/lib/supabase/config";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Flip | Marcações online e gestão para salões",
  description:
    "Página de marcação com o teu endereço, agenda da equipa e resumo do que ganhaste em cada dia. Para salões de beleza, estética e barbearias.",
};

const BENEFICIOS = [
  {
    titulo: "Marcações a qualquer hora",
    texto:
      "Os clientes escolhem o serviço, o dia e a hora na tua página, mesmo com o salão fechado. Sem chamadas nem mensagens.",
  },
  {
    titulo: "Agenda sempre certa",
    texto:
      "Só aparecem horários livres, de acordo com o teu horário e a duração de cada serviço. Nada de marcações sobrepostas.",
  },
  {
    titulo: "Ganho do dia sem folhas de cálculo",
    texto:
      "Marcas o atendimento como concluído e o Flip junta tudo: quanto ganhaste hoje, quantos atendimentos e quanto fez cada profissional.",
  },
  {
    titulo: "Para a equipa toda",
    texto:
      "Cada profissional com a sua agenda. Serve salões de cabeleireiro, estética, unhas e barbearias.",
  },
];

const PASSOS = [
  {
    titulo: "Cria a conta",
    texto: "Escolhe o nome do teu salão e o endereço da tua página. Demora dois minutos.",
  },
  {
    titulo: "Configura os serviços e o horário",
    texto: "Indica o que fazes, quanto tempo demora, o preço e quando trabalhas.",
  },
  {
    titulo: "Partilha o teu link",
    texto: "Põe-no no Instagram, no Google e no WhatsApp. As marcações aparecem na tua agenda.",
  },
];

const PERGUNTAS = [
  {
    pergunta: "Preciso de cartão para começar?",
    resposta:
      "Não. Todas as contas começam no plano Demonstração, que é grátis e serve para organizares a tua agenda: anotas as marcações e vês quanto ganhaste em cada dia. As marcações online pelos clientes começam no plano Essencial.",
  },
  {
    pergunta: "Os meus clientes precisam de criar conta?",
    resposta:
      "Não. Escolhem o serviço, o dia e a hora e deixam só o nome e o telefone ou email.",
  },
  {
    pergunta: "O Flip recebe os pagamentos dos clientes?",
    resposta:
      "Não. Os clientes pagam no salão, como sempre. Tu marcas o atendimento como concluído (podes ajustar o valor, por exemplo com um desconto) e o Flip faz o resumo do que ganhaste.",
  },
  {
    pergunta: "Os preços incluem IVA?",
    resposta: "Sim. Os preços dos planos já incluem IVA.",
  },
];

const SERVICOS_EXEMPLO = [
  { nome: "Corte e brushing", duracao: "45 min", preco: "22,00 €" },
  { nome: "Manicure com gel", duracao: "1 h", preco: "25,00 €" },
  { nome: "Barba", duracao: "20 min", preco: "10,00 €" },
];

const HORARIOS_EXEMPLO = ["09:30", "10:00", "11:00", "14:30", "15:00", "16:00"];

function recursosDoPlano(plano: Plano) {
  const { limites, recursos } = plano;
  const lista: { texto: string; emBreve?: boolean }[] = [];

  if (recursos.marcacoesOnline) {
    lista.push(
      { texto: "Página de marcação online com o teu endereço" },
      {
        texto:
          limites.marcacoesPorMes === null
            ? "Marcações online ilimitadas"
            : `Até ${limites.marcacoesPorMes} marcações online por mês`,
      },
    );
  } else {
    lista.push({ texto: "Agenda para anotares as tuas marcações" });
  }

  lista.push(
    {
      texto:
        limites.profissionais === null
          ? "Profissionais ilimitados"
          : limites.profissionais === 1
            ? "1 profissional"
            : `Até ${limites.profissionais} profissionais`,
    },
    {
      texto:
        limites.servicos === null ? "Serviços ilimitados" : `Até ${limites.servicos} serviços`,
    },
    { texto: "Resumo do ganho de cada dia" },
  );
  if (recursos.logotipoECor) lista.push({ texto: "Logótipo e cor da tua marca" });
  if (recursos.relatoriosMensais) lista.push({ texto: "Relatórios mensais", emBreve: true });
  if (recursos.comissoes) lista.push({ texto: "Comissões por profissional", emBreve: true });
  return lista;
}

export default function Inicio() {
  // Com contas reais o botão principal leva ao registo; em demonstração, à gestão de exemplo.
  const linkComecar = supabaseConfigurado ? "/criar-conta" : "/gestao";
  const textoComecar = supabaseConfigurado ? "Começar grátis" : "Ver a demonstração";
  const linkEntrar = supabaseConfigurado ? "/entrar" : "/gestao";

  return (
    <div className={styles.pagina}>
      <header className={styles.topo}>
        <Link href="/" className={styles.marca} aria-label="Flip, página inicial">
          <Logotipo />
          Flip
        </Link>
        <nav className={styles.navegacao} aria-label="Principal">
          <a href="#como-funciona" className={styles.linkNav}>
            Como funciona
          </a>
          <a href="#planos" className={styles.linkNav}>
            Planos
          </a>
          <Link href={linkEntrar} className={styles.botaoSecundario}>
            Entrar
          </Link>
        </nav>
      </header>

      <main>
        <section className={styles.heroi}>
          <div className={styles.heroiTexto}>
            <p className={styles.etiqueta}>Para salões, estética e barbearias</p>
            <h1>A agenda do teu salão cheia, sem trocar mensagens.</h1>
            <p className={styles.subtitulo}>
              Os teus clientes marcam online numa página com o teu nome. Tu vês a agenda
              da equipa e quanto ganhaste em cada dia.
            </p>
            <div className={styles.acoes}>
              <Link href={linkComecar} className={styles.botaoPrincipal}>
                {textoComecar}
              </Link>
              <a href="#planos" className={styles.botaoSecundario}>
                Ver planos
              </a>
            </div>
            <p className={styles.nota}>Sem cartão. Começas no plano Demonstração, grátis.</p>
          </div>

          <figure className={styles.exemplo}>
            <div className={styles.telemovel} aria-hidden="true">
              <div className={styles.telemovelCabecalho}>
                <span className={styles.exemploLogo}>SL</span>
                <div>
                  <p className={styles.exemploNome}>Salão Lumière</p>
                  <p className={styles.exemploMorada}>Rua de Santa Catarina, 120 · Porto</p>
                </div>
              </div>
              <p className={styles.exemploTitulo}>Escolhe o serviço</p>
              <ul className={styles.exemploServicos}>
                {SERVICOS_EXEMPLO.map((s, i) => (
                  <li key={s.nome} className={i === 0 ? styles.exemploEscolhido : undefined}>
                    <span>{s.nome}</span>
                    <span>
                      {s.duracao} · {s.preco}
                    </span>
                  </li>
                ))}
              </ul>
              <p className={styles.exemploTitulo}>Quinta-feira, 19 de novembro</p>
              <div className={styles.exemploHoras}>
                {HORARIOS_EXEMPLO.map((h, i) => (
                  <span key={h} className={i === 1 ? styles.exemploHoraEscolhida : undefined}>
                    {h}
                  </span>
                ))}
              </div>
              <span className={styles.exemploBotao}>Confirmar marcação</span>
            </div>
            <figcaption className={styles.legenda}>
              Exemplo da página de marcação que os teus clientes veem.
            </figcaption>
          </figure>
        </section>

        <section className={styles.seccao} aria-labelledby="titulo-beneficios">
          <h2 id="titulo-beneficios" className={styles.tituloSeccao}>
            Tudo o que precisas para gerir as marcações
          </h2>
          <div className={styles.grelhaBeneficios}>
            {BENEFICIOS.map((b) => (
              <article key={b.titulo} className={styles.cartao}>
                <h3>{b.titulo}</h3>
                <p>{b.texto}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="como-funciona" className={styles.seccao} aria-labelledby="titulo-passos">
          <h2 id="titulo-passos" className={styles.tituloSeccao}>
            Como funciona
          </h2>
          <ol className={styles.passos}>
            {PASSOS.map((p, i) => (
              <li key={p.titulo} className={styles.passo}>
                <span className={styles.numero} aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h3>{p.titulo}</h3>
                  <p>{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section id="planos" className={styles.seccao} aria-labelledby="titulo-planos">
          <h2 id="titulo-planos" className={styles.tituloSeccao}>
            Planos
          </h2>
          <p className={styles.introSeccao}>
            Preços mensais com IVA incluído. Todas as contas começam no plano Demonstração.
          </p>
          <div className={styles.grelhaPlanos}>
            {Object.values(planos).map((plano) => {
              const destaque = plano.id === "essencial";
              return (
                <article
                  key={plano.id}
                  className={destaque ? `${styles.plano} ${styles.planoDestaque}` : styles.plano}
                >
                  {destaque && <p className={styles.selo}>Recomendado</p>}
                  <h3>{plano.nome}</h3>
                  <p className={styles.preco}>
                    {plano.precoMensalCentimos === 0 ? (
                      "Grátis"
                    ) : plano.precoMensalCentimos === null ? (
                      "Em breve"
                    ) : (
                      <>
                        {formatarEuros(plano.precoMensalCentimos)}
                        <span>/mês</span>
                      </>
                    )}
                  </p>
                  <ul className={styles.recursos}>
                    {recursosDoPlano(plano).map((r) => (
                      <li key={r.texto}>
                        {r.texto}
                        {r.emBreve && <span className={styles.emBreve}>em breve</span>}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={linkComecar}
                    className={destaque ? styles.botaoPrincipal : styles.botaoSecundario}
                  >
                    {textoComecar}
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.seccao} aria-labelledby="titulo-perguntas">
          <h2 id="titulo-perguntas" className={styles.tituloSeccao}>
            Perguntas frequentes
          </h2>
          <div className={styles.perguntas}>
            {PERGUNTAS.map((p) => (
              <details key={p.pergunta} className={styles.pergunta}>
                <summary>{p.pergunta}</summary>
                <p>{p.resposta}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.chamada}>
          <h2>Pronto para encher a agenda?</h2>
          <p>Cria a tua página de marcação hoje. É grátis para começar.</p>
          <Link href={linkComecar} className={styles.botaoClaro}>
            {textoComecar}
          </Link>
        </section>
      </main>

      <footer className={styles.rodape}>
        <p className={styles.rodapeMarca}>
          <Logotipo tamanho={22} />© {new Date().getFullYear()} Flip
        </p>
        <nav aria-label="Rodapé" className={styles.rodapeLinks}>
          <a href="#planos">Planos</a>
          <Link href={linkEntrar}>Entrar</Link>
        </nav>
      </footer>
    </div>
  );
}
