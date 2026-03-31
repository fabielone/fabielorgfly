-- Email / job-related communications consent (defaults true for new users).

alter table public.profiles
  add column if not exists consent_job_notifications boolean not null default true,
  add column if not exists consent_marketing_emails boolean not null default true;

create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  job_consent boolean;
  marketing_consent boolean;
begin
  job_consent := coalesce((new.raw_user_meta_data->>'consent_job_notifications')::boolean, true);
  marketing_consent := coalesce((new.raw_user_meta_data->>'consent_marketing_emails')::boolean, true);

  insert into public.profiles (id, consent_job_notifications, consent_marketing_emails)
  values (new.id, job_consent, marketing_consent)
  on conflict (id) do nothing;

  return new;
end;
$$;
