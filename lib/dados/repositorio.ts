/**
 * Contrato de acesso a dados.
 *
 * Hoje é implementado em memória (`memoria.ts`) com dados de exemplo.
 * Para ligar a base de dados, cria `prisma.ts` que implemente esta mesma
 * interface e troca a exportação em `lib/dados/index.ts`. Nenhuma página
 * ou ação precisa de mudar.
 *
 * Todos os métodos são assíncronos de propósito, para se comportarem como
 * uma base de dados real.
 */

import type { DataISO } from "../tempo";
import type {
  Bloqueio,
  Cliente,
  DiaEspecial,
  EstadoMarcacao,
  HorarioSemanal,
  Intervalo,
  Marcacao,
  Negocio,
  Profissional,
  Servico,
} from "../tipos";

export type NovoRegisto<T> = Omit<T, "id" | "criadoEm" | "criadaEm">;

export interface FiltroMarcacoes {
  negocioId: string;
  de: DataISO;
  ate: DataISO;
  profissionalId?: string;
  clienteId?: string;
}

export interface Repositorio {
  negocios: {
    listar(): Promise<Negocio[]>;
    porId(id: string): Promise<Negocio | null>;
    porSlug(slug: string): Promise<Negocio | null>;
    atualizar(id: string, dados: Partial<Omit<Negocio, "id">>): Promise<Negocio>;
  };

  profissionais: {
    listar(negocioId: string): Promise<Profissional[]>;
    criar(dados: NovoRegisto<Profissional>): Promise<Profissional>;
    atualizar(id: string, dados: Partial<Omit<Profissional, "id" | "negocioId">>): Promise<Profissional>;
    remover(id: string): Promise<void>;
  };

  servicos: {
    listar(negocioId: string): Promise<Servico[]>;
    porId(id: string): Promise<Servico | null>;
    criar(dados: NovoRegisto<Servico>): Promise<Servico>;
    atualizar(id: string, dados: Partial<Omit<Servico, "id" | "negocioId">>): Promise<Servico>;
    remover(id: string): Promise<void>;
  };

  horarios: {
    semanal(profissionalId: string): Promise<HorarioSemanal[]>;
    /** Substitui o horário de um dia da semana (`intervalos` vazio = folga). */
    definirDia(profissionalId: string, diaSemana: number, intervalos: Intervalo[]): Promise<void>;
    diasEspeciais(profissionalId: string, de?: DataISO, ate?: DataISO): Promise<DiaEspecial[]>;
    criarDiaEspecial(dados: NovoRegisto<DiaEspecial>): Promise<DiaEspecial>;
    removerDiaEspecial(id: string): Promise<void>;
    bloqueios(profissionalId: string, de?: DataISO, ate?: DataISO): Promise<Bloqueio[]>;
    criarBloqueio(dados: NovoRegisto<Bloqueio>): Promise<Bloqueio>;
    removerBloqueio(id: string): Promise<void>;
  };

  clientes: {
    listar(negocioId: string): Promise<Cliente[]>;
    porId(id: string): Promise<Cliente | null>;
    porTelefone(negocioId: string, telefone: string): Promise<Cliente | null>;
    criar(dados: NovoRegisto<Cliente>): Promise<Cliente>;
    atualizar(id: string, dados: Partial<Omit<Cliente, "id" | "negocioId">>): Promise<Cliente>;
  };

  marcacoes: {
    listar(filtro: FiltroMarcacoes): Promise<Marcacao[]>;
    porId(id: string): Promise<Marcacao | null>;
    /**
     * Na base de dados real isto deve correr numa transação com uma
     * restrição que impede marcações sobrepostas para o mesmo profissional
     * (ver `prisma/schema.prisma`).
     */
    criar(dados: NovoRegisto<Marcacao>): Promise<Marcacao>;
    alterarEstado(id: string, estado: EstadoMarcacao): Promise<Marcacao>;
  };
}
