-- Home medicine cabinet (optional module) for Smart Mom App.
-- Run this file once in the Supabase SQL Editor.

create table if not exists public.medicines (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  category text not null default 'other',
  expiry text,            -- 'YYYY-MM' month precision
  quantity text,
  location text,
  for_whom text,
  note text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.medicines enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.medicines to authenticated;

drop policy if exists "medicines_select_members" on public.medicines;
create policy "medicines_select_members" on public.medicines
for select using (public.is_family_member(family_id));

drop policy if exists "medicines_insert_members" on public.medicines;
create policy "medicines_insert_members" on public.medicines
for insert with check (public.is_family_member(family_id) and created_by = auth.uid());

drop policy if exists "medicines_update_members" on public.medicines;
create policy "medicines_update_members" on public.medicines
for update using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));

drop policy if exists "medicines_delete_members" on public.medicines;
create policy "medicines_delete_members" on public.medicines
for delete using (public.is_family_member(family_id));
