/** Resposta de uma ação do servidor. As mensagens de erro são sempre seguras para mostrar. */
export type Resultado<T = undefined> =
  | { ok: true; dados: T }
  | { ok: false; erro: string };

export const sucesso = <T>(dados: T): Resultado<T> => ({ ok: true, dados });
export const erro = (mensagem: string): Resultado<never> => ({
  ok: false,
  erro: mensagem,
});

export const ERRO_GENERICO = "Não foi possível guardar. Tenta novamente.";
export const ERRO_DADOS = "Verifica os dados e tenta novamente.";
