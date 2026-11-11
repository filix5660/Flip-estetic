import type { Marcacao, Profissional, Servico } from "./modelo";

/** Valor que uma marcação concluída rende: o valor ajustado ou o preço do serviço. */
export function valorDaMarcacao(marcacao: Marcacao, servicos: Servico[]) {
  if (marcacao.valorCentimos !== null) return marcacao.valorCentimos;
  return servicos.find((s) => s.id === marcacao.servicoId)?.precoCentimos ?? 0;
}

export type ResumoGanhos = {
  /** Soma das marcações concluídas. */
  ganhoCentimos: number;
  /** O que ainda falta concluir (marcações no estado "marcada"). */
  previstoCentimos: number;
  concluidas: number;
  porConcluir: number;
  faltas: number;
  porProfissional: {
    profissionalId: string;
    nome: string;
    ganhoCentimos: number;
    concluidas: number;
  }[];
};

/** Resumo de ganhos de um conjunto de marcações (ex.: as de um dia). */
export function resumirGanhos(
  marcacoes: Marcacao[],
  servicos: Servico[],
  profissionais: Profissional[],
): ResumoGanhos {
  const concluidas = marcacoes.filter((m) => m.estado === "concluida");
  const porConcluir = marcacoes.filter((m) => m.estado === "marcada");

  const somar = (lista: Marcacao[]) =>
    lista.reduce((total, m) => total + valorDaMarcacao(m, servicos), 0);

  return {
    ganhoCentimos: somar(concluidas),
    previstoCentimos: somar(porConcluir),
    concluidas: concluidas.length,
    porConcluir: porConcluir.length,
    faltas: marcacoes.filter((m) => m.estado === "faltou").length,
    porProfissional: profissionais.map((profissional) => {
      const doProfissional = concluidas.filter(
        (m) => m.profissionalId === profissional.id,
      );
      return {
        profissionalId: profissional.id,
        nome: profissional.nome,
        ganhoCentimos: somar(doProfissional),
        concluidas: doProfissional.length,
      };
    }),
  };
}
