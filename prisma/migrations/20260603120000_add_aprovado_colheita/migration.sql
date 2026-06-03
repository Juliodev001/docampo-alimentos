-- AlterTable: adiciona campo aprovado em ColheitaDiaria
ALTER TABLE "ColheitaDiaria" ADD COLUMN IF NOT EXISTS "aprovado" BOOLEAN NOT NULL DEFAULT true;
