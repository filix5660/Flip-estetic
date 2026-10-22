import type { Plano } from "./tipos";

export interface DefinicaoPlano {
  id: Plano;
  nome: string;
  resumo: string;
  maxProfissionais: number;
  recursos: string[];
}

export const PLANOS: Record<Plano, DefinicaoPlano> = {
  solo: {
    id: "solo",
    nome: "Solo",
    resumo: "Para quem trabalha sozinho.",
    maxProfissionais: 1,
    recursos: [
      "Página de marcação com o teu link",
      "Serviços e horários ilimitados",
      "Agenda e lista de clientes",
    ],
  },
  equipa: {
    id: "equipa",
    nome: "Equipa",
    resumo: "Para salões com mais de um profissional.",
    maxProfissionais: 15,
    recursos: [
      "Tudo o que está no Solo",
      "Até 15 profissionais, cada um com a sua agenda",
      "O cliente escolhe com quem quer marcar",
    ],
  },
};

export function podeAdicionarProfissional(plano: Plano, totalAtual: number) {
  return totalAtual < PLANOS[plano].maxProfissionais;
}
