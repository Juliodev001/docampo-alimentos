-- Float → Decimal (NUMERIC 12,4) para todos os campos monetários

-- Produto
ALTER TABLE "Produto"
  ALTER COLUMN "preco"            TYPE NUMERIC(12,4) USING "preco"::NUMERIC,
  ALTER COLUMN "precoVenda"       TYPE NUMERIC(12,4) USING "precoVenda"::NUMERIC,
  ALTER COLUMN "precoPromocional" TYPE NUMERIC(12,4) USING "precoPromocional"::NUMERIC,
  ALTER COLUMN "precoPdv"         TYPE NUMERIC(12,4) USING "precoPdv"::NUMERIC;

-- EntradaEstoque
ALTER TABLE "EntradaEstoque"
  ALTER COLUMN "valorUnit" TYPE NUMERIC(12,4) USING "valorUnit"::NUMERIC;

-- ColheitaDiaria
ALTER TABLE "ColheitaDiaria"
  ALTER COLUMN "preco" TYPE NUMERIC(12,4) USING "preco"::NUMERIC;

-- SaidaLavoura
ALTER TABLE "SaidaLavoura"
  ALTER COLUMN "valorUnit"  TYPE NUMERIC(12,4) USING "valorUnit"::NUMERIC,
  ALTER COLUMN "totalValor" TYPE NUMERIC(12,4) USING "totalValor"::NUMERIC;

-- Compra
ALTER TABLE "Compra"
  ALTER COLUMN "totalValor" TYPE NUMERIC(12,4) USING "totalValor"::NUMERIC;

-- ItemCompra
ALTER TABLE "ItemCompra"
  ALTER COLUMN "valorUnit" TYPE NUMERIC(12,4) USING "valorUnit"::NUMERIC,
  ALTER COLUMN "total"     TYPE NUMERIC(12,4) USING "total"::NUMERIC;

-- EntradaProducao
ALTER TABLE "EntradaProducao"
  ALTER COLUMN "custoUnit" TYPE NUMERIC(12,4) USING "custoUnit"::NUMERIC,
  ALTER COLUMN "total"     TYPE NUMERIC(12,4) USING "total"::NUMERIC;

-- SaidaProducao
ALTER TABLE "SaidaProducao"
  ALTER COLUMN "custoUnit" TYPE NUMERIC(12,4) USING "custoUnit"::NUMERIC,
  ALTER COLUMN "total"     TYPE NUMERIC(12,4) USING "total"::NUMERIC;

-- FechamentoPagamento
ALTER TABLE "FechamentoPagamento"
  ALTER COLUMN "combustivel"       TYPE NUMERIC(12,4) USING "combustivel"::NUMERIC,
  ALTER COLUMN "bandejaEmbalagem"  TYPE NUMERIC(12,4) USING "bandejaEmbalagem"::NUMERIC,
  ALTER COLUMN "valesDinheiro"     TYPE NUMERIC(12,4) USING "valesDinheiro"::NUMERIC,
  ALTER COLUMN "creditos"          TYPE NUMERIC(12,4) USING "creditos"::NUMERIC,
  ALTER COLUMN "debitosAnteriores" TYPE NUMERIC(12,4) USING "debitosAnteriores"::NUMERIC;

-- Parceiro
ALTER TABLE "Parceiro"
  ALTER COLUMN "valorEmba" TYPE NUMERIC(12,4) USING "valorEmba"::NUMERIC;

-- PagamentoMeeiro
ALTER TABLE "PagamentoMeeiro"
  ALTER COLUMN "valor" TYPE NUMERIC(12,4) USING "valor"::NUMERIC;

-- Romaneio
ALTER TABLE "Romaneio"
  ALTER COLUMN "totalValor" TYPE NUMERIC(12,4) USING "totalValor"::NUMERIC;

-- ItemRomaneio
ALTER TABLE "ItemRomaneio"
  ALTER COLUMN "valorUnit" TYPE NUMERIC(12,4) USING "valorUnit"::NUMERIC,
  ALTER COLUMN "total"     TYPE NUMERIC(12,4) USING "total"::NUMERIC;

-- TituloFinanceiro
ALTER TABLE "TituloFinanceiro"
  ALTER COLUMN "valor" TYPE NUMERIC(12,4) USING "valor"::NUMERIC;

-- NotaFiscal
ALTER TABLE "NotaFiscal"
  ALTER COLUMN "totalValor" TYPE NUMERIC(12,4) USING "totalValor"::NUMERIC;

-- ItemNF
ALTER TABLE "ItemNF"
  ALTER COLUMN "valorUnit" TYPE NUMERIC(12,4) USING "valorUnit"::NUMERIC,
  ALTER COLUMN "total"     TYPE NUMERIC(12,4) USING "total"::NUMERIC;

-- Devolucao
ALTER TABLE "Devolucao"
  ALTER COLUMN "totalValor" TYPE NUMERIC(12,4) USING "totalValor"::NUMERIC;

-- ItemDevolucao
ALTER TABLE "ItemDevolucao"
  ALTER COLUMN "valorUnit" TYPE NUMERIC(12,4) USING "valorUnit"::NUMERIC,
  ALTER COLUMN "total"     TYPE NUMERIC(12,4) USING "total"::NUMERIC;

-- ContaBancaria
ALTER TABLE "ContaBancaria"
  ALTER COLUMN "saldoInicial" TYPE NUMERIC(12,4) USING "saldoInicial"::NUMERIC;

-- Movimentacao
ALTER TABLE "Movimentacao"
  ALTER COLUMN "valor" TYPE NUMERIC(12,4) USING "valor"::NUMERIC;

-- Pedido
ALTER TABLE "Pedido"
  ALTER COLUMN "totalValor"  TYPE NUMERIC(12,4) USING "totalValor"::NUMERIC,
  ALTER COLUMN "frete"       TYPE NUMERIC(12,4) USING "frete"::NUMERIC,
  ALTER COLUMN "outrasTaxas" TYPE NUMERIC(12,4) USING "outrasTaxas"::NUMERIC;

-- ItemPedido
ALTER TABLE "ItemPedido"
  ALTER COLUMN "valorUnit" TYPE NUMERIC(12,4) USING "valorUnit"::NUMERIC,
  ALTER COLUMN "desconto"  TYPE NUMERIC(12,4) USING "desconto"::NUMERIC,
  ALTER COLUMN "total"     TYPE NUMERIC(12,4) USING "total"::NUMERIC;

-- RegistroRoca
ALTER TABLE "RegistroRoca"
  ALTER COLUMN "custo" TYPE NUMERIC(12,4) USING "custo"::NUMERIC;

-- LancamentoCusto
ALTER TABLE "LancamentoCusto"
  ALTER COLUMN "combustivel"       TYPE NUMERIC(12,4) USING "combustivel"::NUMERIC,
  ALTER COLUMN "bandejaEmbalagem"  TYPE NUMERIC(12,4) USING "bandejaEmbalagem"::NUMERIC,
  ALTER COLUMN "valesDinheiro"     TYPE NUMERIC(12,4) USING "valesDinheiro"::NUMERIC,
  ALTER COLUMN "creditos"          TYPE NUMERIC(12,4) USING "creditos"::NUMERIC,
  ALTER COLUMN "debitosAnteriores" TYPE NUMERIC(12,4) USING "debitosAnteriores"::NUMERIC;
