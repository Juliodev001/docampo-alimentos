-- AlterTable: remove valor de embalagem por produto — substituído por um valor único global em Configuracao
ALTER TABLE "Produto" DROP COLUMN IF EXISTS "valorEmbalagem";
