-- Corrige fechamentos de produtor em que o mesmo vale foi descontado duas vezes.
--
-- Causa: ao salvar o fechamento, os vales marcados eram somados no campo
-- `valesDinheiro` (dedução rateada) E vinculados ao fechamento via
-- `Vale.fechamentoId` (abatimento pessoal). O recibo desconta os dois.
-- O código já foi corrigido; este script conserta os registros antigos.
--
-- Roda dentro de uma transação e imprime o antes e o depois.
--   sudo -u postgres psql -d horti -f prisma/corrigir-vales-duplicados.sql

BEGIN;

\echo ''
\echo '=== ANTES (fechamentos com desconto em dobro) ==='

SELECT
  p.nome                                                     AS produtor,
  f."dataInicio"::date                                       AS inicio,
  f."dataFim"::date                                          AS fim,
  f."valesDinheiro"                                          AS vales_dinheiro,
  COALESCE(SUM(v.valor), 0)                                  AS abatimento_vale,
  GREATEST(f."valesDinheiro" - COALESCE(SUM(v.valor), 0), 0) AS vales_dinheiro_corrigido
FROM "FechamentoPagamento" f
JOIN "Produtor" p ON p.id = f."produtorId"
JOIN "Vale" v ON v."fechamentoId" = f.id
WHERE f."valesDinheiro" > 0
GROUP BY f.id, p.nome
ORDER BY f."dataInicio";

-- Remove de `valesDinheiro` a parte que já é abatimento de vale vinculado.
UPDATE "FechamentoPagamento" f
SET "valesDinheiro" = GREATEST(f."valesDinheiro" - s.total, 0)
FROM (
  SELECT "fechamentoId", SUM(valor) AS total
  FROM "Vale"
  WHERE "fechamentoId" IS NOT NULL
  GROUP BY "fechamentoId"
) s
WHERE s."fechamentoId" = f.id
  AND f."valesDinheiro" > 0;

\echo ''
\echo '=== DEPOIS (deve vir vazio) ==='

SELECT
  p.nome               AS produtor,
  f."dataInicio"::date AS inicio,
  f."valesDinheiro"    AS vales_dinheiro
FROM "FechamentoPagamento" f
JOIN "Produtor" p ON p.id = f."produtorId"
JOIN "Vale" v ON v."fechamentoId" = f.id
WHERE f."valesDinheiro" > 0
GROUP BY f.id, p.nome
ORDER BY f."dataInicio";

COMMIT;
