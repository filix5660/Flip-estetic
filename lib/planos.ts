import type { IdPlano } from "./modelo";

// Preços mensais com IVA incluído (definidos a 2026-11-12).
// Os limites existem também na tabela `planos` da base de dados: alterar os dois.

export type Plano = {
  id: IdPlano;
  nome: string;
  /** null = ainda por definir */
  precoMensalCentimos: number | null;
  /** null = sem limite */
  limites: {
    profissionais: number | null;
    servicos: number | null;
    marcacoesPorMes: number | null;
  };
  recursos: {
    /** Os clientes podem marcar na página pública. Igual a planos.marcacoes_online na base de dados. */
    marcacoesOnline: boolean;
    logotipoECor: boolean;
    relatoriosMensais: boolean;
    comissoes: boolean;
  };
};

export const planos: Record<IdPlano, Plano> = {
  demo: {
    id: "demo",
    nome: "Demonstração",
    precoMensalCentimos: 0,
    limites: { profissionais: 1, servicos: null, marcacoesPorMes: null },
    recursos: {
      marcacoesOnline: false,
      logotipoECor: false,
      relatoriosMensais: false,
      comissoes: false,
    },
  },
  essencial: {
    id: "essencial",
    nome: "Essencial",
    precoMensalCentimos: 1500,
    limites: { profissionais: 3, servicos: null, marcacoesPorMes: null },
    recursos: {
      marcacoesOnline: true,
      logotipoECor: true,
      relatoriosMensais: true,
      comissoes: false,
    },
  },
  profissional: {
    id: "profissional",
    nome: "Profissional",
    precoMensalCentimos: 2900,
    limites: { profissionais: null, servicos: null, marcacoesPorMes: null },
    recursos: {
      marcacoesOnline: true,
      logotipoECor: true,
      relatoriosMensais: true,
      comissoes: true,
    },
  },
};

export type Limite = keyof Plano["limites"];

/** true se o salão já usou tudo o que o plano permite para este limite. */
export function limiteAtingido(
  plano: IdPlano,
  limite: Limite,
  quantidadeAtual: number,
) {
  const maximo = planos[plano].limites[limite];
  return maximo !== null && quantidadeAtual >= maximo;
}
