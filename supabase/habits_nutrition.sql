-- Dedicated tables for habits and nutrition entries.
-- Run this file in Supabase SQL Editor if habits or food logs do not persist.

create table if not exists public.habit_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  icon text not null,
  color text not null,
  target_text text not null,
  enabled boolean not null default true,
  built_in boolean not null default false,
  mark_style text not null default 'circle',
  reminder_mode text not null default 'off',
  reminder_time text,
  completed_today boolean not null default false,
  streak int not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.nutrition_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  meal_type text not null,
  entry_date date not null,
  calories numeric(8,2) not null default 0,
  protein numeric(8,2) not null default 0,
  fat numeric(8,2) not null default 0,
  carbs numeric(8,2) not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.habit_entries enable row level security;
alter table public.nutrition_entries enable row level security;

drop policy if exists "habit_entries_select_own" on public.habit_entries;
create policy "habit_entries_select_own" on public.habit_entries
for select using (user_id = auth.uid());

drop policy if exists "habit_entries_manage_own" on public.habit_entries;
create policy "habit_entries_manage_own" on public.habit_entries
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "nutrition_entries_select_own" on public.nutrition_entries;
create policy "nutrition_entries_select_own" on public.nutrition_entries
for select using (user_id = auth.uid());

drop policy if exists "nutrition_entries_manage_own" on public.nutrition_entries;
create policy "nutrition_entries_manage_own" on public.nutrition_entries
for all using (user_id = auth.uid()) with check (user_id = auth.uid());
