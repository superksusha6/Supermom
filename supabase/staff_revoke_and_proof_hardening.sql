-- Staff trust-boundary fixes (audit C1 + M2). Safe to re-run.
--
-- C1: "Deleting" a staff card only removed the staff_profiles row; the invited
--     person's family_members row (role='staff', features=[...]) survived, and ALL
--     server authorization (can_staff_access / is_staff_of) keys off family_members.
--     So a "removed" nanny's account kept full granted read/write access forever.
--     Fix: an owner-gated SECURITY DEFINER RPC that revokes membership + expires any
--     pending invite + deletes the profile, atomically. We DELETE the membership row
--     (rather than status='disabled') on purpose: is_staff_of() requires
--     status='active', so a lingering non-active staff row would flip the
--     "is_family_member AND NOT is_staff_of" privacy policies OPEN (latent bug L4).
--
-- M2: completed_task_notifications / staff_reminder_notifications INSERT/UPDATE/DELETE
--     were bare is_family_member — a staff could delete/rewrite/forge ANY proof row
--     in the family (erase a failed task's record, wipe a co-worker's proofs, or
--     fabricate a "done" under someone else's name). Re-scope writes to mirror the
--     SELECT policy: staff may only touch their own rows, under their own name.

-- ============================ C1: revoke on remove ============================
create or replace function public.remove_staff_member(p_staff_profile_id text)
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

  -- Only an active NON-staff member (the owner) may remove staff.
  if not exists (
    select 1 from public.family_members
    where family_id = v_fam and user_id = v_uid and status = 'active' and role <> 'staff'
  ) then
    raise exception 'Only the family owner can remove staff';
  end if;

  -- 1) Revoke the live account's access (the actual security fix).
  delete from public.family_members
   where family_id = v_fam and staff_profile_id = p_staff_profile_id and role = 'staff';

  -- 2) Expire any still-pending invite so a fresh acceptance can't re-grant access.
  update public.family_invites
     set status = 'revoked'
   where family_id = v_fam and staff_profile_id = p_staff_profile_id and status = 'pending';

  -- 3) Remove the profile card itself.
  delete from public.staff_profiles where id = p_staff_profile_id and family_id = v_fam;
end;
$$;

revoke execute on function public.remove_staff_member(text) from public, anon;
grant execute on function public.remove_staff_member(text) to authenticated;

-- ===================== M2: proof / reminder write scoping =====================
-- completed_task_notifications
drop policy if exists "completed_task_notifications_insert_members" on public.completed_task_notifications;
create policy "completed_task_notifications_insert_members" on public.completed_task_notifications
  for insert with check (
    public.is_family_member(family_id)
    and created_by = auth.uid()
    and (
      not public.is_staff_of(family_id)
      or (public.my_staff_name(family_id) is not null and staff_name = public.my_staff_name(family_id))
    )
  );

drop policy if exists "completed_task_notifications_update_members" on public.completed_task_notifications;
create policy "completed_task_notifications_update_members" on public.completed_task_notifications
  for update using (
    public.is_family_member(family_id)
    and (
      not public.is_staff_of(family_id)
      or (public.my_staff_name(family_id) is not null and staff_name = public.my_staff_name(family_id))
    )
  ) with check (
    public.is_family_member(family_id)
    and (
      not public.is_staff_of(family_id)
      or (public.my_staff_name(family_id) is not null and staff_name = public.my_staff_name(family_id))
    )
  );

drop policy if exists "completed_task_notifications_delete_members" on public.completed_task_notifications;
create policy "completed_task_notifications_delete_members" on public.completed_task_notifications
  for delete using (
    public.is_family_member(family_id)
    and (
      not public.is_staff_of(family_id)
      or (public.my_staff_name(family_id) is not null and staff_name = public.my_staff_name(family_id))
    )
  );

-- staff_reminder_notifications (same shape)
drop policy if exists "staff_reminder_notifications_insert_members" on public.staff_reminder_notifications;
create policy "staff_reminder_notifications_insert_members" on public.staff_reminder_notifications
  for insert with check (
    public.is_family_member(family_id)
    and created_by = auth.uid()
    and (
      not public.is_staff_of(family_id)
      or (public.my_staff_name(family_id) is not null and staff_name = public.my_staff_name(family_id))
    )
  );

drop policy if exists "staff_reminder_notifications_update_members" on public.staff_reminder_notifications;
create policy "staff_reminder_notifications_update_members" on public.staff_reminder_notifications
  for update using (
    public.is_family_member(family_id)
    and (
      not public.is_staff_of(family_id)
      or (public.my_staff_name(family_id) is not null and staff_name = public.my_staff_name(family_id))
    )
  ) with check (
    public.is_family_member(family_id)
    and (
      not public.is_staff_of(family_id)
      or (public.my_staff_name(family_id) is not null and staff_name = public.my_staff_name(family_id))
    )
  );

drop policy if exists "staff_reminder_notifications_delete_members" on public.staff_reminder_notifications;
create policy "staff_reminder_notifications_delete_members" on public.staff_reminder_notifications
  for delete using (
    public.is_family_member(family_id)
    and (
      not public.is_staff_of(family_id)
      or (public.my_staff_name(family_id) is not null and staff_name = public.my_staff_name(family_id))
    )
  );
