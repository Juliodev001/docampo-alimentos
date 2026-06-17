-- AlterTable: adiciona valor de bandeja/embalagem por lançamento em ColheitaDiaria
ALTER TABLE "ColheitaDiaria" ADD COLUMN IF NOT EXISTS "bandeja" DOUBLE PRECISION NOT NULL DEFAULT 0;
