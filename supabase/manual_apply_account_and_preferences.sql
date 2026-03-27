-- Idempotent patch: profile fields, CV columns + storage bucket, user_job_preferences.
-- Run in Supabase SQL Editor (paste all) OR: psql "$DATABASE_URL" -f supabase/manual_apply_account_and_preferences.sql
-- Requires: core tables from earlier migrations (profiles, jobs, job_applications, auth.users).

-- Needed for triggers on user_job_preferences.updated_at
create or replace function public.set_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Profile fields (account page)
alter table public.profiles
  add column if not exists phone text,
  add column if not exists english_level text,
  add column if not exists target_roles text,
  add column if not exists linkedin_url text,
  add column if not exists portfolio_url text,
  add column if not exists cv_storage_path text,
  add column if not exists cv_original_name text;

-- Jobs / applications + bucket (CV uploads)
alter table public.jobs
  add column if not exists skills text[] not null default '{}'::text[];

alter table public.job_applications
  add column if not exists cv_storage_path text;

alter table public.job_applications
  add column if not exists cv_original_name text;

insert into storage.buckets (id, name, public)
values ('application_cvs', 'application_cvs', false)
on conflict (id) do nothing;

-- Save / hide jobs (string job id: UUID from DB or demo id like demo-1)
create table if not exists public.user_job_preferences (
  user_id uuid not null references auth.users (id) on delete cascade,
  job_ref text not null,
  preference text not null check (preference in ('saved', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, job_ref)
);

create index if not exists user_job_preferences_user_id_idx on public.user_job_preferences (user_id);
create index if not exists user_job_preferences_preference_idx on public.user_job_preferences (preference);

alter table public.user_job_preferences enable row level security;

drop policy if exists "user_job_preferences_select_own" on public.user_job_preferences;
create policy "user_job_preferences_select_own" on public.user_job_preferences
for select using (auth.uid () = user_id);

drop policy if exists "user_job_preferences_insert_own" on public.user_job_preferences;
create policy "user_job_preferences_insert_own" on public.user_job_preferences
for insert with check (auth.uid () = user_id);

drop policy if exists "user_job_preferences_update_own" on public.user_job_preferences;
create policy "user_job_preferences_update_own" on public.user_job_preferences
for update using (auth.uid () = user_id);

drop policy if exists "user_job_preferences_delete_own" on public.user_job_preferences;
create policy "user_job_preferences_delete_own" on public.user_job_preferences
for delete using (auth.uid () = user_id);

drop trigger if exists user_job_preferences_set_updated_at on public.user_job_preferences;
create trigger user_job_preferences_set_updated_at
before update on public.user_job_preferences
for each row
execute procedure public.set_updated_at ();
