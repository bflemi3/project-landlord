-- =============================================================================
-- join_waitlist now reports whether the signup was newly inserted.
--
-- The Resend `contacts.get({ email })` dedup was unreliable (it needs an
-- audienceId), so repeat signups re-sent the welcome email. The waitlist table
-- is already the idempotency source of truth (unique email, on-conflict-do-
-- nothing), so the RPC returns that signal and the caller emails only on a
-- genuinely new signup.
--
-- Changing the return type (void -> boolean) requires drop + recreate; this
-- function was added earlier today (20260527120000) and is not yet in prod, so
-- the two migrations simply run in order.
-- =============================================================================

drop function if exists public.join_waitlist(text, text, text);

create function public.join_waitlist(
  p_email  text,
  p_role   text default 'landlord',
  p_locale text default 'en'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted boolean;
begin
  insert into public.waitlist (email, role, locale)
  values (
    lower(trim(p_email)),
    case when p_role in ('landlord', 'tenant') then p_role else 'landlord' end,
    p_locale
  )
  on conflict (email) do nothing;
  -- FOUND is true when the insert added a row, false on conflict (already listed).
  v_inserted := FOUND;
  return v_inserted;
end;
$$;

grant execute on function public.join_waitlist(text, text, text) to anon, authenticated;
