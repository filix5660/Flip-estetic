import type { IdPlano } from "./modelo";

// ATENÇÃO: preços e limites abaixo são provisórios, só para o sistema já
// saber trabalhar com planos. Definir os valores reais antes de lançar.

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
    limites: { profissionais: 1, servicos: 5, marcacoesPorMes: 50 },
    recursos: {
      logotipoECor: false,
      relatoriosMensais: false,
      comissoes: false,
    },
  },
  essencial: {
    id: "essencial",
    nome: "Essencial",
    precoMensalCentimos: null,
    limites: { profissionais: 3, servicos: null, marcacoesPorMes: null },
    recursos: {
      logotipoECor: true,
      relatoriosMensais: true,
      comissoes: false,
    },
  },
  profissional: {
    id: "profissional",
    nome: "Profissional",
    precoMensalCentimos: null,
    limites: { profissionais: null, servicos: null, marcacoesPorMes: null },
    recursos: {
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
