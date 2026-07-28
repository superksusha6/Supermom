-- Child "Today": let a connected child see their OWN day — their events and their
-- chores — and tick their own chores done, WITHOUT exposing siblings'/parents' data.
-- Safe to re-run.

-- ---------- CHORES ----------
-- Managing chores (create/edit/delete/assign) stays with owners only — a child (a
-- limited member) must not manage anyone's chores.
drop policy if exists "chores_manage_members" on public.chores;
create policy "chores_manage_members" on public.chores
  for all using (public.is_family_member(family_id) and not public.is_limited_member(family_id))
  with check (public.is_family_member(family_id) and not public.is_limited_member(family_id));

-- A child sees ONLY the chores assigned to their own profile.
drop policy if exists "chores_select_own_child" on public.chores;
create policy "chores_select_own_child" on public.chores
  for select using (
    public.is_child_of(family_id) and child_profile_id = public.my_child_profile_id(family_id)
  );

-- A child may update ONLY their own chore (to mark it done). Insert/delete stay owner-only.
drop policy if exists "chores_update_own_child" on public.chores;
create policy "chores_update_own_child" on public.chores
  for update using (
    public.is_child_of(family_id) and child_profile_id = public.my_child_profile_id(family_id)
  ) with check (
    public.is_child_of(family_id) and child_profile_id = public.my_child_profile_id(family_id)
  );

-- ---------- EVENTS ----------
-- A child sees ONLY their own events (their day plan). Everyone else's calendar
-- stays hidden, exactly as before.
drop policy if exists "events_select_members" on public.events;
create policy "events_select_members" on public.events
  for select using (
    (public.is_family_member(family_id) and not public.is_limited_member(family_id))
    or (public.is_child_of(family_id) and owner_child_profile_id = public.my_child_profile_id(family_id))
  );
