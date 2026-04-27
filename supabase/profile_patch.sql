-- Personal profile columns for Smart Mom App
-- Run this file in Supabase SQL Editor if Settings cannot save profile data.

alter table public.profiles add column if not exists nickname text;
alter table public.profiles add column if not exists date_of_birth date;
alter table public.profiles add column if not exists height_cm int;
alter table public.profiles add column if not exists weight_kg numeric(5,2);
alter table public.profiles add column if not exists cycle_tracking_enabled boolean not null default false;
alter table public.profiles add column if not exists cycle_last_period_start date;
alter table public.profiles add column if not exists cycle_length_days int;
alter table public.profiles add column if not exists cycle_period_length_days int;
alter table public.profiles add column if not exists cycle_entries_json jsonb not null default '[]'::jsonb;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select using (id = auth.uid());

drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own" on public.profiles
for all using (id = auth.uid()) with check (id = auth.uid());
