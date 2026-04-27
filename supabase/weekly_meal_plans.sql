-- Weekly meal plan persistence for Smart Mom App
-- Run this file in Supabase SQL Editor once.

create table if not exists public.weekly_meal_plans (
  family_id uuid primary key references public.families(id) on delete cascade,
  entries_json jsonb not null default '[]'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.weekly_meal_plans enable row level security;

drop policy if exists "weekly_meal_plans_select_members" on public.weekly_meal_plans;
create policy "weekly_meal_plans_select_members" on public.weekly_meal_plans
for select using (public.is_family_member(family_id));

drop policy if exists "weekly_meal_plans_insert_members" on public.weekly_meal_plans;
create policy "weekly_meal_plans_insert_members" on public.weekly_meal_plans
for insert with check (public.is_family_member(family_id) and updated_by = auth.uid());

drop policy if exists "weekly_meal_plans_update_members" on public.weekly_meal_plans;
create policy "weekly_meal_plans_update_members" on public.weekly_meal_plans
for update using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));

drop policy if exists "weekly_meal_plans_delete_members" on public.weekly_meal_plans;
create policy "weekly_meal_plans_delete_members" on public.weekly_meal_plans
for delete using (public.is_family_member(family_id));
