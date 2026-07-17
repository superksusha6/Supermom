-- Staff roles & feature grants — Step 1 (schema + RLS).
-- Adds per-staff role/feature grants and feature-gates the family-scoped tables so a
-- staff member (nanny/cook/driver/…) can only reach the functions the mother granted.
-- Personal tables (cycle_entries, nutrition_entries, habit_entries, user_preferences,
-- profiles) are already owner-only (user_id = auth.uid()) — staff never see them.

-- 1. Grant columns ----------------------------------------------------------------
alter table public.family_invites
  add column if not exists roles jsonb not null default '[]'::jsonb;
alter table public.family_invites
  add column if not exists features jsonb not null default '[]'::jsonb;
alter table public.family_invites
  add column if not exists staff_profile_id text references public.staff_profiles(id) on delete set null;

alter table public.family_members
  add column if not exists roles jsonb not null default '[]'::jsonb;
alter table public.family_members
  add column if not exists features jsonb not null default '[]'::jsonb;

-- 2. Helper: family member AND (not staff, OR staff who was granted this feature) ---
create or replace function public.can_staff_access(target_family_id uuid, feature text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_family_member(target_family_id) and (
    public.current_user_role(target_family_id)::text <> 'staff'
    or coalesce(
      (select fm.features
       from public.family_members fm
       where fm.family_id = target_family_id and fm.user_id = auth.uid()),
      '[]'::jsonb) ? feature
  );
$$;

-- 3. Feature-gate the family-scoped tables ----------------------------------------

-- SHOPPING (shopping_lists / items / shopping_items / purchase_requests / fridge_items)
drop policy if exists "shopping_lists_select_members" on public.shopping_lists;
create policy "shopping_lists_select_members" on public.shopping_lists
for select using (public.can_staff_access(family_id, 'shopping'));

drop policy if exists "shopping_lists_manage_members" on public.shopping_lists;
create policy "shopping_lists_manage_members" on public.shopping_lists
for all using (public.can_staff_access(family_id, 'shopping'))
with check (public.can_staff_access(family_id, 'shopping'));

drop policy if exists "shopping_list_items_select_members" on public.shopping_list_items;
create policy "shopping_list_items_select_members" on public.shopping_list_items
for select using (
  exists (select 1 from public.shopping_lists sl
          where sl.id = shopping_list_items.list_id and public.can_staff_access(sl.family_id, 'shopping'))
);

drop policy if exists "shopping_list_items_manage_members" on public.shopping_list_items;
create policy "shopping_list_items_manage_members" on public.shopping_list_items
for all using (
  exists (select 1 from public.shopping_lists sl
          where sl.id = shopping_list_items.list_id and public.can_staff_access(sl.family_id, 'shopping'))
)
with check (
  exists (select 1 from public.shopping_lists sl
          where sl.id = shopping_list_items.list_id and public.can_staff_access(sl.family_id, 'shopping'))
);

drop policy if exists "shopping_items_select_members" on public.shopping_items;
create policy "shopping_items_select_members" on public.shopping_items
for select using (public.can_staff_access(family_id, 'shopping'));

drop policy if exists "shopping_items_insert_mother_or_staff" on public.shopping_items;
create policy "shopping_items_insert_mother_or_staff" on public.shopping_items
for insert with check (public.can_staff_access(family_id, 'shopping') and created_by = auth.uid());

drop policy if exists "shopping_items_update_mother_or_staff" on public.shopping_items;
create policy "shopping_items_update_mother_or_staff" on public.shopping_items
for update using (public.can_staff_access(family_id, 'shopping'))
with check (public.can_staff_access(family_id, 'shopping'));

drop policy if exists "purchase_requests_select_members" on public.purchase_requests;
create policy "purchase_requests_select_members" on public.purchase_requests
for select using (public.can_staff_access(family_id, 'shopping'));

drop policy if exists "purchase_requests_manage_members" on public.purchase_requests;
create policy "purchase_requests_manage_members" on public.purchase_requests
for all using (public.can_staff_access(family_id, 'shopping'))
with check (public.can_staff_access(family_id, 'shopping'));

drop policy if exists "fridge_items_select_members" on public.fridge_items;
create policy "fridge_items_select_members" on public.fridge_items
for select using (public.can_staff_access(family_id, 'shopping'));

drop policy if exists "fridge_items_manage_members" on public.fridge_items;
create policy "fridge_items_manage_members" on public.fridge_items
for all using (public.can_staff_access(family_id, 'shopping'))
with check (public.can_staff_access(family_id, 'shopping'));

-- MENU
drop policy if exists "weekly_meal_plans_select_members" on public.weekly_meal_plans;
create policy "weekly_meal_plans_select_members" on public.weekly_meal_plans
for select using (public.can_staff_access(family_id, 'menu'));

drop policy if exists "weekly_meal_plans_manage_members" on public.weekly_meal_plans;
create policy "weekly_meal_plans_manage_members" on public.weekly_meal_plans
for all using (public.can_staff_access(family_id, 'menu'))
with check (public.can_staff_access(family_id, 'menu'));

-- RECIPES
drop policy if exists "recipes_select_members" on public.recipes;
create policy "recipes_select_members" on public.recipes
for select using (public.can_staff_access(family_id, 'recipes'));

drop policy if exists "recipes_manage_members" on public.recipes;
create policy "recipes_manage_members" on public.recipes
for all using (public.can_staff_access(family_id, 'recipes'))
with check (public.can_staff_access(family_id, 'recipes'));

-- FIX IT (home_issues)
drop policy if exists "home_issues_select_members" on public.home_issues;
create policy "home_issues_select_members" on public.home_issues
for select using (public.can_staff_access(family_id, 'fixit'));

drop policy if exists "home_issues_manage_members" on public.home_issues;
create policy "home_issues_manage_members" on public.home_issues
for all using (public.can_staff_access(family_id, 'fixit'))
with check (public.can_staff_access(family_id, 'fixit'));

-- SCHEDULE (events / calendar) — gate SELECT; existing insert/update/delete keep
-- (mother-or-owner) so staff can only touch their own rows.
drop policy if exists "events_select_members" on public.events;
create policy "events_select_members" on public.events
for select using (public.can_staff_access(family_id, 'schedule'));

-- TASKS — gate SELECT; existing manage stays mother/assignee-only.
drop policy if exists "tasks_select_members" on public.tasks;
create policy "tasks_select_members" on public.tasks
for select using (public.can_staff_access(family_id, 'tasks'));

-- CHILDREN — nannies/drivers who have schedule or tasks may read child names/plans.
drop policy if exists "child_profiles_select_members" on public.child_profiles;
create policy "child_profiles_select_members" on public.child_profiles
for select using (
  public.can_staff_access(family_id, 'schedule') or public.can_staff_access(family_id, 'tasks')
);

drop policy if exists "child_activities_select_members" on public.child_activities;
create policy "child_activities_select_members" on public.child_activities
for select using (
  exists (
    select 1 from public.child_profiles cp
    where cp.id = child_activities.child_profile_id
      and (public.can_staff_access(cp.family_id, 'schedule') or public.can_staff_access(cp.family_id, 'tasks'))
  )
);
