-- Índices das colunas por onde os relatórios procuram.
--
-- O Postgres cria índice sozinho só para a chave primária e para colunas UNIQUE
-- — chave estrangeira NÃO ganha índice automático. Como nenhuma tabela deste
-- schema declarava índice, toda consulta de relatório ("as colheitas deste
-- produtor neste período", "os pedidos deste cliente") varria a tabela inteira e
-- só depois descartava o que não servia. Com a base pequena isso passava
-- despercebido; com o volume de produção é o que faz o relatório demorar a abrir.
--
-- Cada índice abaixo espelha exatamente um filtro que existe no código. Nos
-- índices de duas colunas a ordem importa: primeiro a coluna comparada por
-- igualdade (o dono do registro), depois a comparada por intervalo (a data).
--
-- IF NOT EXISTS deixa a migração poder ser reaplicada sem erro.

-- Fechamento de produtor e de meeiro: colheitas de uma pessoa dentro do período.
CREATE INDEX IF NOT EXISTS "ColheitaDiaria_produtorId_data_idx" ON "ColheitaDiaria"("produtorId", "data");
CREATE INDEX IF NOT EXISTS "ColheitaDiaria_parceiroId_data_idx" ON "ColheitaDiaria"("parceiroId", "data");
CREATE INDEX IF NOT EXISTS "ColheitaDiaria_data_idx"            ON "ColheitaDiaria"("data");
CREATE INDEX IF NOT EXISTS "ColheitaDiaria_produtoId_idx"       ON "ColheitaDiaria"("produtoId");
CREATE INDEX IF NOT EXISTS "ColheitaDiaria_rocaId_idx"          ON "ColheitaDiaria"("rocaId");

CREATE INDEX IF NOT EXISTS "FechamentoPagamento_produtorId_dataPagamento_idx" ON "FechamentoPagamento"("produtorId", "dataPagamento");
CREATE INDEX IF NOT EXISTS "FechamentoMeeiro_parceiroId_dataPagamento_idx"    ON "FechamentoMeeiro"("parceiroId", "dataPagamento");

CREATE INDEX IF NOT EXISTS "Vale_fechamentoId_idx"       ON "Vale"("fechamentoId");
CREATE INDEX IF NOT EXISTS "Vale_fechamentoMeeiroId_idx" ON "Vale"("fechamentoMeeiroId");
CREATE INDEX IF NOT EXISTS "Vale_produtorId_idx"         ON "Vale"("produtorId");
CREATE INDEX IF NOT EXISTS "Vale_parceiroId_idx"         ON "Vale"("parceiroId");

CREATE INDEX IF NOT EXISTS "Parceiro_produtorId_idx"                 ON "Parceiro"("produtorId");
CREATE INDEX IF NOT EXISTS "PagamentoMeeiro_parceiroId_idx"          ON "PagamentoMeeiro"("parceiroId");
CREATE INDEX IF NOT EXISTS "PagamentoMeeiro_fechamentoMeeiroId_idx"  ON "PagamentoMeeiro"("fechamentoMeeiroId");

-- Extrato do cliente e relatórios de venda.
CREATE INDEX IF NOT EXISTS "Pedido_clienteId_data_idx" ON "Pedido"("clienteId", "data");
CREATE INDEX IF NOT EXISTS "Pedido_data_idx"           ON "Pedido"("data");
CREATE INDEX IF NOT EXISTS "ItemPedido_pedidoId_idx"   ON "ItemPedido"("pedidoId");

CREATE INDEX IF NOT EXISTS "TituloFinanceiro_clienteId_idx" ON "TituloFinanceiro"("clienteId");
CREATE INDEX IF NOT EXISTS "TituloFinanceiro_dataVenc_idx"  ON "TituloFinanceiro"("dataVenc");

CREATE INDEX IF NOT EXISTS "NotaFiscal_status_dataEmissao_idx" ON "NotaFiscal"("status", "dataEmissao");
CREATE INDEX IF NOT EXISTS "NotaFiscal_clienteId_idx"          ON "NotaFiscal"("clienteId");
CREATE INDEX IF NOT EXISTS "ItemNF_notaFiscalId_idx"           ON "ItemNF"("notaFiscalId");

-- Contas a pagar e DRE.
CREATE INDEX IF NOT EXISTS "Compra_data_idx"         ON "Compra"("data");
CREATE INDEX IF NOT EXISTS "Compra_vencimento_idx"   ON "Compra"("vencimento");
CREATE INDEX IF NOT EXISTS "Compra_fornecedorId_idx" ON "Compra"("fornecedorId");
CREATE INDEX IF NOT EXISTS "ItemCompra_compraId_idx" ON "ItemCompra"("compraId");

-- Estoque: a entrada da colheita é reencontrada pela marca gravada em observacao
-- ("Colheita #<id>"), tanto ao editar/excluir quanto no sync da tela de Roças.
CREATE INDEX IF NOT EXISTS "EntradaEstoque_produtoId_idx"  ON "EntradaEstoque"("produtoId");
CREATE INDEX IF NOT EXISTS "EntradaEstoque_observacao_idx" ON "EntradaEstoque"("observacao");

-- Controle de roça e custos.
CREATE INDEX IF NOT EXISTS "ControleRoca_produtorId_idx"          ON "ControleRoca"("produtorId");
CREATE INDEX IF NOT EXISTS "RegistroRoca_rocaId_idx"              ON "RegistroRoca"("rocaId");
CREATE INDEX IF NOT EXISTS "LancamentoCusto_produtorId_data_idx"  ON "LancamentoCusto"("produtorId", "data");
CREATE INDEX IF NOT EXISTS "LancamentoCusto_rocaId_idx"           ON "LancamentoCusto"("rocaId");

-- Caixa.
CREATE INDEX IF NOT EXISTS "Movimentacao_contaBancariaId_data_idx" ON "Movimentacao"("contaBancariaId", "data");
