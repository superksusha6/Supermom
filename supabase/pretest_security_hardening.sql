-- =====================================================================
-- Pre-family-test security hardening (2026-08)
-- Closes the 5 role-access gaps found in the cross-role audit before
-- real child / nanny accounts join. Safe to run once in prod.
--
-- 1. Medicine cabinet was readable/writable by staff AND child.
-- 2. Accepting a staff link could demote an owner/co-parent to staff.
-- 3. A child could delete / re-grant staff via owner-only RPCs.
-- 4. A child could read every sibling's activity schedule.
-- 5. A child could read every family task + all sibling profile names.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) MEDICINES — exclude limited members (staff + child) from health data.
--    is_limited_member = staff OR child; co-parent (admin) is NOT limited.
-- ---------------------------------------------------------------------
drop policy if exists "medicines_select_members" on public.medicines;
create policy "medicines_select_members" on public.medicines
for select using (public.is_family_member(family_id) and not public.is_limited_member(family_id));

drop policy if exists "medicines_insert_members" on public.medicines;
create policy "medicines_insert_members" on public.medicines
for insert with check (
  public.is_family_member(family_id) and not public.is_limited_member(family_id) and created_by = auth.uid()
);

drop policy if exists "medicines_update_members" on public.medicines;
create policy "medicines_update_members" on public.medicines
for update using (public.is_family_member(family_id) and not public.is_limited_member(family_id))
with check (public.is_family_member(family_id) and not public.is_limited_member(family_id));

drop policy if exists "medicines_delete_members" on public.medicines;
create policy "medicines_delete_members" on public.medicines
for delete using (public.is_family_member(family_id) and not public.is_limited_member(family_id));

-- ---------------------------------------------------------------------
-- 2) accept_staff_invite — never demote an existing owner/co-parent.
--    Mirrors the guard already used by accept_child_invite.
-- ---------------------------------------------------------------------
create or replace function public.accept_staff_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.family_invites;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_inv
  from public.family_invites
  where token = p_token
    and role = 'staff'
    and status = 'pending'
    and expires_at > now()
  for update;

  if not found then
    raise exception 'This invite link is invalid or has expired';
  end if;

  -- An owner / existing non-staff member must not be demoted into staff by this link.
  if exists (
    select 1 from public.family_members
    where family_id = v_inv.family_id and user_id = v_uid and role <> 'staff'
  ) then
    raise exception 'You are already a member of this family — open the link with a different account.';
  end if;

  insert into public.family_members (family_id, user_id, role, status, invite_id, roles, features)
  values (v_inv.family_id, v_uid, 'staff', 'active', v_inv.id, v_inv.roles, v_inv.features)
  on conflict (family_id, user_id) do update
    set role = 'staff',
        status = 'active',
        invite_id = v_inv.id,
        roles = v_inv.roles,
        features = v_inv.features
    where family_members.role = 'staff';  -- only ever update an existing STAFF row

  update public.family_invites
    set status = 'accepted', accepted_at = now(), accepted_by = v_uid
    where id = v_inv.id;

  return jsonb_build_object('family_id', v_inv.family_id, 'roles', v_inv.roles, 'features', v_inv.features);
end;
$$;
grant execute on function public.accept_staff_invite(text) to authenticated;

-- ---------------------------------------------------------------------
-- 3) Staff-management RPCs — restrict to real owners (mother/father/admin).
--    The old guard `role <> 'staff'` accidentally admitted role='child'.
-- ---------------------------------------------------------------------
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

  if not exists (
    select 1 from public.family_members
    where family_id = v_fam and user_id = v_uid and status = 'active'
      and role in ('mother','father','admin')
  ) then
    raise exception 'Only the family owner can remove staff';
  end if;

  delete from public.family_members
   where family_id = v_fam and staff_profile_id = p_staff_profile_id and role = 'staff';

  update public.family_invites
     set status = 'revoked'
   where family_id = v_fam and staff_profile_id = p_staff_profile_id and status = 'pending';

  delete from public.staff_profiles where id = p_staff_profile_id and family_id = v_fam;
end;
$$;
revoke execute on function public.remove_staff_member(text) from public, anon;
grant execute on function public.remove_staff_member(text) to authenticated;

create or replace function public.set_staff_access(p_staff_profile_id text, p_roles jsonb, p_features jsonb)
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
      and role in ('mother','father','admin')
  ) then
    raise exception 'Only the family owner can change staff access';
  end if;

  update public.family_members
     set roles = coalesce(p_roles, '[]'::jsonb),
         features = coalesce(p_features, '[]'::jsonb)
   where family_id = v_fam
     and staff_profile_id = p_staff_profile_id
     and role = 'staff';
end;
$$;
revoke execute on function public.set_staff_access(text, jsonb, jsonb) from public, anon;
grant execute on function public.set_staff_access(text, jsonb, jsonb) to authenticated;

-- set_staff_profile_photo: only the owner (or the staffer themselves) may set an avatar.
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
      and (role in ('mother','father','admin') or role = 'staff')
  ) then
    raise exception 'Not your family';
  end if;
  -- A staff member may set only their own avatar; a child may not set any.
  if public.is_child_of(v_fam) then
    raise exception 'Not allowed';
  end if;
  if public.is_staff_of(v_fam) and p_staff_profile_id is distinct from public.my_staff_profile_id(v_fam) then
    raise exception 'Not your profile';
  end if;
  update public.staff_profiles set photo_uri = p_photo where id = p_staff_profile_id;
end;
$$;
revoke execute on function public.set_staff_profile_photo(text, text) from public, anon;
grant execute on function public.set_staff_profile_photo(text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 4) child_activities SELECT — a child sees ONLY their own activities;
--    staff/parents with schedule|tasks still see all.
-- ---------------------------------------------------------------------
drop policy if exists "child_activities_select_members" on public.child_activities;
create policy "child_activities_select_members" on public.child_activities
for select using (
  exists (
    select 1 from public.child_profiles cp
    where cp.id = child_activities.child_profile_id
      and (
        (
          (public.can_staff_access(cp.family_id, 'schedule') or public.can_staff_access(cp.family_id, 'tasks'))
          and not public.is_child_of(cp.family_id)
        )
        or child_activities.child_profile_id = public.my_child_profile_id(cp.family_id)
      )
  )
);

-- ---------------------------------------------------------------------
-- 5) child_profiles SELECT + tasks SELECT — exclude the child role from the
--    broad read. Child keeps its own-row profile policy (from child_invite.sql)
--    and its own chores/events; it has no business reading the family task list
--    or sibling profile cards.
-- ---------------------------------------------------------------------
drop policy if exists "child_profiles_select_members" on public.child_profiles;
create policy "child_profiles_select_members" on public.child_profiles
for select using (
  (public.can_staff_access(family_id, 'schedule') or public.can_staff_access(family_id, 'tasks'))
  and not public.is_child_of(family_id)
);

drop policy if exists "tasks_select_members" on public.tasks;
create policy "tasks_select_members" on public.tasks
for select using (
  public.can_staff_access(family_id, 'tasks')
  and not public.is_child_of(family_id)
  and (
    public.current_user_role(family_id) <> 'staff'
    or source_profile_id = public.my_staff_profile_id(family_id)
  )
);
