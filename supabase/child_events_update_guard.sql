-- Tighten the child's event UPDATE policy so it matches the INSERT constraint: a child
-- can only own/target their own profile (or leave it null for a mom/shared event) — they
-- must NOT be able to edit an event to reassign owner_child_profile_id to a sibling.
-- Safe to re-run.

drop policy if exists "events_update_own_child" on public.events;
create policy "events_update_own_child" on public.events
  for update using (
    public.is_child_of(family_id) and created_by = auth.uid()
  ) with check (
    public.is_child_of(family_id)
    and created_by = auth.uid()
    and (
      owner_child_profile_id = public.my_child_profile_id(family_id)
      or owner_child_profile_id is null
    )
  );
