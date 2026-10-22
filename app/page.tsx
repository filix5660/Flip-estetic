/**
 * Página inicial do SaaS (marketing): apresentação, vantagens e planos.
 * Os botões levam aos dois negócios de demonstração e à área de gestão.
 */

import Link from "next/link";
import {
  IconeAgenda,
  IconeEquipa,
  IconeGlobo,
  IconeRelogio,
  IconeVisto,
} from "@/components/icones";
import { BotaoLink } from "@/components/ui";
import { PLANOS } from "@/lib/planos";

const VANTAGENS = [
  {
    icone: IconeGlobo,
    titulo: "A tua página de marcação",
    texto: "Um link teu para pôr no Instagram, no Google e no WhatsApp. O cliente marca sozinho, a qualquer hora.",
  },
  {
    icone: IconeRelogio,
    titulo: "Horários do teu jeito",
    texto: "Defines os dias, os períodos, as pausas, as folgas e as férias. As vagas ajustam-se sozinhas.",
  },
  {
    icone: IconeAgenda,
    titulo: "Vagas calculadas pela duração",
    texto: "Cada serviço tem a sua duração. O cliente só vê horários em que o serviço cabe mesmo.",
  },
  {
    icone: IconeEquipa,
    titulo: "Sozinho ou em equipa",
    texto: "Cada profissional com a sua agenda, e o cliente escolhe com quem quer marcar.",
  },
];

export default function Inicio() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-escuro text-sm text-white">F</span>
          Flip Estética
        </Link>
        <nav className="flex items-center gap-2">
          <BotaoLink href="#planos" variante="fantasma" tamanho="sm" className="hidden sm:inline-flex">
            Planos
          </BotaoLink>
          <BotaoLink href="/gestao" variante="secundario" tamanho="sm">
            Entrar
          </BotaoLink>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pt-10 pb-16 sm:px-6 sm:pt-16 sm:pb-24">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold tracking-[0.2em] text-acento-600 uppercase">
              Para salões, barbearias e estética
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
              A tua agenda cheia, sem trocar mensagens.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-suave text-pretty">
              Os clientes escolhem o serviço, o dia e a hora numa página com a tua marca.
              Tu defines quando trabalhas e o Flip trata do resto.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <BotaoLink href="/barbearia-central" tamanho="lg">
                Ver página de marcação
              </BotaoLink>
              <BotaoLink href="/gestao" variante="secundario" tamanho="lg">
                Abrir a gestão (demo)
              </BotaoLink>
            </div>
          </div>
        </section>

        <section className="border-y border-linha bg-superficie">
          <div className="mx-auto grid max-w-6xl gap-px bg-linha sm:grid-cols-2 lg:grid-cols-4">
            {VANTAGENS.map(({ icone: Icone, titulo, texto }) => (
              <article key={titulo} className="bg-superficie p-6 sm:p-8">
                <span className="grid size-10 place-items-center rounded-xl bg-acento-50 text-acento-600">
                  <Icone />
                </span>
                <h2 className="mt-4 font-semibold">{titulo}</h2>
                <p className="mt-2 text-sm leading-relaxed text-suave">{texto}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="planos" className="mx-auto max-w-6xl scroll-mt-8 px-4 py-16 sm:px-6 sm:py-24">
          <h2 className="text-3xl font-semibold tracking-tight">Planos</h2>
          <p className="mt-2 text-suave">Começa sozinho e muda de plano quando a equipa crescer.</p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {Object.values(PLANOS).map((plano) => {
              const destaque = plano.id === "equipa";
              return (
                <article
                  key={plano.id}
                  className={
                    destaque
                      ? "rounded-2xl bg-escuro p-7 text-white shadow-flutuante"
                      : "rounded-2xl border border-linha bg-superficie p-7 shadow-cartao"
                  }
                >
                  <h3 className="text-xl font-semibold">{plano.nome}</h3>
                  <p className={destaque ? "mt-1 text-stone-300" : "mt-1 text-suave"}>{plano.resumo}</p>
                  <ul className="mt-6 grid gap-3 text-sm">
                    {plano.recursos.map((recurso) => (
                      <li key={recurso} className="flex gap-2.5">
                        <IconeVisto className={destaque ? "text-acento-200" : "text-acento-500"} />
                        {recurso}
                      </li>
                    ))}
                  </ul>
                  <BotaoLink
                    href={destaque ? "/barbearia-central" : "/estudio-bela"}
                    variante={destaque ? "secundario" : "primario"}
                    className="mt-7 w-full"
                  >
                    Ver exemplo · {plano.nome}
                  </BotaoLink>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-linha py-8 text-center text-sm text-suave">
        © {new Date().getFullYear()} Flip Estética
      </footer>
    </div>
  );
}
