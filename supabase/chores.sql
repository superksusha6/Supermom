-- Chores: recurring chores assigned to a child (parent-first). Optional points/approval
-- layer is reserved for later. Run in the Supabase SQL Editor; relies on is_family_member().

create table if not exists public.chores (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  child_profile_id uuid references public.child_profiles(id) on delete set null,
  recurrence text not null default 'weekly',   -- 'daily' | 'weekly' | 'once'
  requires_approval boolean not null default true,
  points int not null default 0,
  status text not null default 'todo',           -- 'todo' | 'done'
  sort_order int not null default 0,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists chores_family_idx on public.chores (family_id);

alter table public.chores enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.chores to authenticated;

-- Any family member can see and update chores (a child marks their own done).
-- Tighter per-role rules come later with profiles.
drop policy if exists "chores_select_members" on public.chores;
create policy "chores_select_members" on public.chores
for select using (is_family_member(family_id));

drop policy if exists "chores_manage_members" on public.chores;
create policy "chores_manage_members" on public.chores
for all using (is_family_member(family_id)) with check (is_family_member(family_id));
