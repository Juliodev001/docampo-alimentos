-- ============================================================================
--  ESTOQUE DE MORANGO — reconstruir a partir da COLHEITA e unificar os apelidos
--  Gerado em 2026-07-29
-- ============================================================================
--
--  O PROBLEMA
--  Até agora a colheita da roça NÃO alimentava o estoque do PDV. O número que
--  o PDV mostrava vinha do campo "Estoque Atual" digitado no cadastro do
--  produto — por isso cada apelido do morango (MORANGO, MORANGO NOVO,
--  MORANGO 2 BOCA…) mostrava uma quantidade diferente e inventada.
--
--  A CORREÇÃO DE VERDADE já está no código: agora toda colheita lança uma
--  entrada de estoque e toda venda no PDV desconta. Este script arruma o que
--  já existe no banco, em duas frentes de uma vez:
--
--    1. JOGA FORA os saldos digitados à mão dos morangos (os 737, 52, 922, 597
--       — dados de recadastro, não são estoque real).
--    2. RECONSTRÓI o estoque a partir das colheitas de morango já lançadas:
--       cada colheita vira uma entrada, somando o LÍQUIDO (total − descarte),
--       o mesmo número que o Dashboard mostra em "Caixas compradas".
--    3. UNIFICA: todos os apelidos passam a apontar para MORANGO, então o PDV
--       mostra o MESMO saldo em todos e a venda de qualquer um desconta do
--       mesmo lugar.
--
--  Resultado: o saldo do grupo passa a ser exatamente o total colhido de
--  morango. Rode o PASSO 1 antes para ver que número é esse (deve bater com as
--  "Caixas compradas" do período correspondente).
--
--  ┌───────────────────────────────────────────────────────────────────────┐
--  │  >>> FAÇA UM BACKUP ANTES DE RODAR <<<                                  │
--  │                                                                         │
--  │  pg_dump -Fc "$DATABASE_URL" -f margem_backup_2026-07-29.dump           │
--  │                                                                         │
--  │  Restaurar, se precisar:                                                │
--  │  pg_restore --clean --if-exists -d "$DATABASE_URL" margem_backup_...dump │
--  └───────────────────────────────────────────────────────────────────────┘
--
--  PARA RODAR
--    psql "$DATABASE_URL" -f prisma/vincular-estoque.sql
--
--  Tudo no PASSO 2 roda dentro de uma transação: se algo falhar, NADA muda.
-- ============================================================================


-- ============================================================================
--  PASSO 1 — o que existe hoje. Rode sozinho primeiro.
--  (a) Saldo atual digitado em cada cadastro de morango.
--  (b) Total colhido de morango — este é o número que o grupo vai passar a ter.
-- ============================================================================

-- (a) saldo atual por cadastro
SELECT
  p.nome,
  COALESCE(SUM(e.quantidade), 0) AS saldo_atual,
  p."estoqueVinculadoId"         AS ja_vinculado_a
FROM "Produto" p
LEFT JOIN "EntradaEstoque" e ON e."produtoId" = p.id
WHERE p.nome ILIKE '%MORANGO%'
GROUP BY p.id
ORDER BY p.nome;

-- (b) total colhido (líquido) de morango = saldo que o grupo terá no fim
SELECT
  COALESCE(SUM(c."quantidadeTotal" - c.descarte), 0) AS total_colhido_liquido
FROM "ColheitaDiaria" c
JOIN "Produto" p ON p.id = c."produtoId"
WHERE p.nome ILIKE '%MORANGO%';


-- ============================================================================
--  PASSO 2 — reconstruir e unificar.
--
--  ATENÇÃO: pega TODO cadastro cujo nome contém "MORANGO". Se MORANGO FONDUE
--  (ou outro) for uma mercadoria à parte que NÃO deve dividir estoque com o
--  morango comum, troque os filtros ILIKE '%MORANGO%' por uma lista fixa de
--  nomes, deixando o fondue de fora.
-- ============================================================================

BEGIN;

-- ─── define o grupo ─────────────────────────────────────────────────────────
CREATE TEMP TABLE grupo_mestre ON COMMIT DROP AS
  SELECT id FROM "Produto"
  WHERE upper(btrim(nome)) = 'MORANGO'           -- <<< O MESTRE
  LIMIT 1;

CREATE TEMP TABLE grupo_todos ON COMMIT DROP AS
  SELECT id FROM "Produto" WHERE nome ILIKE '%MORANGO%';   -- <<< O GRUPO
-- ────────────────────────────────────────────────────────────────────────────

-- Trava: sem o mestre, aborta e nada é aplicado.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM grupo_mestre) THEN
    RAISE EXCEPTION 'Produto MESTRE "MORANGO" não encontrado — confira o PASSO 1.';
  END IF;
END $$;

-- 1) zera o estoque atual de TODO o grupo (os números digitados à mão).
DELETE FROM "EntradaEstoque"
WHERE "produtoId" IN (SELECT id FROM grupo_todos);

-- 2) unifica: mestre com estoque próprio, os demais apontando para ele.
UPDATE "Produto" SET "estoqueVinculadoId" = NULL
WHERE id = (SELECT id FROM grupo_mestre);

UPDATE "Produto" SET "estoqueVinculadoId" = (SELECT id FROM grupo_mestre)
WHERE id IN (SELECT id FROM grupo_todos)
  AND id <> (SELECT id FROM grupo_mestre);

-- 3) reconstrói o estoque a partir da colheita: uma entrada por colheita de
--    morango, toda no mestre, marcada com "Colheita #<id>" (mesma marca que o
--    código passou a gravar — assim editar/excluir a colheita depois refaz a
--    entrada certa). Só o líquido positivo entra.
INSERT INTO "EntradaEstoque" (id, "produtoId", quantidade, "valorUnit", data, observacao, "createdAt")
SELECT
  md5(random()::text || clock_timestamp()::text || c.id),
  (SELECT id FROM grupo_mestre),
  c."quantidadeTotal" - c.descarte,
  c.preco,
  c.data,
  'Colheita #' || c.id,
  now()
FROM "ColheitaDiaria" c
JOIN "Produto" p ON p.id = c."produtoId"
WHERE p.nome ILIKE '%MORANGO%'
  AND (c."quantidadeTotal" - c.descarte) > 0;

COMMIT;


-- ============================================================================
--  PASSO 3 — conferência.
--  "saldo_exibido" é o número que o PDV vai mostrar. Todo o grupo tem que sair
--  com o MESMO valor, igual ao "total_colhido_liquido" do PASSO 1(b).
-- ============================================================================
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
