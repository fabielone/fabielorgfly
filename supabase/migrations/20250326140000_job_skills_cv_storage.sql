-- Skills on job postings; CV metadata on applications; private bucket for uploads.

alter table public.jobs
  add column if not exists skills text[] not null default '{}'::text[];

alter table public.job_applications
  add column if not exists cv_storage_path text;

alter table public.job_applications
  add column if not exists cv_original_name text;

insert into storage.buckets (id, name, public)
values ('application_cvs', 'application_cvs', false)
on conflict (id) do nothing;
