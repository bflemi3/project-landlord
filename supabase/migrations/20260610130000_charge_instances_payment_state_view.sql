-- =============================================================================
-- PRO-73: charge_instances_with_payment_state — instances + computed payment
-- state, for ledger row selection.
--
-- "Unpaid" (outstanding > 0) is a cross-table aggregate (amount_minor minus the
-- sum of charge_payments) that PostgREST cannot filter on directly; this view
-- exposes it so fetchers can select overdue carry-ins from prior months without
-- pulling a property's full bill history. Aggregation MEANING (due/overdue/
-- viewer shares) stays in TypeScript (src/data/charges/shared.ts) — the view is
-- row selection only.
--
-- Additive (new view, no table changes). security_invoker: RLS of the base
-- tables applies to the caller, so visibility is identical to charge_instances.
-- =============================================================================

create view charge_instances_with_payment_state
with (security_invoker = true) as
select
  ci.*,
  coalesce(pay.paid_minor, 0) as paid_minor,
  greatest(ci.amount_minor - coalesce(pay.paid_minor, 0), 0) as outstanding_minor
from charge_instances ci
left join lateral (
  select sum(cp.amount_minor)::integer as paid_minor
  from charge_payments cp
  where cp.charge_instance_id = ci.id
) pay on true;

comment on view charge_instances_with_payment_state is
  'charge_instances plus computed paid_minor / outstanding_minor (sum of charge_payments, floored at 0). Read-only row selection for the bills ledger; RLS via security_invoker.';
