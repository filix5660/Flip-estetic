"use client";

/**
 * Navegação da gestão.
 * - Computador: barra lateral fixa à esquerda.
 * - Telemóvel: barra superior com botão que abre um menu deslizante.
 * Inclui o link para a página pública e o seletor de negócio de demonstração
 * (remover quando houver login).
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { LogotipoNegocio, variaveisMarca } from "@/components/cabecalho-negocio";
import {
  IconeAgenda,
  IconeCliente,
  IconeDefinicoes,
  IconeEquipa,
  IconeExterno,
  IconeFechar,
  IconeGlobo,
  IconeMenu,
  IconePainel,
  IconeRelogio,
  IconeTesoura,
} from "@/components/icones";
import { cn } from "@/components/ui";
import { PLANOS } from "@/lib/planos";
import type { Plano } from "@/lib/tipos";
import { trocarNegocioDemo } from "./acoes";

interface Props {
  negocio: {
    id: string;
    nome: string;
    slug: string;
    plano: Plano;
    corPrincipal: string;
    logotipoUrl: string | null;
  };
  negociosDemo: { id: string; nome: string; plano: Plano }[];
}

export function BarraLateral({ negocio, negociosDemo }: Props) {
  const caminho = usePathname();
  const [aberta, setAberta] = useState(false);
  const [aTrocar, iniciarTroca] = useTransition();

  const itens = [
    { href: "/gestao", rotulo: "Painel", icone: IconePainel },
    { href: "/gestao/agenda", rotulo: "Agenda", icone: IconeAgenda },
    { href: "/gestao/servicos", rotulo: "Serviços", icone: IconeTesoura },
    { href: "/gestao/horarios", rotulo: "Horários", icone: IconeRelogio },
    {
      href: "/gestao/profissionais",
      rotulo: negocio.plano === "equipa" ? "Equipa" : "Perfil",
      icone: IconeEquipa,
    },
    { href: "/gestao/clientes", rotulo: "Clientes", icone: IconeCliente },
    { href: "/gestao/pagina-publica", rotulo: "Página pública", icone: IconeGlobo },
    { href: "/gestao/definicoes", rotulo: "Plano", icone: IconeDefinicoes },
  ];

    // "/gestao" só fica ativo na própria página; os outros também nas subpáginas.
  const ativo = (href: string) =>
    href === "/gestao" ? caminho === href : caminho === href || caminho.startsWith(`${href}/`);

  const navegacao = (
    <nav aria-label="Gestão" className="grid gap-0.5">
      {itens.map(({ href, rotulo, icone: Icone }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setAberta(false)}
          aria-current={ativo(href) ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors",
            ativo(href)
              ? "bg-white font-medium text-tinta shadow-cartao ring-1 ring-linha"
              : "text-suave hover:bg-white/60 hover:text-tinta",
          )}
        >
          <Icone className={ativo(href) ? "text-acento-600" : undefined} />
          {rotulo}
        </Link>
      ))}
    </nav>
  );

  const identidade = (
    <div className="flex items-center gap-3" style={variaveisMarca(negocio.corPrincipal)}>
      <LogotipoNegocio
        nome={negocio.nome}
        logotipoUrl={negocio.logotipoUrl}
        className="size-10 rounded-xl text-sm ring-0"
      />
      <div className="min-w-0">
        <p className="truncate font-semibold leading-tight">{negocio.nome}</p>
        <p className="text-xs text-suave">Plano {PLANOS[negocio.plano].nome}</p>
      </div>
    </div>
  );

  const rodape = (
    <div className="grid gap-3">
      <a
        href={`/${negocio.slug}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-between rounded-xl border border-linha bg-white px-3 py-2.5 text-sm font-medium shadow-cartao hover:bg-stone-50"
      >
        Ver a minha página
        <IconeExterno tamanho={16} className="text-suave" />
      </a>
      {negociosDemo.length > 1 && (
        <label className="grid gap-1 rounded-xl border border-dashed border-stone-300 p-2.5 text-xs text-suave">
          Demonstração · trocar de negócio
          <select
            value={negocio.id}
            disabled={aTrocar}
            onChange={(e) => {
              const id = e.target.value;
              iniciarTroca(() => trocarNegocioDemo(id));
            }}
            className="rounded-lg border border-linha bg-white px-2 py-1.5 text-sm text-tinta"
          >
            {negociosDemo.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nome} ({PLANOS[n.plano].nome})
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );

  return (
    <>
      {/* Telemóvel: barra superior */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-linha bg-fundo/90 px-4 py-3 backdrop-blur lg:hidden">
        {identidade}
        <button
          type="button"
          onClick={() => setAberta(true)}
          aria-label="Abrir menu"
          aria-expanded={aberta}
          className="grid size-10 place-items-center rounded-xl hover:bg-stone-200/60"
        >
          <IconeMenu tamanho={22} />
        </button>
      </div>

      {aberta && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-stone-900/30"
            onClick={() => setAberta(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] animate-entrar flex-col gap-6 overflow-y-auto bg-fundo p-4 shadow-flutuante">
            <div className="flex items-start justify-between gap-2">
              {identidade}
              <button
                type="button"
                onClick={() => setAberta(false)}
                aria-label="Fechar menu"
                className="grid size-9 place-items-center rounded-lg hover:bg-stone-200/60"
              >
                <IconeFechar />
              </button>
            </div>
            {navegacao}
            <div className="mt-auto">{rodape}</div>
          </div>
        </div>
      )}

      {/* Computador: barra lateral fixa */}
      <aside className="sticky top-0 hidden h-dvh w-68 shrink-0 flex-col gap-8 overflow-y-auto border-r border-linha bg-stone-100/50 p-5 lg:flex">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight text-suave">
          <span className="grid size-6 place-items-center rounded-md bg-escuro text-[11px] text-white">F</span>
          Flip Estética
        </Link>
        {identidade}
        {navegacao}
        <div className="mt-auto">{rodape}</div>
      </aside>
    </>
  );
}
