-- Let a connected child CREATE calendar events — for themselves, or for the family
-- (mom / shared) — and edit/delete the ones they created. Adults' existing policies are
-- untouched. A child still SELECTs only their own events (child_today_access.sql), so a
-- mom-targeted event they create lands on mom's calendar, not back in the child's view.
-- Safe to re-run.

drop policy if exists "events_insert_own_child" on public.events;
create policy "events_insert_own_child" on public.events
  for insert with check (
    public.is_child_of(family_id)
    and created_by = auth.uid()
    and (
      owner_child_profile_id = public.my_child_profile_id(family_id)
      or owner_child_profile_id is null
    )
  );

drop policy if exists "events_update_own_child" on public.events;
create policy "events_update_own_child" on public.events
  for update using (public.is_child_of(family_id) and created_by = auth.uid())
  with check (public.is_child_of(family_id) and created_by = auth.uid());

drop policy if exists "events_delete_own_child" on public.events;
create policy "events_delete_own_child" on public.events
  for delete using (public.is_child_of(family_id) and created_by = auth.uid());
