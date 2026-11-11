// Validação de tudo o que chega do navegador.
//
// Regra: nunca confiar em dados enviados pelo cliente. Cada ação do servidor
// valida aqui antes de tocar na base de dados, e a base de dados volta a
// validar com as suas próprias restrições (CHECK, chaves, RLS).

import { z } from "zod";

export const SLUG_VALIDO = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const UUID_VALIDO =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFONE = /^\+?[0-9 ()-]{9,20}$/;

const hora = z.string().regex(HORA);
const data = z
  .string()
  .regex(DATA)
  .refine((valor) => !Number.isNaN(Date.parse(`${valor}T12:00:00Z`)));
/** Identificador: UUID na base de dados; texto curto no modo de demonstração. */
const id = z.string().min(1).max(64);

export const slug = z.string().min(3).max(40).regex(SLUG_VALIDO);

export const esquemaServico = z.object({
  id: id.optional(),
  nome: z.string().trim().min(1).max(60),
  duracaoMinutos: z.number().int().min(5).max(480),
  precoCentimos: z.number().int().min(0).max(1_000_000),
});

export const esquemaHorarios = z
  .array(
    z
      .object({
        diaSemana: z.number().int().min(0).max(6),
        aberto: z.boolean(),
        abertura: hora,
        fecho: hora,
      })
      .refine((h) => h.fecho > h.abertura),
  )
  .length(7)
  .refine((dias) => new Set(dias.map((d) => d.diaSemana)).size === 7);

export const esquemaBloqueio = z
  .object({
    data,
    inicio: hora,
    fim: hora,
    motivo: z.string().trim().max(120),
  })
  .refine((b) => b.fim > b.inicio);

export const esquemaPaginaPublica = z.object({
  nome: z.string().trim().min(2).max(50),
  apresentacao: z.string().trim().max(140),
  morada: z.string().trim().max(120),
  telefone: z.string().trim().max(30),
  corPrincipal: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const esquemaEstadoMarcacao = z.object({
  id,
  estado: z.enum(["marcada", "concluida", "faltou", "cancelada"]),
  valorCentimos: z.number().int().min(0).max(1_000_000).nullable(),
});

export const esquemaHorariosLivres = z.object({
  slug,
  servicoId: id,
  data,
});

export const esquemaNovaMarcacao = z.object({
  slug,
  servicoId: id,
  data,
  hora,
  nome: z.string().trim().min(2).max(80),
  contacto: z
    .string()
    .trim()
    .min(5)
    .max(120)
    .refine((valor) => EMAIL.test(valor) || TELEFONE.test(valor)),
});

// ── Conta ──

const email = z.string().trim().toLowerCase().max(254).regex(EMAIL);

export const esquemaEntrar = z.object({
  email,
  // Sem regras de tamanho ao entrar: só se verifica se bate certo.
  palavraPasse: z.string().min(1).max(200),
});

export const PALAVRA_PASSE_MINIMO = 10;

export const esquemaCriarConta = z.object({
  email,
  // 72 é o máximo que o bcrypt considera.
  palavraPasse: z.string().min(PALAVRA_PASSE_MINIMO).max(72),
});

export const esquemaCriarSalao = z.object({
  nome: z.string().trim().min(2).max(50),
  slug,
  tipo: z.enum(["barbearia", "estetica", "cabeleireiro", "unhas", "outro"]),
  nomeProfissional: z.string().trim().min(1).max(60),
});
