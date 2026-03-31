-- =============================================================================
-- Profiles: align remote DB with the app (first/last name, consent, CV, etc.)
-- =============================================================================
-- If saving profile or settings fails with a generic error, run this once in:
--   Supabase Dashboard → SQL → New query → Run
--
-- Or from the repo (requires DATABASE_URL from Supabase → Settings → Database):
--   npm run db:migrate
--
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE.
-- =============================================================================

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists github_username text,
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists phone text,
  add column if not exists english_level text,
  add column if not exists target_roles text,
  add column if not exists linkedin_url text,
  add column if not exists portfolio_url text,
  add column if not exists cv_storage_path text,
  add column if not exists cv_original_name text;

alter table public.profiles
  add column if not exists consent_job_notifications boolean not null default true,
  add column if not exists consent_marketing_emails boolean not null default true;

alter table public.profiles
  add column if not exists updates_contact_preference text;

update public.profiles
set updates_contact_preference = 'both'
where updates_contact_preference is null
   or updates_contact_preference not in ('email', 'phone', 'both');

alter table public.profiles
  alter column updates_contact_preference set default 'both';

alter table public.profiles
  alter column updates_contact_preference set not null;

-- New signups: copy consent from auth metadata when present (OAuth / email signup).
create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  job_consent boolean;
  marketing_consent boolean;
  contact_pref text;
begin
  job_consent := coalesce((new.raw_user_meta_data->>'consent_job_notifications')::boolean, true);
  marketing_consent := coalesce((new.raw_user_meta_data->>'consent_marketing_emails')::boolean, true);
  contact_pref := coalesce(nullif(trim(new.raw_user_meta_data->>'updates_contact_preference'), ''), 'both');
  if contact_pref not in ('email', 'phone', 'both') then
    contact_pref := 'both';
  end if;

  insert into public.profiles (id, consent_job_notifications, consent_marketing_emails, updates_contact_preference)
  values (new.id, job_consent, marketing_consent, contact_pref)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- RLS: profile updates (WITH CHECK) — required on some Postgres versions for UPDATE
-- -----------------------------------------------------------------------------
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_update_own" on public.profiles
for update
using (auth.uid () = id)
with
  check (auth.uid () = id);
