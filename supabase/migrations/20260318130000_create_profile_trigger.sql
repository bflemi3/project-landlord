-- =============================================================================
-- AUTO-CREATE PROFILE ON AUTH SIGN-UP
-- =============================================================================
-- Trigger function that creates a profiles row when a new auth.users row is
-- inserted. Handles both Google OAuth (raw_user_meta_data keys: full_name/name,
-- email, avatar_url/picture, phone, locale) and email/password sign-up
-- (full_name passed via sign-up metadata).
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  meta jsonb := new.raw_user_meta_data;
  _full_name text;
  _email text;
  _avatar_url text;
  _phone text;
  _locale text;
begin
  -- Full name: try full_name first (email sign-up metadata), then name (Google)
  _full_name := coalesce(
    nullif(trim(meta->>'full_name'), ''),
    nullif(trim(meta->>'name'), ''),
    ''
  );

  -- Email: prefer metadata, fall back to auth.users.email
  _email := coalesce(
    nullif(trim(meta->>'email'), ''),
    new.email
  );

  -- Avatar: try avatar_url first, then picture (Google)
  _avatar_url := coalesce(
    nullif(trim(meta->>'avatar_url'), ''),
    nullif(trim(meta->>'picture'), '')
  );

  -- Phone
  _phone := nullif(trim(meta->>'phone'), '');

  -- Locale: map to supported values, default to pt-BR
  _locale := case lower(coalesce(meta->>'locale', ''))
    when 'en' then 'en'
    when 'en-us' then 'en'
    when 'en-gb' then 'en'
    when 'es' then 'es'
    when 'es-ar' then 'es'
    when 'es-mx' then 'es'
    when 'pt' then 'pt-BR'
    when 'pt-br' then 'pt-BR'
    else 'pt-BR'
  end;

  insert into public.profiles (id, full_name, email, phone, avatar_url, preferred_locale)
  values (new.id, _full_name, _email, _phone, _avatar_url, _locale);

  return new;
end;
$$;

-- Trigger on auth.users insert
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- AVATARS STORAGE BUCKET
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB
  array['image/jpeg', 'image/png', 'image/webp']
);

-- Users can upload their own avatar
create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own avatar
create policy "Users can update their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own avatar
create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Avatars are publicly readable (bucket is public)
create policy "Avatars are publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');
