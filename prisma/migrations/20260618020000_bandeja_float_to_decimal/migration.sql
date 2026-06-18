-- AlterTable: padroniza "bandeja" (valor da embalagem) como Decimal, igual aos demais campos monetários
ALTER TABLE "ColheitaDiaria" ALTER COLUMN "bandeja" SET DATA TYPE DECIMAL(12,4);
