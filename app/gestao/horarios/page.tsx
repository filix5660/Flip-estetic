import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, CabecalhoPagina, cn } from "@/components/ui";
import { repo } from "@/lib/dados";
import { obterNegocioAtual } from "@/lib/sessao";
import { agoraNoFuso, somarDias } from "@/lib/tempo";
import { Bloqueios } from "./bloqueios";
import { DiasEspeciais } from "./dias-especiais";
import { EditorSemanal } from "./editor-semanal";
import { RegrasVagas } from "./regras-vagas";

export const metadata: Metadata = { title: "Horários" };

type Props = { searchParams: Promise<{ profissional?: string }> };

export default async function Horarios({ searchParams }: Props) {
  const negocio = await obterNegocioAtual();
  const { profissional: idPedido } = await searchParams;
  const hoje = agoraNoFuso(negocio.fusoHorario).data;

  const [profissionais, servicos] = await Promise.all([
    repo.profissionais.listar(negocio.id),
    repo.servicos.listar(negocio.id),
  ]);
  const profissional = profissionais.find((p) => p.id === idPedido) ?? profissionais[0];

  if (!profissional) {
    return (
      <>
        <CabecalhoPagina titulo="Horários" />
        <p className="text-suave">
          Adiciona primeiro um profissional em <Link className="underline" href="/gestao/profissionais">Equipa</Link>.
        </p>
      </>
    );
  }

  const [semanal, diasEspeciais, bloqueios] = await Promise.all([
    repo.horarios.semanal(profissional.id),
    repo.horarios.diasEspeciais(profissional.id, hoje),
    repo.horarios.bloqueios(profissional.id, hoje),
  ]);

  const servicosDoProfissional = servicos
    .filter((s) => s.ativo && s.profissionalIds.includes(profissional.id))
    .map((s) => ({ id: s.id, nome: s.nome, duracaoMin: s.duracaoMin }));

  return (
    <>
      <CabecalhoPagina
        titulo="Horários"
        descricao="Tu decides quando trabalhas. Define a semana normal, as pausas, as folgas e as horas que queres fechar. As vagas atualizam-se sozinhas."
      />

      {negocio.plano === "equipa" && profissionais.length > 1 && (
        <nav aria-label="Profissional" className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {profissionais.map((p) => (
            <Link
              key={p.id}
              href={`/gestao/horarios?profissional=${p.id}`}
              aria-current={p.id === profissional.id ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border py-1 pr-4 pl-1 text-sm transition",
                p.id === profissional.id
                  ? "border-escuro bg-white font-medium shadow-cartao"
                  : "border-linha text-suave hover:bg-white",
              )}
            >
              <Avatar nome={p.nome} cor={p.cor} tamanho="sm" />
              {p.nome}
              {!p.ativo && <span className="text-xs">(inativo)</span>}
            </Link>
          ))}
        </nav>
      )}

      <div className="grid gap-6 2xl:grid-cols-[1fr_24rem]">
        {/* key: recria o editor ao trocar de profissional */}
        <EditorSemanal key={profissional.id} profissionalId={profissional.id} semanal={semanal} />
        <RegrasVagas
          regras={negocio.regras}
          profissionalId={profissional.id}
          servicos={servicosDoProfissional}
          dataSugerida={somarDias(hoje, 1)}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <DiasEspeciais key={`e-${profissional.id}`} profissionalId={profissional.id} dias={diasEspeciais} hoje={hoje} />
        <Bloqueios key={`b-${profissional.id}`} profissionalId={profissional.id} bloqueios={bloqueios} hoje={hoje} />
      </div>
    </>
  );
}
