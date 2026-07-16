-- Vincula pagamentos avulsos de meeiro ao fechamento que os absorve.
-- OBRIGATÓRIO rodar em produção ANTES de subir o deploy que usa esta coluna:
--   npx prisma db execute --file scripts/ddl-pagamento-meeiro-fechamento.sql
-- (não usar `prisma db push` — o banco tem drift conhecido em Empresa/datasAdicionais)

ALTER TABLE "PagamentoMeeiro" ADD COLUMN IF NOT EXISTS "fechamentoMeeiroId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PagamentoMeeiro_fechamentoMeeiroId_fkey'
  ) THEN
    ALTER TABLE "PagamentoMeeiro"
      ADD CONSTRAINT "PagamentoMeeiro_fechamentoMeeiroId_fkey"
      FOREIGN KEY ("fechamentoMeeiroId") REFERENCES "FechamentoMeeiro"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
