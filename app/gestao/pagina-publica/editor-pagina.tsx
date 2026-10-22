"use client";

/**
 * Edição da página pública (nome, endereço/slug, contactos, logótipo e cor)
 * com pré-visualização ao vivo num "telemóvel" ao lado.
 */

import { useState, useTransition, type FormEvent } from "react";
import { CabecalhoNegocio, variaveisMarca } from "@/components/cabecalho-negocio";
import { LinkPublico } from "@/components/link-publico";
import { Alerta, Botao, Campo, Cartao, classeInput, cn } from "@/components/ui";
import { formatarDuracao, formatarPreco } from "@/lib/formatar";
import type { TipoNegocio } from "@/lib/tipos";
import { criarSlug } from "@/lib/validar";
import { guardarPaginaPublica, type DadosPaginaPublica } from "../acoes";

const CORES_SUGERIDAS = ["#2b2620", "#7a5d41", "#9b4f63", "#3f6b5c", "#2f4f8f", "#6b4f9b", "#b0702a", "#111827"];

const TIPOS: { valor: TipoNegocio; rotulo: string }[] = [
  { valor: "barbearia", rotulo: "Barbearia" },
  { valor: "salao", rotulo: "Salão de cabeleireiro" },
  { valor: "estetica", rotulo: "Estética" },
  { valor: "unhas", rotulo: "Unhas" },
  { valor: "outro", rotulo: "Outro" },
];

export function EditorPagina({
  inicial,
  servicos,
}: {
  inicial: DadosPaginaPublica;
  servicos: { nome: string; duracaoMin: number; precoCentimos: number }[];
}) {
  const [dados, setDados] = useState(inicial);
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);
  const [aGuardar, iniciar] = useTransition();
  const alterado = JSON.stringify(dados) !== JSON.stringify(inicial);

  const alterar = <K extends keyof DadosPaginaPublica>(campo: K, valor: DadosPaginaPublica[K]) => {
    setDados((d) => ({ ...d, [campo]: valor }));
    setMensagem(null);
  };

  function escolherLogotipo(ficheiro: File | undefined) {
    if (!ficheiro) return;
    if (ficheiro.size > 500 * 1024) {
      setMensagem({ tipo: "erro", texto: "Escolhe uma imagem com menos de 500 KB." });
      return;
    }
    const leitor = new FileReader();
    leitor.onload = () => {
      if (typeof leitor.result === "string") alterar("logotipoUrl", leitor.result);
    };
    leitor.readAsDataURL(ficheiro);
  }

  function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    iniciar(async () => {
      const resposta = await guardarPaginaPublica(dados);
      setMensagem(
        resposta.ok
          ? { tipo: "sucesso", texto: "Página atualizada." }
          : { tipo: "erro", texto: resposta.erro },
      );
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_24rem] xl:grid-cols-[1fr_26rem]">
      <form onSubmit={guardar} className="grid content-start gap-6">
        <Cartao titulo="O teu link">
          <LinkPublico slug={inicial.slug} />
          <Campo
            rotulo="Endereço"
            ajuda="Se mudares o endereço, o link antigo deixa de funcionar."
            className="mt-4"
          >
            <div className="flex items-center rounded-xl border border-linha bg-white focus-within:border-acento-500 focus-within:ring-3 focus-within:ring-acento-100">
              <span className="pl-3.5 text-sm text-suave">/</span>
              <input
                className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-[15px] outline-none"
                value={dados.slug}
                onChange={(e) => alterar("slug", criarSlug(e.target.value))}
                required
              />
            </div>
          </Campo>
        </Cartao>

        <Cartao titulo="Informações">
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Nome do negócio">
                <input
                  className={classeInput}
                  value={dados.nome}
                  onChange={(e) => alterar("nome", e.target.value)}
                  maxLength={50}
                  required
                />
              </Campo>
              <Campo rotulo="Tipo">
                <select
                  className={classeInput}
                  value={dados.tipo}
                  onChange={(e) => alterar("tipo", e.target.value as TipoNegocio)}
                >
                  {TIPOS.map((t) => (
                    <option key={t.valor} value={t.valor}>
                      {t.rotulo}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
            <Campo rotulo="Apresentação" ajuda={`${dados.apresentacao.length}/160`}>
              <textarea
                className={cn(classeInput, "resize-y")}
                rows={2}
                value={dados.apresentacao}
                onChange={(e) => alterar("apresentacao", e.target.value)}
                maxLength={160}
                placeholder="Uma frase sobre o que torna o teu espaço especial."
              />
            </Campo>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Morada">
                <input
                  className={classeInput}
                  value={dados.morada}
                  onChange={(e) => alterar("morada", e.target.value)}
                  placeholder="Rua, número e localidade"
                />
              </Campo>
              <Campo rotulo="Telefone ou WhatsApp">
                <input
                  className={classeInput}
                  type="tel"
                  value={dados.telefone}
                  onChange={(e) => alterar("telefone", e.target.value)}
                  placeholder="+351 900 000 000"
                />
              </Campo>
            </div>
          </div>
        </Cartao>

        <Cartao titulo="Aparência">
          <div className="grid gap-5">
            <div>
              <p className="mb-2 text-sm font-medium">Logótipo</p>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-linha bg-white px-4 text-sm font-medium shadow-sm hover:bg-stone-50">
                  {dados.logotipoUrl ? "Trocar imagem" : "Escolher imagem"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="sr-only"
                    onChange={(e) => escolherLogotipo(e.target.files?.[0])}
                  />
                </label>
                {dados.logotipoUrl && (
                  <Botao variante="fantasma" tamanho="sm" onClick={() => alterar("logotipoUrl", null)}>
                    Remover
                  </Botao>
                )}
                <span className="text-xs text-suave">PNG, JPG ou SVG até 500 KB. Quadrado fica melhor.</span>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Cor principal</p>
              <div className="flex flex-wrap items-center gap-2">
                {CORES_SUGERIDAS.map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    onClick={() => alterar("corPrincipal", cor)}
                    aria-label={`Cor ${cor}`}
                    aria-pressed={dados.corPrincipal.toLowerCase() === cor}
                    className={cn(
                      "size-8 rounded-full ring-offset-2 transition",
                      dados.corPrincipal.toLowerCase() === cor ? "ring-2 ring-escuro" : "hover:scale-110",
                    )}
                    style={{ backgroundColor: cor }}
                  />
                ))}
                <label className="ml-1 flex items-center gap-2 rounded-full border border-linha py-1 pr-3 pl-1 text-xs font-mono text-suave">
                  <input
                    type="color"
                    value={dados.corPrincipal}
                    onChange={(e) => alterar("corPrincipal", e.target.value)}
                    className="size-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
                    aria-label="Cor personalizada"
                  />
                  {dados.corPrincipal.toUpperCase()}
                </label>
              </div>
            </div>
          </div>
        </Cartao>

        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-linha bg-white/95 p-3 shadow-flutuante backdrop-blur">
          {mensagem ? (
            <div className="mr-auto">
              <Alerta tipo={mensagem.tipo}>{mensagem.texto}</Alerta>
            </div>
          ) : (
            alterado && <span className="mr-auto pl-2 text-sm text-amber-700">Tens alterações por guardar.</span>
          )}
          {alterado && (
            <Botao variante="fantasma" onClick={() => setDados(inicial)}>
              Desfazer
            </Botao>
          )}
          <Botao type="submit" disabled={!alterado || aGuardar}>
            {aGuardar ? "A guardar…" : "Guardar alterações"}
          </Botao>
        </div>
      </form>

      <aside className="lg:sticky lg:top-8 lg:self-start">
        <p className="mb-2 text-xs font-semibold tracking-wider text-suave uppercase">Pré-visualização</p>
        <div className="overflow-hidden rounded-[2rem] border-8 border-stone-800 bg-fundo shadow-flutuante">
          <div className="max-h-[640px] overflow-y-auto pb-6" style={variaveisMarca(dados.corPrincipal)}>
            <CabecalhoNegocio dados={dados} compacto />
            <div className="mx-4 mt-5 rounded-2xl border border-linha bg-white p-4">
              <p className="mb-3 text-sm font-semibold">Que serviço queres marcar?</p>
              <div className="grid gap-2">
                {(servicos.length ? servicos : [{ nome: "O teu serviço", duracaoMin: 30, precoCentimos: 1500 }]).map((s) => (
                  <div key={s.nome} className="flex items-center justify-between rounded-xl border border-linha px-3 py-2.5 text-sm">
                    <span>
                      <span className="block font-medium">{s.nome}</span>
                      <span className="text-xs text-suave">{formatarDuracao(s.duracaoMin)}</span>
                    </span>
                    <span className="font-semibold">{formatarPreco(s.precoCentimos)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-(--marca)" />
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
