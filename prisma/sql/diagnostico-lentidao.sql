-- Diagnóstico de lentidão dos relatórios. SÓ LEITURA — não altera nada.
-- Rodar no banco de PRODUÇÃO, com \timing ligado:
--
--   psql "$DATABASE_URL" -f prisma/sql/diagnostico-lentidao.sql
--
-- Responde três perguntas, nesta ordem:
--   1. o banco tem volume que justifique a demora?
--   2. as conexões estão sobrando ou estão no limite?
--   3. a consulta do relatório, medida sozinha, demora quanto?
-- Se as três derem números baixos, o minuto de espera NÃO está no banco — está
-- na rede ou no processo do Node, e o próximo passo é medir o tempo de resposta
-- do servidor (aba Rede do navegador).

\timing on

-- 1. Volume de cada tabela.
SELECT relname AS tabela,
       n_live_tup AS linhas,
       pg_size_pretty(pg_total_relation_size(relid)) AS tamanho
  FROM pg_stat_user_tables
 ORDER BY n_live_tup DESC
 LIMIT 15;

-- 2. Conexões abertas neste banco. `max_connections` é o teto do servidor; se
-- "total" estiver perto dele, é aí que a espera acontece — cada consulta fica na
-- fila aguardando uma conexão vaga em vez de rodar.
SELECT count(*)                                        AS total,
       count(*) FILTER (WHERE state = 'active')        AS ativas,
       count(*) FILTER (WHERE state = 'idle')          AS ociosas,
       current_setting('max_connections')              AS max_connections
  FROM pg_stat_activity
 WHERE datname = current_database();

-- 3. Consultas que os relatórios realmente fazem, cronometradas.
-- Usam o primeiro produtor / primeiro cliente que existir na base.

-- 3a. Fechamentos do produtor (tela "Ver relatório" de Roças).
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "FechamentoPagamento"
 WHERE "produtorId" = (SELECT id FROM "Produtor" ORDER BY "createdAt" LIMIT 1)
 ORDER BY "dataPagamento" ASC;

-- 3b. Colheitas do produtor no período — a consulta mais pesada do fechamento.
EXPLAIN (ANALYZE, BUFFERS)
SELECT "data", "quantidadeTotal", "descarte", "preco", "parceiroId", "percParceiro"
  FROM "ColheitaDiaria"
 WHERE "produtorId" = (SELECT id FROM "Produtor" ORDER BY "createdAt" LIMIT 1)
   AND "data" BETWEEN now() - interval '90 days' AND now();

-- 3c. Pedidos do cliente (extrato em PDF).
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "Pedido"
 WHERE "clienteId" = (SELECT id FROM "Cliente" ORDER BY "createdAt" LIMIT 1)
   AND "tipo" IN ('VENDA', 'PDV')
   AND "status" <> 'CANCELADO'
 ORDER BY "data" ASC;

-- 3d. Entradas de estoque procuradas pela marca da colheita — é o que a tela de
-- Roças dispara sozinha a cada visita (POST /api/estoque/sync-lancamentos).
EXPLAIN (ANALYZE, BUFFERS)
SELECT "observacao" FROM "EntradaEstoque"
 WHERE "observacao" LIKE 'Colheita #%';

\timing off
