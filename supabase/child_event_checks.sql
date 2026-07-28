-- A child ticks off their day-plan events (lessons/activities) like chores. Events
-- have no "done" state, so track per-event-per-day completions here. Each check = a fruit.
-- Safe to re-run.
create table if not exists public.child_event_checks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_profile_id uuid not null references public.child_profiles(id) on delete cascade,
  event_id text not null,
  done_date date not null,
  created_at timestamptz not null default now(),
  unique (child_profile_id, event_id, done_date)
);
create index if not exists child_event_checks_family_idx on public.child_event_checks (family_id, done_date);

alter table public.child_event_checks enable row level security;
grant select, insert, update, delete on table public.child_event_checks to authenticated;

-- Owners see/manage all; a child sees & ticks only their own.
drop policy if exists "child_event_checks_owner" on public.child_event_checks;
create policy "child_event_checks_owner" on public.child_event_checks
  for all using (public.is_family_member(family_id) and not public.is_limited_member(family_id))
  with check (public.is_family_member(family_id) and not public.is_limited_member(family_id));

drop policy if exists "child_event_checks_child" on public.child_event_checks;
create policy "child_event_checks_child" on public.child_event_checks
  for all using (public.is_child_of(family_id) and child_profile_id = public.my_child_profile_id(family_id))
  with check (public.is_child_of(family_id) and child_profile_id = public.my_child_profile_id(family_id));
