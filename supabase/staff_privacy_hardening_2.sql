-- Staff privacy hardening, round 2 — closes holes found in re-audit.
--
-- Postgres OR-combines permissive policies, and a FOR ALL policy also covers SELECT.
-- The notification tables still had their original `_manage_members` FOR ALL policy
-- (USING is_family_member), which OR'd over the restrictive select policy added earlier
-- and silently re-granted every staff member read access to ALL completion/reminder
-- rows — including co-workers' proof photos and notes. Split those into
-- INSERT/UPDATE/DELETE (which don't cover SELECT) and re-scope SELECT strictly.
--
-- Safe to re-run.

-- ---------- completed_task_notifications ----------
drop policy if exists "completed_task_notifications_manage_members" on public.completed_task_notifications;
create policy "completed_task_notifications_insert_members" on public.completed_task_notifications
  for insert with check (public.is_family_member(family_id));
create policy "completed_task_notifications_update_members" on public.completed_task_notifications
  for update using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));
create policy "completed_task_notifications_delete_members" on public.completed_task_notifications
  for delete using (public.is_family_member(family_id));

-- Strict SELECT: the owner sees all; a staff member sees only rows whose staff_name is
-- their own (with an explicit null guard so a null name can't match null rows).
drop policy if exists "completed_task_notifications_select_members" on public.completed_task_notifications;
create policy "completed_task_notifications_select_members" on public.completed_task_notifications
  for select using (
    public.is_family_member(family_id)
    and (
      not public.is_staff_of(family_id)
      or (public.my_staff_name(family_id) is not null and staff_name = public.my_staff_name(family_id))
    )
  );

-- ---------- staff_reminder_notifications ----------
drop policy if exists "staff_reminder_notifications_manage_members" on public.staff_reminder_notifications;
create policy "staff_reminder_notifications_insert_members" on public.staff_reminder_notifications
  for insert with check (public.is_family_member(family_id));
create policy "staff_reminder_notifications_update_members" on public.staff_reminder_notifications
  for update using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));
create policy "staff_reminder_notifications_delete_members" on public.staff_reminder_notifications
  for delete using (public.is_family_member(family_id));

drop policy if exists "staff_reminder_notifications_select_members" on public.staff_reminder_notifications;
create policy "staff_reminder_notifications_select_members" on public.staff_reminder_notifications
  for select using (
    public.is_family_member(family_id)
    and (
      not public.is_staff_of(family_id)
      or (public.my_staff_name(family_id) is not null and staff_name = public.my_staff_name(family_id))
    )
  );

-- ---------- events: staff must not even INSERT into the owner's calendar ----------
drop policy if exists "events_insert_members" on public.events;
create policy "events_insert_members" on public.events
  for insert with check (
    public.is_family_member(family_id) and created_by = auth.uid() and not public.is_staff_of(family_id)
  );
