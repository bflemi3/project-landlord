-- =============================================================================
-- Property creation persistence: audit triggers for new tables.
-- Spec: docs/superpowers/specs/2026-05-08-property-creation-persistence-design.md
--   §Migration ordering, step 8. Mirrors the audit_charge_definitions naming
--   pattern from 20260331120000_audit_triggers_and_allocation_delete.sql.
-- =============================================================================

create trigger audit_contracts
  after insert or update or delete on contracts
  for each row execute function audit_log_trigger();

create trigger audit_rent
  after insert or update or delete on rent
  for each row execute function audit_log_trigger();

create trigger audit_provider_requests
  after insert or update or delete on provider_requests
  for each row execute function audit_log_trigger();
