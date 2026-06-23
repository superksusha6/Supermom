create table if not exists public.cycle_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  flow_level text,
  discharge_type text,
  feelings_json jsonb not null default '[]'::jsonb,
  pains_json jsonb not null default '[]'::jsonb,
  sleep_quality text,
  sleep_hours int,
  sleep_minutes int,
  is_period_start boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

alter table public.cycle_entries enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.cycle_entries to authenticated;

drop policy if exists "cycle_entries_select_own" on public.cycle_entries;
create policy "cycle_entries_select_own" on public.cycle_entries
for select using (user_id = auth.uid());

drop policy if exists "cycle_entries_manage_own" on public.cycle_entries;
create policy "cycle_entries_manage_own" on public.cycle_entries
for all using (user_id = auth.uid()) with check (user_id = auth.uid());
