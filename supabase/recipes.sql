-- Recipes persistence for Smart Mom App
-- Run this file in Supabase SQL Editor once.

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  description text not null default 'Custom recipe',
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'main_dish', 'soups', 'desserts', 'baking')),
  cuisine text,
  cook_time_minutes int not null default 0,
  servings int not null default 1,
  tags_json jsonb not null default '[]'::jsonb,
  classifiers_json jsonb not null default '[]'::jsonb,
  nutrition_per_serving_json jsonb not null default '{"calories":0,"protein":0,"fat":0,"carbs":0}'::jsonb,
  ingredients_json jsonb not null default '[]'::jsonb,
  steps_json jsonb not null default '[]'::jsonb,
  suitable_for_children boolean not null default false,
  suitable_for_family boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.recipes add column if not exists photo_url text;

alter table public.recipes enable row level security;

drop policy if exists "recipes_select_members" on public.recipes;
create policy "recipes_select_members" on public.recipes
for select using (public.is_family_member(family_id));

drop policy if exists "recipes_insert_members" on public.recipes;
create policy "recipes_insert_members" on public.recipes
for insert with check (public.is_family_member(family_id) and created_by = auth.uid());

drop policy if exists "recipes_update_members" on public.recipes;
create policy "recipes_update_members" on public.recipes
for update using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));

drop policy if exists "recipes_delete_members" on public.recipes;
create policy "recipes_delete_members" on public.recipes
for delete using (public.is_family_member(family_id));
