alter table public.profiles
  add column if not exists phone text,
  add column if not exists english_level text,
  add column if not exists target_roles text,
  add column if not exists linkedin_url text,
  add column if not exists portfolio_url text,
  add column if not exists cv_storage_path text,
  add column if not exists cv_original_name text;
