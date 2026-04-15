-- Remove invite redemption from the profile creation trigger.
-- The invite should be redeemed by application code (callback route)
-- which can use the admin API to sync JWT claims reliably.
-- The DB trigger can't reliably update raw_app_meta_data during the
-- auth.users INSERT transaction because Supabase overwrites it.

-- Drop the trigger that redeems invites on profile creation
drop trigger if exists on_profile_created_redeem_invite on public.profiles;

-- Keep the function for reference but it's no longer called by a trigger
