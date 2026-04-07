-- Backfill null split percentages on charge_instances.
--
-- Bug: buildSplitFields stored null instead of the complement percentage
-- when only one party had an allocation row. This caused recalculateStatementTotal
-- to default null tenant_percentage to 100, double-counting charges where
-- the landlord pays 100%.
--
-- This migration:
-- 1. Fills in null tenant_percentage as complement of landlord_percentage
-- 2. Fills in null landlord_percentage as complement of tenant_percentage
-- 3. Recalculates statement totals that were affected

-- Step 1: Backfill tenant_percentage where only landlord_percentage exists
UPDATE charge_instances
SET tenant_percentage = 100 - landlord_percentage
WHERE split_type = 'percentage'
  AND tenant_percentage IS NULL
  AND landlord_percentage IS NOT NULL;

-- Step 2: Backfill landlord_percentage where only tenant_percentage exists
UPDATE charge_instances
SET landlord_percentage = 100 - tenant_percentage
WHERE split_type = 'percentage'
  AND landlord_percentage IS NULL
  AND tenant_percentage IS NOT NULL;

-- Step 3: Recalculate statement totals from their charge instances
UPDATE statements s
SET
  tenant_total_minor = sub.tenant_total,
  landlord_total_minor = sub.landlord_total
FROM (
  SELECT
    ci.statement_id,
    SUM(
      CASE
        WHEN ci.split_type = 'fixed_amount' THEN COALESCE(ci.tenant_fixed_minor, 0)
        ELSE ROUND(ci.amount_minor * COALESCE(ci.tenant_percentage, 100) / 100.0)
      END
    )::int AS tenant_total,
    SUM(
      CASE
        WHEN ci.split_type = 'fixed_amount' THEN COALESCE(ci.landlord_fixed_minor, 0)
        ELSE ROUND(ci.amount_minor * COALESCE(ci.landlord_percentage, 0) / 100.0)
      END
    )::int AS landlord_total
  FROM charge_instances ci
  GROUP BY ci.statement_id
) sub
WHERE s.id = sub.statement_id;
