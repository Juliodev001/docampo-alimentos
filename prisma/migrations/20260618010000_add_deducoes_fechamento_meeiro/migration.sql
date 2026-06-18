-- AlterTable: adiciona campos de dedução próprios do fechamento do meeiro (combustível, embalagem, vales, créditos, débitos),
-- auto-preenchidos a partir do rateio do fechamento do produtor mas editáveis antes de fechar.
ALTER TABLE "FechamentoMeeiro" ADD COLUMN IF NOT EXISTS "combustivel" DECIMAL(12,4) NOT NULL DEFAULT 0;
ALTER TABLE "FechamentoMeeiro" ADD COLUMN IF NOT EXISTS "bandejaEmbalagem" DECIMAL(12,4) NOT NULL DEFAULT 0;
ALTER TABLE "FechamentoMeeiro" ADD COLUMN IF NOT EXISTS "valesDinheiro" DECIMAL(12,4) NOT NULL DEFAULT 0;
ALTER TABLE "FechamentoMeeiro" ADD COLUMN IF NOT EXISTS "creditos" DECIMAL(12,4) NOT NULL DEFAULT 0;
ALTER TABLE "FechamentoMeeiro" ADD COLUMN IF NOT EXISTS "debitosAnteriores" DECIMAL(12,4) NOT NULL DEFAULT 0;
