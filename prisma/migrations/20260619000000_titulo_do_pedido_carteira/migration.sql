-- AlterTable: liga o título de Contas a Receber ao pedido de carteira que o gerou.
-- É por esse vínculo que a sincronização reencontra o título quando o pedido muda,
-- é pago ou é excluído — sem ele o título vira órfão e duplica a cada acerto.
ALTER TABLE "TituloFinanceiro" ADD COLUMN "pedidoId" TEXT;

-- Um pedido tem no máximo um título: é o que permite o upsert em vez de "apaga e cria".
CREATE UNIQUE INDEX "TituloFinanceiro_pedidoId_key" ON "TituloFinanceiro"("pedidoId");

-- Excluir o pedido leva o título junto — venda que não existe mais não é a receber.
ALTER TABLE "TituloFinanceiro"
  ADD CONSTRAINT "TituloFinanceiro_pedidoId_fkey"
  FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;
