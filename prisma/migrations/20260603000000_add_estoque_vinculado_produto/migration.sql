-- AlterTable: adiciona vínculo de estoque entre produtos
ALTER TABLE "Produto" ADD COLUMN IF NOT EXISTS "estoqueVinculadoId" TEXT;

ALTER TABLE "Produto" ADD CONSTRAINT "Produto_estoqueVinculadoId_fkey"
  FOREIGN KEY ("estoqueVinculadoId") REFERENCES "Produto"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
