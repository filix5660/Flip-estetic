import { criarRepositorioMemoria } from "./memoria";
import type { Repositorio } from "./repositorio";

/**
 * Ponto único de acesso aos dados.
 * Para usar a base de dados: `export const repo = criarRepositorioPrisma();`
 */
export const repo: Repositorio = criarRepositorioMemoria();

export type { Repositorio } from "./repositorio";
