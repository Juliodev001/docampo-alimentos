-- ============================================================================
--  MORANGO — deixar todos os apelidos com o MESMO estoque
--  Gerado em 2026-07-29
-- ============================================================================
--
--  O QUE FAZ
--  Aponta MORANGO 2 BOCA, MORANGO 2 BOCA NOVO, MORANGO NOVO e MORANGO FONDUE
--  para o cadastro MESTRE "MORANGO". A partir daí todos mostram o MESMO saldo
--  (o do MORANGO) e vender qualquer um desconta do mesmo lugar.
--
--  SEGURO: só preenche a coluna estoqueVinculadoId. NÃO apaga estoque, NÃO
--  mexe em colheita, compra ou lucro. É reversível — para desfazer, rode o
--  bloco DESFAZER no fim.
--
--  NÃO precisa de build nem deploy: o sistema já sabe ler o estoque vinculado.
--  Depois de rodar, recarregue a página (F5) do PDV.
--
--  COMO RODAR (no terminal do VPS):
--    psql "$DATABASE_URL" -f prisma/vincular-estoque.sql
--
--  Um backup rápido é sempre bom, mas aqui o risco é baixo (nada é apagado):
--    pg_dump -Fc "$DATABASE_URL" -f margem_backup_2026-07-29.dump
-- ============================================================================


-- ── ANTES: como está hoje ────────────────────────────────────────────────────
SELECT
  p.nome,
  COALESCE(SUM(e.quantidade), 0) AS saldo,
  p."estoqueVinculadoId"          AS vinculado_a
FROM "Produto" p
LEFT JOIN "EntradaEstoque" e ON e."produtoId" = p.id
WHERE p.nome ILIKE '%MORANGO%'
GROUP BY p.id
ORDER BY p.nome;


-- ── O VÍNCULO ────────────────────────────────────────────────────────────────
BEGIN;

-- Trava: o mestre "MORANGO" precisa existir.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Produto" WHERE upper(btrim(nome)) = 'MORANGO') THEN
    RAISE EXCEPTION 'Produto MESTRE "MORANGO" não encontrado — confira o nome no SELECT acima.';
  END IF;
END $$;

-- O mestre tem estoque próprio (não pode apontar para ninguém).
UPDATE "Produto"
SET "estoqueVinculadoId" = NULL
WHERE upper(btrim(nome)) = 'MORANGO';

-- Todos os outros "MORANGO ..." passam a usar o estoque do MORANGO.
-- (Se MORANGO FONDUE for outra mercadoria, tire a linha do AND abaixo
--  trocando o ILIKE por uma lista fixa de nomes sem o fondue.)
UPDATE "Produto"
SET "estoqueVinculadoId" = (SELECT id FROM "Produto" WHERE upper(btrim(nome)) = 'MORANGO' LIMIT 1)
WHERE nome ILIKE '%MORANGO%'
  AND upper(btrim(nome)) <> 'MORANGO';

COMMIT;


-- ── DEPOIS: confira (todos têm que sair com o MESMO "saldo_exibido") ──────────
SELECT
  p.nome,
  COALESCE((
    SELECT SUM(e.quantidade) FROM "EntradaEstoque" e
    WHERE e."produtoId" = COALESCE(p."estoqueVinculadoId", p.id)
  ), 0) AS saldo_exibido,
  CASE WHEN p."estoqueVinculadoId" IS NULL THEN 'estoque próprio' ELSE m.nome END AS estoque_de
FROM "Produto" p
LEFT JOIN "Produto" m ON m.id = p."estoqueVinculadoId"
WHERE p.nome ILIKE '%MORANGO%'
ORDER BY p.nome;


-- ============================================================================
--  DESFAZER (se precisar) — devolve cada um ao seu estoque próprio.
-- ============================================================================
-- UPDATE "Produto" SET "estoqueVinculadoId" = NULL WHERE nome ILIKE '%MORANGO%';
