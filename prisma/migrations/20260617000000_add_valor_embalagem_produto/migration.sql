-- AlterTable: adiciona valor padrão de embalagem por produto, usado para pré-preencher o lançamento de roça
ALTER TABLE "Produto" ADD COLUMN IF NOT EXISTS "valorEmbalagem" DECIMAL(12,4) NOT NULL DEFAULT 1.40;
