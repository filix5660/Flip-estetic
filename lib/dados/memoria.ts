/**
 * Implementação em memória do repositório — só para desenvolvimento.
 * Os dados vivem enquanto o servidor estiver ligado e são recriados a
 * partir de `semente.ts` sempre que o servidor reinicia.
 */

import type {
  Bloqueio,
  Cliente,
  DiaEspecial,
  HorarioSemanal,
  Marcacao,
  Negocio,
  Profissional,
  Servico,
} from "../tipos";
import { normalizarTelefone } from "../validar";
import type { Repositorio } from "./repositorio";
import { criarSemente } from "./semente";

export interface BaseDados {
  negocios: Negocio[];
  profissionais: Profissional[];
  servicos: Servico[];
  horarios: HorarioSemanal[];
  diasEspeciais: DiaEspecial[];
  bloqueios: Bloqueio[];
  clientes: Cliente[];
  marcacoes: Marcacao[];
}

// Mantém os dados entre recarregamentos do servidor de desenvolvimento.
const global = globalThis as typeof globalThis & { __flipBaseDados?: BaseDados };

function bd(): BaseDados {
  global.__flipBaseDados ??= criarSemente();
  return global.__flipBaseDados;
}

const novoId = () => crypto.randomUUID();
const agoraIso = () => new Date().toISOString();
const copia = <T>(valor: T): T => structuredClone(valor);

function obter<T extends { id: string }>(lista: T[], id: string, nome: string): T {
  const item = lista.find((i) => i.id === id);
  if (!item) throw new Error(`${nome} não encontrado(a): ${id}`);
  return item;
}

function noIntervalo(data: string, de?: string, ate?: string) {
  return (!de || data >= de) && (!ate || data <= ate);
}

export function criarRepositorioMemoria(): Repositorio {
  return {
    negocios: {
      async listar() {
        return copia(bd().negocios);
      },
      async porId(id) {
        return copia(bd().negocios.find((n) => n.id === id) ?? null);
      },
      async porSlug(slug) {
        return copia(bd().negocios.find((n) => n.slug === slug) ?? null);
      },
      async atualizar(id, dados) {
        const negocio = obter(bd().negocios, id, "Negócio");
        Object.assign(negocio, copia(dados));
        return copia(negocio);
      },
    },

    profissionais: {
      async listar(negocioId) {
        return copia(bd().profissionais.filter((p) => p.negocioId === negocioId));
      },
      async criar(dados) {
        const profissional: Profissional = { ...copia(dados), id: novoId() };
        bd().profissionais.push(profissional);
        return copia(profissional);
      },
      async atualizar(id, dados) {
        const profissional = obter(bd().profissionais, id, "Profissional");
        Object.assign(profissional, copia(dados));
        return copia(profissional);
      },
      async remover(id) {
        const base = bd();
        base.profissionais = base.profissionais.filter((p) => p.id !== id);
        base.horarios = base.horarios.filter((h) => h.profissionalId !== id);
        base.diasEspeciais = base.diasEspeciais.filter((d) => d.profissionalId !== id);
        base.bloqueios = base.bloqueios.filter((b) => b.profissionalId !== id);
        for (const servico of base.servicos) {
          servico.profissionalIds = servico.profissionalIds.filter((p) => p !== id);
        }
      },
    },

    servicos: {
      async listar(negocioId) {
        return copia(bd().servicos.filter((s) => s.negocioId === negocioId));
      },
      async porId(id) {
        return copia(bd().servicos.find((s) => s.id === id) ?? null);
      },
      async criar(dados) {
        const servico: Servico = { ...copia(dados), id: novoId() };
        bd().servicos.push(servico);
        return copia(servico);
      },
      async atualizar(id, dados) {
        const servico = obter(bd().servicos, id, "Serviço");
        Object.assign(servico, copia(dados));
        return copia(servico);
      },
      async remover(id) {
        bd().servicos = bd().servicos.filter((s) => s.id !== id);
      },
    },

    horarios: {
      async semanal(profissionalId) {
        return copia(
          bd()
            .horarios.filter((h) => h.profissionalId === profissionalId)
            .sort((a, b) => a.diaSemana - b.diaSemana),
        );
      },
      async definirDia(profissionalId, diaSemana, intervalos) {
        const base = bd();
        base.horarios = base.horarios.filter(
          (h) => !(h.profissionalId === profissionalId && h.diaSemana === diaSemana),
        );
        base.horarios.push({ profissionalId, diaSemana, intervalos: copia(intervalos) });
      },
      async diasEspeciais(profissionalId, de, ate) {
        return copia(
          bd().diasEspeciais.filter(
            (d) =>
              d.profissionalId === profissionalId &&
              (!de || d.dataFim >= de) &&
              (!ate || d.dataInicio <= ate),
          ),
        );
      },
      async criarDiaEspecial(dados) {
        const dia: DiaEspecial = { ...copia(dados), id: novoId() };
        bd().diasEspeciais.push(dia);
        return copia(dia);
      },
      async removerDiaEspecial(id) {
        bd().diasEspeciais = bd().diasEspeciais.filter((d) => d.id !== id);
      },
      async bloqueios(profissionalId, de, ate) {
        return copia(
          bd().bloqueios.filter(
            (b) => b.profissionalId === profissionalId && noIntervalo(b.data, de, ate),
          ),
        );
      },
      async criarBloqueio(dados) {
        const bloqueio: Bloqueio = { ...copia(dados), id: novoId() };
        bd().bloqueios.push(bloqueio);
        return copia(bloqueio);
      },
      async removerBloqueio(id) {
        bd().bloqueios = bd().bloqueios.filter((b) => b.id !== id);
      },
    },

    clientes: {
      async listar(negocioId) {
        return copia(bd().clientes.filter((c) => c.negocioId === negocioId));
      },
      async porId(id) {
        return copia(bd().clientes.find((c) => c.id === id) ?? null);
      },
      async porTelefone(negocioId, telefone) {
        const alvo = normalizarTelefone(telefone);
        return copia(
          bd().clientes.find(
            (c) => c.negocioId === negocioId && normalizarTelefone(c.telefone) === alvo,
          ) ?? null,
        );
      },
      async criar(dados) {
        const cliente: Cliente = { ...copia(dados), id: novoId(), criadoEm: agoraIso() };
        bd().clientes.push(cliente);
        return copia(cliente);
      },
      async atualizar(id, dados) {
        const cliente = obter(bd().clientes, id, "Cliente");
        Object.assign(cliente, copia(dados));
        return copia(cliente);
      },
    },

    marcacoes: {
      async listar({ negocioId, de, ate, profissionalId, clienteId }) {
        return copia(
          bd()
            .marcacoes.filter(
              (m) =>
                m.negocioId === negocioId &&
                noIntervalo(m.data, de, ate) &&
                (!profissionalId || m.profissionalId === profissionalId) &&
                (!clienteId || m.clienteId === clienteId),
            )
            .sort((a, b) => a.data.localeCompare(b.data) || a.inicioMin - b.inicioMin),
        );
      },
      async porId(id) {
        return copia(bd().marcacoes.find((m) => m.id === id) ?? null);
      },
      async criar(dados) {
        const marcacao: Marcacao = { ...copia(dados), id: novoId(), criadaEm: agoraIso() };
        bd().marcacoes.push(marcacao);
        return copia(marcacao);
      },
      async alterarEstado(id, estado) {
        const marcacao = obter(bd().marcacoes, id, "Marcação");
        marcacao.estado = estado;
        return copia(marcacao);
      },
    },
  };
}
