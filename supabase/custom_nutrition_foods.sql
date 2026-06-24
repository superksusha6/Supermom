create table if not exists public.custom_nutrition_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  brand text,
  barcode text,
  base_mode text not null default '100g' check (base_mode in ('100g', '100ml', 'serving')),
  base_quantity numeric(8,2) not null default 100,
  calories numeric(8,2) not null default 0,
  protein numeric(8,2) not null default 0,
  fat numeric(8,2) not null default 0,
  carbs numeric(8,2) not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Migration for existing installs: add the barcode column if missing.
alter table public.custom_nutrition_foods add column if not exists barcode text;
create index if not exists custom_nutrition_foods_barcode_idx
  on public.custom_nutrition_foods (user_id, barcode);

alter table public.custom_nutrition_foods enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.custom_nutrition_foods to authenticated;

drop policy if exists "custom_nutrition_foods_select_own" on public.custom_nutrition_foods;
create policy "custom_nutrition_foods_select_own" on public.custom_nutrition_foods
for select using (user_id = auth.uid());

drop policy if exists "custom_nutrition_foods_manage_own" on public.custom_nutrition_foods;
create policy "custom_nutrition_foods_manage_own" on public.custom_nutrition_foods
for all using (user_id = auth.uid()) with check (user_id = auth.uid());
