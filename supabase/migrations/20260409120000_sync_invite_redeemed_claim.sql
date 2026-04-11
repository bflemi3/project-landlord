-- Sync has_redeemed_invite to JWT custom claims via raw_app_meta_data.
-- This allows middleware to check invite status without a DB query.

-- Function: sync the claim whenever has_redeemed_invite changes
CREATE OR REPLACE FUNCTION public.sync_invite_redeemed_claim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('has_redeemed_invite', NEW.has_redeemed_invite)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Trigger: fire on INSERT or UPDATE of has_redeemed_invite
DROP TRIGGER IF EXISTS on_profile_invite_redeemed ON public.profiles;
CREATE TRIGGER on_profile_invite_redeemed
  AFTER INSERT OR UPDATE OF has_redeemed_invite ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_invite_redeemed_claim();

-- Backfill: sync existing profiles so current users get the claim on next token refresh
UPDATE public.profiles SET has_redeemed_invite = has_redeemed_invite WHERE true;
