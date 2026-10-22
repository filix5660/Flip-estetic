"use server";

/** Server Actions usadas pela página pública de marcação. */

import { repo } from "@/lib/dados";
import { diasComVaga, reservar, vagasDoDia, type Vaga } from "@/lib/agendamento";
import { ehDataValida, type DataISO } from "@/lib/tempo";
import type { Resultado } from "@/lib/tipos";
import { emailValido, telefoneValido } from "@/lib/validar";

async function carregar(slug: string, servicoId: string) {
  const negocio = await repo.negocios.porSlug(slug);
  if (!negocio) return null;
  const servico = await repo.servicos.porId(servicoId);
  if (!servico || servico.negocioId !== negocio.id || !servico.ativo) return null;
  return { negocio, servico };
}

export async function carregarDiasComVaga(
  slug: string,
  servicoId: string,
  profissionalId: string | null,
  ano: number,
  mes: number,
): Promise<Resultado<DataISO[]>> {
  const ctx = await carregar(slug, servicoId);
  if (!ctx) return { ok: false, erro: "Serviço indisponível." };
  if (!Number.isInteger(ano) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
    return { ok: false, erro: "Mês inválido." };
  }
  const dias = await diasComVaga(ctx.negocio, ctx.servico, profissionalId, ano, mes);
  return { ok: true, dados: dias };
}

export async function carregarHorarios(
  slug: string,
  servicoId: string,
  profissionalId: string | null,
  data: DataISO,
): Promise<Resultado<Vaga[]>> {
  const ctx = await carregar(slug, servicoId);
  if (!ctx) return { ok: false, erro: "Serviço indisponível." };
  if (!ehDataValida(data)) return { ok: false, erro: "Data inválida." };
  const vagas = await vagasDoDia(ctx.negocio, ctx.servico, profissionalId, data);
  return { ok: true, dados: vagas };
}

export interface PedidoPublico {
  servicoId: string;
  profissionalId: string | null;
  data: DataISO;
  inicioMin: number;
  nome: string;
  telefone: string;
  email: string;
  notas: string;
}

export interface MarcacaoConfirmada {
  id: string;
  profissionalNome: string;
}

export async function confirmarMarcacao(
  slug: string,
  pedido: PedidoPublico,
): Promise<Resultado<MarcacaoConfirmada>> {
  const negocio = await repo.negocios.porSlug(slug);
  if (!negocio) return { ok: false, erro: "Negócio não encontrado." };

  if (pedido.nome.trim().length < 2) return { ok: false, erro: "Indica o teu nome." };
  if (!telefoneValido(pedido.telefone)) return { ok: false, erro: "Indica um telefone válido." };
  if (pedido.email && !emailValido(pedido.email)) return { ok: false, erro: "O email não parece válido." };
  if (!ehDataValida(pedido.data)) return { ok: false, erro: "Data inválida." };

  const resultado = await reservar({
    negocio,
    servicoId: pedido.servicoId,
    profissionalId: pedido.profissionalId,
    data: pedido.data,
    inicioMin: pedido.inicioMin,
    cliente: { nome: pedido.nome, telefone: pedido.telefone, email: pedido.email },
    notas: pedido.notas.slice(0, 500),
    origem: "online",
  });
  if (!resultado.ok) return resultado;

  const profissionais = await repo.profissionais.listar(negocio.id);
  const profissional = profissionais.find((p) => p.id === resultado.dados.profissionalId);

  // TODO(notificações): enviar confirmação por SMS/WhatsApp/email ao cliente
  // e avisar o profissional.
  return {
    ok: true,
    dados: { id: resultado.dados.id, profissionalNome: profissional?.nome ?? "" },
  };
}
