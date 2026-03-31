-- =============================================================================
-- Fix percentage constraints and comments.
-- Code uses whole percentages (0–100), not basis points (0–10000).
-- =============================================================================

-- responsibility_allocations
alter table responsibility_allocations
  drop constraint valid_percentage,
  add constraint valid_percentage check (percentage is null or (percentage >= 0 and percentage <= 100));

comment on column responsibility_allocations.percentage is 'Whole percentage (0-100). Used when allocation_type = percentage.';

-- tenant_splits
alter table tenant_splits
  drop constraint valid_split_pct,
  add constraint valid_split_pct check (percentage >= 0 and percentage <= 100);

comment on column tenant_splits.percentage is 'Whole percentage (0-100). 100 = 100%.';
