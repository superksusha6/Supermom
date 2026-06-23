create table if not exists public.fridge_items (
  id text primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  item_name text not null,
  quantity text not null,
  amount numeric(10,2),
  unit text,
  category text,
  note text,
  expires_at date,
  opened boolean not null default false,
  status text not null default 'full' check (status in ('full', 'low', 'out')),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.fridge_items add column if not exists amount numeric(10,2);
alter table public.fridge_items add column if not exists unit text;
alter table public.fridge_items add column if not exists expires_at date;
alter table public.fridge_items add column if not exists opened boolean not null default false;

alter table public.fridge_items enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.fridge_items to authenticated;

drop policy if exists "fridge_items_select_members" on public.fridge_items;
create policy "fridge_items_select_members" on public.fridge_items
for select using (public.is_family_member(family_id));

drop policy if exists "fridge_items_manage_members" on public.fridge_items;
create policy "fridge_items_manage_members" on public.fridge_items
for all using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));
