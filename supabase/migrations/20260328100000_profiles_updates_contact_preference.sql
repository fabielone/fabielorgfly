-- How the user prefers to hear about application status (email, phone, or both).

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
