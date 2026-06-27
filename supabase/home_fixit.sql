-- "Fix it" section: household issues + saved repair contacts (family-scoped).
-- Run this in the Supabase SQL Editor. Relies on helper functions defined in schema.sql
-- (is_family_member, can_manage_family).

create table if not exists public.home_issues (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'other',
  location text,
  urgency text not null default 'normal',   -- 'urgent' | 'normal' | 'low'
  status text not null default 'new',        -- 'new' | 'scheduled' | 'done'
  reported_by text,
  provider_id uuid,
  cost numeric(10,2),
  scheduled_at timestamptz,
  resolved_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.home_providers (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  category text,
  phone text,
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists home_issues_family_idx on public.home_issues (family_id);
create index if not exists home_providers_family_idx on public.home_providers (family_id);

alter table public.home_issues enable row level security;
alter table public.home_providers enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.home_issues to authenticated;
grant select, insert, update, delete on table public.home_providers to authenticated;

-- Any family member can see and manage issues (so staff can report). Role-specific
-- restrictions (e.g. who may resolve / call) will be layered on later with profiles.
drop policy if exists "home_issues_select_members" on public.home_issues;
create policy "home_issues_select_members" on public.home_issues
for select using (is_family_member(family_id));

drop policy if exists "home_issues_manage_members" on public.home_issues;
create policy "home_issues_manage_members" on public.home_issues
for all using (is_family_member(family_id)) with check (is_family_member(family_id));

-- Saved repair contacts: visible to all members, managed by the parent/admin.
drop policy if exists "home_providers_select_members" on public.home_providers;
create policy "home_providers_select_members" on public.home_providers
for select using (is_family_member(family_id));

drop policy if exists "home_providers_manage_mother" on public.home_providers;
create policy "home_providers_manage_mother" on public.home_providers
for all using (can_manage_family(family_id)) with check (can_manage_family(family_id));
