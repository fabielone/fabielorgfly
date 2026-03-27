-- Optional pay band + remote logistics per listing (board is remote-first).

alter table public.jobs
  add column if not exists compensation text;

alter table public.jobs
  add column if not exists remote_detail text;
