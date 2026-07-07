-- Cria a tabela do Leitor de Documentos (feature /leitor).
-- Rodar UMA vez no banco de PRODUÇÃO. É seguro re-executar (IF NOT EXISTS).
-- NÃO usar `prisma db push` neste projeto: ele tentaria apagar a tabela
-- `Empresa` e a coluna `datasAdicionais` (drift pré-existente com dados reais).

CREATE TABLE IF NOT EXISTS "DocumentoDigitalizado" (
  "id"         TEXT PRIMARY KEY,
  "nome"       TEXT NOT NULL,
  "imagem"     TEXT,
  "textoBruto" TEXT,
  "campos"     JSONB NOT NULL DEFAULT '[]',
  "total"      DECIMAL(14,2),
  "userId"     TEXT,
  "criadoEm"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "DocumentoDigitalizado_criadoEm_idx"
  ON "DocumentoDigitalizado" ("criadoEm");
