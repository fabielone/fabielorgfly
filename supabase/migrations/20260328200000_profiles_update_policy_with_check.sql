-- Ensure profile self-updates work under RLS (explicit WITH CHECK for UPDATE).

drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_update_own" on public.profiles
for update
using (auth.uid () = id)
with
  check (auth.uid () = id);
