-- Garante na base de dados que um profissional nunca tem duas marcações
-- ativas sobrepostas, mesmo que dois clientes confirmem ao mesmo tempo.
-- Aplicar numa migração depois de `prisma migrate dev` (ex.: `prisma migrate dev --create-only`
-- e colar este SQL no ficheiro gerado).

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Marcacao"
  ADD CONSTRAINT "Marcacao_sem_sobreposicao"
  EXCLUDE USING gist (
    "profissionalId" WITH =,
    "data" WITH =,
    int4range("inicioMin", "fimMin") WITH &&
  )
  WHERE ("estado" <> 'cancelada');
