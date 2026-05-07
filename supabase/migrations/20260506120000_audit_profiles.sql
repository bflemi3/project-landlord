-- Attach the generic audit trigger to `profiles` so every change to identity
-- data (full_name, tax_id, avatar_url, preferred_locale, etc.) is recorded in
-- audit_events for the lifetime of the account. Reads are gated by RLS to
-- `actor_id = auth.uid()`, so users only ever see their own audit trail.

create trigger audit_profiles
  after insert or update or delete on profiles
  for each row execute function audit_log_trigger();
