-- CreateTable: fechamento de pagamento próprio do meeiro (paralelo ao FechamentoPagamento do produtor)
CREATE TABLE "FechamentoMeeiro" (
    "id" TEXT NOT NULL,
    "parceiroId" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "dataPagamento" TIMESTAMP(3) NOT NULL,
    "valorBruto" DECIMAL(12,4) NOT NULL,
    "valesDeduzidos" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "valorPago" DECIMAL(12,4) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FechamentoMeeiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable: vale (adiantamento em dinheiro) para produtor ou meeiro
CREATE TABLE "Vale" (
    "id" TEXT NOT NULL,
    "produtorId" TEXT,
    "parceiroId" TEXT,
    "valor" DECIMAL(12,4) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "observacao" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "fechamentoId" TEXT,
    "fechamentoMeeiroId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vale_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FechamentoMeeiro" ADD CONSTRAINT "FechamentoMeeiro_parceiroId_fkey" FOREIGN KEY ("parceiroId") REFERENCES "Parceiro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vale" ADD CONSTRAINT "Vale_produtorId_fkey" FOREIGN KEY ("produtorId") REFERENCES "Produtor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vale" ADD CONSTRAINT "Vale_parceiroId_fkey" FOREIGN KEY ("parceiroId") REFERENCES "Parceiro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vale" ADD CONSTRAINT "Vale_fechamentoId_fkey" FOREIGN KEY ("fechamentoId") REFERENCES "FechamentoPagamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vale" ADD CONSTRAINT "Vale_fechamentoMeeiroId_fkey" FOREIGN KEY ("fechamentoMeeiroId") REFERENCES "FechamentoMeeiro"("id") ON DELETE SET NULL ON UPDATE CASCADE;
