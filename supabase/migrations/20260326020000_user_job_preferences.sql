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
