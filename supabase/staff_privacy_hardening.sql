-- Staff privacy hardening.
--
-- The client already hides the owner's personal areas from staff, but hiding a card
-- means nothing if the row is still readable with a plain query. These policies make
-- the server agree with the product rule: an invited staff member (nanny/cook) may
-- only reach the functions the owner granted, and never the owner's personal data.
--
-- Safe to re-run.

-- ---------- helpers (security definer, so they bypass RLS themselves) ----------

create or replace function public.is_staff_of(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.family_members fm
    where fm.family_id = target_family_id
      and fm.user_id = auth.uid()
      and fm.role = 'staff'
      and fm.status = 'active'
  );
$$;

create or replace function public.my_staff_profile_id(target_family_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select fm.staff_profile_id
  from public.family_members fm
  where fm.family_id = target_family_id
    and fm.user_id = auth.uid()
    and fm.role = 'staff'
    and fm.status = 'active'
  limit 1;
$$;

create or replace function public.my_staff_name(target_family_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select sp.name
  from public.staff_profiles sp
  where sp.id = public.my_staff_profile_id(target_family_id)
  limit 1;
$$;

grant execute on function public.is_staff_of(uuid) to authenticated;
grant execute on function public.my_staff_profile_id(uuid) to authenticated;
grant execute on function public.my_staff_name(uuid) to authenticated;

-- ---------- the owner's calendar is never staff-visible ----------
-- Product rule: staff have no calendar at all. The feature flag previously handed
-- them the entire family event list, including the owner's private appointments.
drop policy if exists "events_select_members" on public.events;
create policy "events_select_members" on public.events
for select using (public.is_family_member(family_id) and not public.is_staff_of(family_id));

-- ---------- children's chores are a parent/child feature ----------
drop policy if exists "chores_select_members" on public.chores;
create policy "chores_select_members" on public.chores
for select using (public.is_family_member(family_id) and not public.is_staff_of(family_id));

drop policy if exists "chores_manage_members" on public.chores;
create policy "chores_manage_members" on public.chores
for all
using (public.is_family_member(family_id) and not public.is_staff_of(family_id))
with check (public.is_family_member(family_id) and not public.is_staff_of(family_id));

-- ---------- tradespeople contacts follow the fix-it grant ----------
drop policy if exists "home_providers_select_members" on public.home_providers;
create policy "home_providers_select_members" on public.home_providers
for select using (public.can_staff_access(family_id, 'fixit'));

-- ---------- anything parsed out of the owner's mailbox is owner-only ----------
drop policy if exists "imported_email_events_select_members" on public.imported_email_events;
create policy "imported_email_events_select_members" on public.imported_email_events
for select using (public.is_family_member(family_id) and not public.is_staff_of(family_id));

drop policy if exists "imported_email_events_manage_members" on public.imported_email_events;
create policy "imported_email_events_manage_members" on public.imported_email_events
for all
using (public.is_family_member(family_id) and not public.is_staff_of(family_id))
with check (public.is_family_member(family_id) and not public.is_staff_of(family_id));

-- ---------- a staff member sees only their own profile ----------
-- (previously every staff could read co-workers' date of birth, photo and duties)
drop policy if exists "staff_profiles_select_members" on public.staff_profiles;
create policy "staff_profiles_select_members" on public.staff_profiles
for select using (
  public.is_family_member(family_id)
  and (not public.is_staff_of(family_id) or id = public.my_staff_profile_id(family_id))
);

-- ---------- proof photos/notes belong to the person who submitted them ----------
drop policy if exists "completed_task_notifications_select_members" on public.completed_task_notifications;
create policy "completed_task_notifications_select_members" on public.completed_task_notifications
for select using (
  public.is_family_member(family_id)
  and (
    not public.is_staff_of(family_id)
    or staff_name is not distinct from public.my_staff_name(family_id)
  )
);

drop policy if exists "staff_reminder_notifications_select_members" on public.staff_reminder_notifications;
create policy "staff_reminder_notifications_select_members" on public.staff_reminder_notifications
for select using (
  public.is_family_member(family_id)
  and (
    not public.is_staff_of(family_id)
    or staff_name is not distinct from public.my_staff_name(family_id)
  )
);

-- ---------- Mom<->Dad shopping shares follow the shopping grant ----------
drop policy if exists "shopping_shares_select_members" on public.shopping_shares;
create policy "shopping_shares_select_members" on public.shopping_shares
for select using (public.can_staff_access(family_id, 'shopping'));

drop policy if exists "shopping_shares_manage_members" on public.shopping_shares;
create policy "shopping_shares_manage_members" on public.shopping_shares
for all
using (public.can_staff_access(family_id, 'shopping'))
with check (public.can_staff_access(family_id, 'shopping'));

-- ---------- staff can't enumerate the household roster and its grants ----------
drop policy if exists "family_members_select_members" on public.family_members;
create policy "family_members_select_members" on public.family_members
for select using (
  public.is_family_member(family_id)
  and (not public.is_staff_of(family_id) or user_id = auth.uid())
);

-- ---------- a staff member may only set their OWN avatar ----------
create or replace function public.set_staff_profile_photo(p_staff_profile_id text, p_photo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_fam uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select family_id into v_fam from public.staff_profiles where id = p_staff_profile_id;
  if v_fam is null then raise exception 'Staff profile not found'; end if;
  if not exists (
    select 1 from public.family_members
    where family_id = v_fam and user_id = v_uid and status = 'active'
  ) then
    raise exception 'Not your family';
  end if;
  -- The owner may set any staff avatar; a staff member only their own.
  if public.is_staff_of(v_fam) and p_staff_profile_id is distinct from public.my_staff_profile_id(v_fam) then
    raise exception 'Not your profile';
  end if;
  update public.staff_profiles set photo_uri = p_photo where id = p_staff_profile_id;
end;
$$;
revoke execute on function public.set_staff_profile_photo(text, text) from public, anon;
grant execute on function public.set_staff_profile_photo(text, text) to authenticated;

-- ---------- close the unused demo-seeding RPC ----------
-- Nothing calls it, but it was executable by every signed-in user and writes data.
do $$
begin
  if exists (select 1 from pg_proc where proname = 'seed_demo_data') then
    execute 'revoke execute on function public.seed_demo_data() from public, anon, authenticated';
  end if;
end $$;
