"use client";

/**
 * Tabela de clientes com pesquisa (nome ou telemóvel, sem acentos) e ordenação.
 * Os totais (visitas, faltas, gasto) são calculados no servidor em page.tsx.
 */

import { useState } from "react";
import { Avatar, Cartao, classeInput, Distintivo, EstadoVazio } from "@/components/ui";
import { formatarDataCurta, formatarPreco } from "@/lib/formatar";

export interface ResumoCliente {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  notas: string;
  visitas: number;
  faltas: number;
  ultimaVisita: string | null;
  proxima: string | null;
  totalCentimos: number;
}

type Ordem = "nome" | "visitas" | "recentes";

const semAcentos = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function ListaClientes({ clientes }: { clientes: ResumoCliente[] }) {
  const [pesquisa, setPesquisa] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("recentes");

  const termo = semAcentos(pesquisa.trim());
  const filtrados = clientes
    .filter(
      (c) =>
        !termo ||
        semAcentos(c.nome).includes(termo) ||
        c.telefone.replace(/\s/g, "").includes(termo.replace(/\s/g, "")),
    )
    .sort((a, b) => {
      if (ordem === "nome") return a.nome.localeCompare(b.nome, "pt");
      if (ordem === "visitas") return b.visitas - a.visitas;
      return (b.proxima ?? b.ultimaVisita ?? "").localeCompare(a.proxima ?? a.ultimaVisita ?? "");
    });

  return (
    <Cartao semPadding>
      <div className="flex flex-col gap-2 p-4 sm:flex-row sm:p-5">
        <input
          type="search"
          className={classeInput}
          placeholder="Pesquisar por nome ou telemóvel"
          value={pesquisa}
          onChange={(e) => setPesquisa(e.target.value)}
          aria-label="Pesquisar clientes"
        />
        <select
          className={`${classeInput} sm:w-48`}
          value={ordem}
          onChange={(e) => setOrdem(e.target.value as Ordem)}
          aria-label="Ordenar"
        >
          <option value="recentes">Mais recentes</option>
          <option value="visitas">Mais visitas</option>
          <option value="nome">Nome (A–Z)</option>
        </select>
      </div>

      {filtrados.length === 0 ? (
        <div className="px-4 pb-5 sm:px-5">
          <EstadoVazio
            titulo={clientes.length === 0 ? "Ainda não tens clientes" : "Nenhum cliente encontrado"}
            descricao={clientes.length === 0 ? "Aparecem aqui assim que fizerem a primeira marcação." : undefined}
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-y border-linha bg-stone-50/70 text-xs text-suave">
              <tr>
                <th className="px-5 py-2.5 font-medium">Cliente</th>
                <th className="px-3 py-2.5 text-right font-medium">Visitas</th>
                <th className="px-3 py-2.5 font-medium">Última visita</th>
                <th className="px-3 py-2.5 font-medium">Próxima</th>
                <th className="px-5 py-2.5 text-right font-medium">Total gasto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linha">
              {filtrados.map((c) => (
                <tr key={c.id} className="hover:bg-stone-50/60">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar nome={c.nome} cor="#a8a29e" tamanho="sm" />
                      <div className="min-w-0">
                        <p className="font-medium">{c.nome}</p>
                        <a href={`tel:${c.telefone.replace(/\s/g, "")}`} className="text-suave hover:text-tinta">
                          {c.telefone}
                        </a>
                        {c.notas && <p className="text-xs text-amber-800">{c.notas}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {c.visitas}
                    {c.faltas > 0 && (
                      <span className="ml-1.5">
                        <Distintivo tom="vermelho">
                          {c.faltas} falta{c.faltas > 1 ? "s" : ""}
                        </Distintivo>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-suave">{c.ultimaVisita ? formatarDataCurta(c.ultimaVisita) : "—"}</td>
                  <td className="px-3 py-3">
                    {c.proxima ? <Distintivo tom="acento">{formatarDataCurta(c.proxima)}</Distintivo> : <span className="text-suave">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums">{formatarPreco(c.totalCentimos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Cartao>
  );
}
