-- Fabielorg: jobs, guest applications, subscription state (Mercado Pago webhook fills this).
-- Idempotent: safe to re-run if objects already exist.

create extension if not exists "pgcrypto";

do $$
begin
  create type public.subscription_status as enum (
    'none',
    'active',
    'past_due',
    'canceled'
  );
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  github_username text,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  mercado_pago_subscription_id text unique,
  locked_monthly_mxn numeric(10, 2) not null,
  status public.subscription_status not null default 'none',
  grace_period_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now ()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_status_idx on public.subscriptions (status);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid (),
  title text not null,
  company text not null,
  role_type text,
  referral_url text not null,
  compensation text,
  remote_detail text,
  skills text[] not null default '{}'::text[],
  is_published boolean not null default true,
  created_at timestamptz not null default now ()
);

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid (),
  job_id uuid not null references public.jobs (id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  message text,
  cv_storage_path text,
  cv_original_name text,
  created_at timestamptz not null default now ()
);

create index if not exists job_applications_job_id_idx on public.job_applications (job_id);

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.jobs enable row level security;
alter table public.job_applications enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid () = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert
with
  check (auth.uid () = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid () = id);

create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user ();

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions for select using (auth.uid () = user_id);

drop policy if exists "jobs_select_published" on public.jobs;
create policy "jobs_select_published" on public.jobs for select using (is_published = true);

drop policy if exists "job_applications_insert_anon" on public.job_applications;
create policy "job_applications_insert_anon" on public.job_applications for insert to anon, authenticated
with
  check (true);

-- Service role bypasses RLS for webhook + subscribe page counts.

create or replace function public.set_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row
execute procedure public.set_updated_at ();
