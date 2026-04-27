-- Smart Assistant for Moms MVP schema (v1.3)
-- Run in Supabase SQL Editor

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum ('mother', 'child', 'staff', 'admin');
  end if;
  if exists (select 1 from pg_type where typname = 'app_role')
    and not exists (
      select 1
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'app_role' and e.enumlabel = 'admin'
    ) then
    alter type app_role add value 'admin';
  end if;
  if not exists (select 1 from pg_type where typname = 'task_priority') then
    create type task_priority as enum ('urgent', 'non_urgent');
  end if;
  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type task_status as enum ('new', 'in_progress', 'done');
  end if;
  if not exists (select 1 from pg_type where typname = 'approval_action') then
    create type approval_action as enum ('delete', 'critical_edit');
  end if;
  if not exists (select 1 from pg_type where typname = 'approval_status') then
    create type approval_status as enum ('pending', 'approved', 'declined');
  end if;
end
$$;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

alter table profiles add column if not exists nickname text;
alter table profiles add column if not exists date_of_birth date;
alter table profiles add column if not exists height_cm int;
alter table profiles add column if not exists weight_kg numeric(5,2);
alter table profiles add column if not exists cycle_tracking_enabled boolean not null default false;
alter table profiles add column if not exists cycle_last_period_start date;
alter table profiles add column if not exists cycle_length_days int;
alter table profiles add column if not exists cycle_period_length_days int;
alter table profiles add column if not exists cycle_entries_json jsonb not null default '[]'::jsonb;

create table if not exists families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  staff_enabled boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  child_profile_id uuid,
  created_at timestamptz not null default now(),
  unique (family_id, user_id)
);

create table if not exists child_profiles (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  date_of_birth date,
  age int,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table family_members
  drop constraint if exists family_members_child_profile_fk;

alter table family_members
  add constraint family_members_child_profile_fk
  foreign key (child_profile_id) references child_profiles(id) on delete set null;

create table if not exists child_activities (
  id uuid primary key default gen_random_uuid(),
  child_profile_id uuid not null references child_profiles(id) on delete cascade,
  activity_name text not null,
  times_per_week int not null check (times_per_week > 0 and times_per_week <= 14),
  created_at timestamptz not null default now()
);

alter table child_activities add column if not exists time text;
alter table child_activities add column if not exists color text;
alter table child_activities add column if not exists week_days jsonb not null default '[]'::jsonb;
alter table child_activities add column if not exists time_slots jsonb not null default '[]'::jsonb;

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  title text not null,
  notes text,
  starts_at timestamptz not null,
  owner_user_id uuid references auth.users(id) on delete set null,
  owner_child_profile_id uuid references child_profiles(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table events add column if not exists source_kind text;
alter table events add column if not exists source_profile_id text;

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  title text not null,
  description text,
  assignee_role app_role not null default 'mother',
  assignee_user_id uuid references auth.users(id) on delete set null,
  assignee_child_profile_id uuid references child_profiles(id) on delete set null,
  priority task_priority not null default 'non_urgent',
  status task_status not null default 'new',
  deadline_at timestamptz,
  requires_parent_approval boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table tasks add column if not exists source_kind text;
alter table tasks add column if not exists source_profile_id text;

create table if not exists approval_requests (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  requested_by_user_id uuid not null references auth.users(id) on delete cascade,
  action approval_action not null,
  status approval_status not null default 'pending',
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists shopping_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  item_name text not null,
  quantity text not null,
  comment text,
  purchased boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists staff_profiles (
  id text primary key,
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  tasks_json jsonb not null default '[]'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table staff_profiles add column if not exists date_of_birth date;

create table if not exists shopping_lists (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  title text not null default 'Shopping List',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references shopping_lists(id) on delete cascade,
  item_name text not null,
  quantity text not null,
  comment text,
  purchased boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists shopping_shares (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  list_id uuid references shopping_lists(id) on delete set null,
  title text not null,
  sender_label text not null,
  recipient_key text not null,
  recipient_label text not null,
  items_json jsonb not null default '[]'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists purchase_requests (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  item_name text not null,
  quantity text not null,
  comment text,
  requested_by text not null,
  status text not null default 'new' check (status in ('new', 'added', 'dismissed')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists completed_task_notifications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  task_id uuid,
  task_title text not null,
  staff_name text not null,
  completed_at timestamptz not null,
  read boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists staff_reminder_notifications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  task_id uuid not null,
  task_title text not null,
  staff_name text not null,
  sent_at timestamptz not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (family_id, task_id)
);

create table if not exists user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  family_id uuid not null references families(id) on delete cascade,
  parent_label text not null default 'Mom' check (parent_label in ('Mom', 'Dad')),
  theme_name text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists imported_email_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  source_label text not null,
  sender_email text,
  email_subject text,
  title text not null,
  event_date date not null,
  event_time text,
  location text,
  notes text,
  confidence numeric(4,3),
  status text not null default 'pending' check (status in ('pending', 'added', 'ignored')),
  raw_payload jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
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

alter table recipes add column if not exists photo_url text;

create table if not exists weekly_meal_plans (
  family_id uuid primary key references families(id) on delete cascade,
  entries_json jsonb not null default '[]'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists habit_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid not null references families(id) on delete cascade,
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

create table if not exists nutrition_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid not null references families(id) on delete cascade,
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

-- Helpers
create or replace function is_family_member(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from family_members fm
    where fm.family_id = target_family_id and fm.user_id = auth.uid()
  );
$$;

create or replace function current_user_role(target_family_id uuid)
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select fm.role
  from family_members fm
  where fm.family_id = target_family_id and fm.user_id = auth.uid();
$$;

create or replace function is_mother(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select current_user_role(target_family_id)::text = 'mother';
$$;

create or replace function can_manage_family(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select current_user_role(target_family_id)::text in ('mother', 'admin');
$$;

-- RLS
alter table profiles enable row level security;
alter table families enable row level security;
alter table family_members enable row level security;
alter table child_profiles enable row level security;
alter table child_activities enable row level security;
alter table events enable row level security;
alter table tasks enable row level security;
alter table approval_requests enable row level security;
alter table shopping_items enable row level security;
alter table push_tokens enable row level security;
alter table staff_profiles enable row level security;
alter table shopping_lists enable row level security;
alter table shopping_list_items enable row level security;
alter table shopping_shares enable row level security;
alter table purchase_requests enable row level security;
alter table completed_task_notifications enable row level security;
alter table staff_reminder_notifications enable row level security;
alter table user_preferences enable row level security;
alter table imported_email_events enable row level security;
alter table recipes enable row level security;
alter table weekly_meal_plans enable row level security;
alter table habit_entries enable row level security;
alter table nutrition_entries enable row level security;

-- profiles
drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles
for select using (id = auth.uid());

drop policy if exists "profiles_upsert_own" on profiles;
create policy "profiles_upsert_own" on profiles
for all using (id = auth.uid()) with check (id = auth.uid());

-- families
drop policy if exists "families_select_members" on families;
create policy "families_select_members" on families
for select using (is_family_member(id));

drop policy if exists "families_insert_owner" on families;
create policy "families_insert_owner" on families
for insert with check (created_by = auth.uid());

drop policy if exists "families_update_mother" on families;
create policy "families_update_mother" on families
for update using (can_manage_family(id)) with check (can_manage_family(id));

-- family_members
drop policy if exists "family_members_select_members" on family_members;
create policy "family_members_select_members" on family_members
for select using (is_family_member(family_id));

drop policy if exists "family_members_manage_mother" on family_members;
create policy "family_members_manage_mother" on family_members
for all using (can_manage_family(family_id)) with check (can_manage_family(family_id));

-- child_profiles
drop policy if exists "child_profiles_select_members" on child_profiles;
create policy "child_profiles_select_members" on child_profiles
for select using (is_family_member(family_id));

drop policy if exists "child_profiles_manage_mother" on child_profiles;
create policy "child_profiles_manage_mother" on child_profiles
for all using (can_manage_family(family_id)) with check (can_manage_family(family_id));

-- child_activities
drop policy if exists "child_activities_select_members" on child_activities;
create policy "child_activities_select_members" on child_activities
for select using (
  exists (
    select 1 from child_profiles cp
    where cp.id = child_activities.child_profile_id
      and is_family_member(cp.family_id)
  )
);

drop policy if exists "child_activities_manage_mother" on child_activities;
create policy "child_activities_manage_mother" on child_activities
for all using (
  exists (
    select 1 from child_profiles cp
    where cp.id = child_activities.child_profile_id
      and can_manage_family(cp.family_id)
  )
)
with check (
  exists (
    select 1 from child_profiles cp
    where cp.id = child_activities.child_profile_id
      and can_manage_family(cp.family_id)
  )
);

-- events
drop policy if exists "events_select_members" on events;
create policy "events_select_members" on events
for select using (is_family_member(family_id));

drop policy if exists "events_insert_members" on events;
create policy "events_insert_members" on events
for insert with check (is_family_member(family_id) and created_by = auth.uid());

drop policy if exists "events_update_mother_or_owner" on events;
create policy "events_update_mother_or_owner" on events
for update using (
  can_manage_family(family_id) or owner_user_id = auth.uid()
)
with check (
  can_manage_family(family_id) or owner_user_id = auth.uid()
);

drop policy if exists "events_delete_mother_only" on events;
create policy "events_delete_mother_only" on events
for delete using (can_manage_family(family_id));

-- tasks
drop policy if exists "tasks_select_members" on tasks;
create policy "tasks_select_members" on tasks
for select using (is_family_member(family_id));

drop policy if exists "tasks_insert_mother" on tasks;
create policy "tasks_insert_mother" on tasks
for insert with check (can_manage_family(family_id) and created_by = auth.uid());

drop policy if exists "tasks_update_mother_or_assignee" on tasks;
create policy "tasks_update_mother_or_assignee" on tasks
for update using (
  can_manage_family(family_id)
  or assignee_user_id = auth.uid()
)
with check (
  can_manage_family(family_id)
  or assignee_user_id = auth.uid()
);

drop policy if exists "tasks_delete_mother_only" on tasks;
create policy "tasks_delete_mother_only" on tasks
for delete using (can_manage_family(family_id));

-- approval_requests
drop policy if exists "approval_requests_select_members" on approval_requests;
create policy "approval_requests_select_members" on approval_requests
for select using (is_family_member(family_id));

drop policy if exists "approval_requests_insert_child_or_assignee" on approval_requests;
create policy "approval_requests_insert_child_or_assignee" on approval_requests
for insert with check (
  is_family_member(family_id)
  and requested_by_user_id = auth.uid()
);

drop policy if exists "approval_requests_update_mother" on approval_requests;
create policy "approval_requests_update_mother" on approval_requests
for update using (can_manage_family(family_id)) with check (can_manage_family(family_id));

-- shopping
drop policy if exists "shopping_items_select_members" on shopping_items;
create policy "shopping_items_select_members" on shopping_items
for select using (is_family_member(family_id));

drop policy if exists "shopping_items_insert_mother_or_staff" on shopping_items;
create policy "shopping_items_insert_mother_or_staff" on shopping_items
for insert with check (
  is_family_member(family_id)
  and created_by = auth.uid()
  and current_user_role(family_id)::text in ('mother', 'admin', 'staff')
);

drop policy if exists "shopping_items_update_mother_or_staff" on shopping_items;
create policy "shopping_items_update_mother_or_staff" on shopping_items
for update using (
  is_family_member(family_id)
  and current_user_role(family_id)::text in ('mother', 'admin', 'staff')
)
with check (
  is_family_member(family_id)
  and current_user_role(family_id)::text in ('mother', 'admin', 'staff')
);

drop policy if exists "shopping_items_delete_mother_only" on shopping_items;
create policy "shopping_items_delete_mother_only" on shopping_items
for delete using (can_manage_family(family_id));

-- staff_profiles
drop policy if exists "staff_profiles_select_members" on staff_profiles;
create policy "staff_profiles_select_members" on staff_profiles
for select using (is_family_member(family_id));

drop policy if exists "staff_profiles_manage_mother" on staff_profiles;
create policy "staff_profiles_manage_mother" on staff_profiles
for all using (can_manage_family(family_id)) with check (can_manage_family(family_id));

-- shopping_lists
drop policy if exists "shopping_lists_select_members" on shopping_lists;
create policy "shopping_lists_select_members" on shopping_lists
for select using (is_family_member(family_id));

drop policy if exists "shopping_lists_manage_members" on shopping_lists;
create policy "shopping_lists_manage_members" on shopping_lists
for all using (is_family_member(family_id)) with check (is_family_member(family_id));

-- shopping_list_items
drop policy if exists "shopping_list_items_select_members" on shopping_list_items;
create policy "shopping_list_items_select_members" on shopping_list_items
for select using (
  exists (
    select 1 from shopping_lists sl
    where sl.id = shopping_list_items.list_id
      and is_family_member(sl.family_id)
  )
);

drop policy if exists "shopping_list_items_manage_members" on shopping_list_items;
create policy "shopping_list_items_manage_members" on shopping_list_items
for all using (
  exists (
    select 1 from shopping_lists sl
    where sl.id = shopping_list_items.list_id
      and is_family_member(sl.family_id)
  )
)
with check (
  exists (
    select 1 from shopping_lists sl
    where sl.id = shopping_list_items.list_id
      and is_family_member(sl.family_id)
  )
);

-- shopping_shares
drop policy if exists "shopping_shares_select_members" on shopping_shares;
create policy "shopping_shares_select_members" on shopping_shares
for select using (is_family_member(family_id));

drop policy if exists "shopping_shares_manage_members" on shopping_shares;
create policy "shopping_shares_manage_members" on shopping_shares
for all using (is_family_member(family_id)) with check (is_family_member(family_id));

-- purchase_requests
drop policy if exists "purchase_requests_select_members" on purchase_requests;
create policy "purchase_requests_select_members" on purchase_requests
for select using (is_family_member(family_id));

drop policy if exists "purchase_requests_manage_members" on purchase_requests;
create policy "purchase_requests_manage_members" on purchase_requests
for all using (is_family_member(family_id)) with check (is_family_member(family_id));

-- completed_task_notifications
drop policy if exists "completed_task_notifications_select_members" on completed_task_notifications;
create policy "completed_task_notifications_select_members" on completed_task_notifications
for select using (is_family_member(family_id));

drop policy if exists "completed_task_notifications_manage_members" on completed_task_notifications;
create policy "completed_task_notifications_manage_members" on completed_task_notifications
for all using (is_family_member(family_id)) with check (is_family_member(family_id));

-- staff_reminder_notifications
drop policy if exists "staff_reminder_notifications_select_members" on staff_reminder_notifications;
create policy "staff_reminder_notifications_select_members" on staff_reminder_notifications
for select using (is_family_member(family_id));

drop policy if exists "staff_reminder_notifications_manage_members" on staff_reminder_notifications;
create policy "staff_reminder_notifications_manage_members" on staff_reminder_notifications
for all using (is_family_member(family_id)) with check (is_family_member(family_id));

-- user_preferences
drop policy if exists "user_preferences_select_own" on user_preferences;
create policy "user_preferences_select_own" on user_preferences
for select using (user_id = auth.uid());

drop policy if exists "user_preferences_upsert_own" on user_preferences;
create policy "user_preferences_upsert_own" on user_preferences
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- push tokens
drop policy if exists "push_tokens_select_own" on push_tokens;
create policy "push_tokens_select_own" on push_tokens
for select using (user_id = auth.uid());

drop policy if exists "push_tokens_upsert_own" on push_tokens;
create policy "push_tokens_upsert_own" on push_tokens
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- imported email events
drop policy if exists "imported_email_events_select_members" on imported_email_events;
create policy "imported_email_events_select_members" on imported_email_events
for select using (is_family_member(family_id));

drop policy if exists "imported_email_events_manage_members" on imported_email_events;
create policy "imported_email_events_manage_members" on imported_email_events
for all using (is_family_member(family_id)) with check (is_family_member(family_id));

-- recipes
drop policy if exists "recipes_select_members" on recipes;
create policy "recipes_select_members" on recipes
for select using (is_family_member(family_id));

drop policy if exists "recipes_manage_members" on recipes;
create policy "recipes_manage_members" on recipes
for all using (is_family_member(family_id)) with check (is_family_member(family_id) and created_by = auth.uid());

-- weekly meal plans
drop policy if exists "weekly_meal_plans_select_members" on weekly_meal_plans;
create policy "weekly_meal_plans_select_members" on weekly_meal_plans
for select using (is_family_member(family_id));

drop policy if exists "weekly_meal_plans_manage_members" on weekly_meal_plans;
create policy "weekly_meal_plans_manage_members" on weekly_meal_plans
for all using (is_family_member(family_id)) with check (is_family_member(family_id));

-- habit_entries
drop policy if exists "habit_entries_select_own" on habit_entries;
create policy "habit_entries_select_own" on habit_entries
for select using (user_id = auth.uid());

drop policy if exists "habit_entries_manage_own" on habit_entries;
create policy "habit_entries_manage_own" on habit_entries
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- nutrition_entries
drop policy if exists "nutrition_entries_select_own" on nutrition_entries;
create policy "nutrition_entries_select_own" on nutrition_entries
for select using (user_id = auth.uid());

drop policy if exists "nutrition_entries_manage_own" on nutrition_entries;
create policy "nutrition_entries_manage_own" on nutrition_entries
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Bootstrap helpers for app onboarding
alter table tasks add column if not exists assignee_role app_role not null default 'mother';

create or replace function ensure_user_family()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_family_id uuid;
  new_family_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select fm.family_id
    into existing_family_id
  from family_members fm
  where fm.user_id = auth.uid()
  limit 1;

  if existing_family_id is not null then
    return existing_family_id;
  end if;

  insert into profiles (id)
  values (auth.uid())
  on conflict (id) do nothing;

  insert into families (name, created_by)
  values ('My Family', auth.uid())
  returning id into new_family_id;

  insert into family_members (family_id, user_id, role)
  values (new_family_id, auth.uid(), 'mother');

  return new_family_id;
end;
$$;

grant execute on function ensure_user_family() to authenticated;

create or replace function seed_demo_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  family_id uuid;
  child_id uuid;
  has_tasks boolean;
  has_staff boolean;
begin
  family_id := ensure_user_family();

  if not can_manage_family(family_id) then
    raise exception 'Only admin or mother can seed demo data';
  end if;

  select cp.id
    into child_id
  from child_profiles cp
  where cp.family_id = family_id
  limit 1;

  if child_id is null then
    insert into child_profiles (family_id, name, age, created_by)
    values (family_id, 'Emma', 9, auth.uid())
    returning id into child_id;

    insert into child_activities (child_profile_id, activity_name, times_per_week)
    values
      (child_id, 'Piano', 2),
      (child_id, 'Swimming', 3);
  end if;

  select exists (
    select 1 from staff_profiles sp where sp.family_id = family_id
  ) into has_staff;

  if not has_staff then
    insert into staff_profiles (id, family_id, name, tasks_json, created_by)
    values
      (
        'staff_maria',
        family_id,
        'Jennet',
        jsonb_build_array(
          jsonb_build_object(
            'id', 'staff_task_maria_1',
            'title', 'Morning school prep',
            'time', '07:30',
            'priority', 'urgent',
            'weekDays', jsonb_build_array('mon', 'tue', 'wed', 'thu', 'fri')
          ),
          jsonb_build_object(
            'id', 'staff_task_maria_2',
            'title', 'Laundry and tidy up',
            'time', '15:00',
            'priority', 'non_urgent',
            'weekDays', jsonb_build_array('mon', 'wed', 'fri')
          )
        ),
        auth.uid()
      ),
      (
        'staff_sophia',
        family_id,
        'Yvonne',
        jsonb_build_array(
          jsonb_build_object(
            'id', 'staff_task_sophia_1',
            'title', 'After-school snack',
            'time', '16:00',
            'priority', 'non_urgent',
            'weekDays', jsonb_build_array('mon', 'tue', 'wed', 'thu', 'fri')
          ),
          jsonb_build_object(
            'id', 'staff_task_sophia_2',
            'title', 'Bath and bedtime routine',
            'time', '19:00',
            'priority', 'urgent',
            'weekDays', jsonb_build_array('sun', 'mon', 'tue', 'wed', 'thu')
          )
        ),
        auth.uid()
      );
  end if;

  select exists (
    select 1 from tasks t where t.family_id = family_id
  ) into has_tasks;

  if not has_tasks then
    insert into tasks (family_id, title, assignee_role, priority, status, deadline_at, created_by)
    values
      (family_id, 'Deep clean kitchen', 'staff', 'urgent', 'new', now() + interval '1 day', auth.uid()),
      (family_id, 'Math homework', 'child', 'non_urgent', 'in_progress', now() + interval '1 day', auth.uid()),
      (family_id, 'Plan weekly menu', 'mother', 'non_urgent', 'new', now() + interval '2 day', auth.uid());
  end if;

  return jsonb_build_object(
    'family_id', family_id,
    'child_profile_id', child_id,
    'seeded', true
  );
end;
$$;

grant execute on function seed_demo_data() to authenticated;
