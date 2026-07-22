-- Staff sign-up polish:
-- 1) set_staff_profile_dob: a newly-joined staff member writes their OWN date of birth
--    back onto their staff profile (staff_profiles writes are otherwise admin-only via RLS).
-- 2) Harden accept_staff_invite so a family owner / existing non-staff member can NEVER be
--    flipped into staff by opening an invite link (that self-accept was demoting accounts).

create or replace function public.set_staff_profile_dob(p_staff_profile_id text, p_dob date)
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
  -- The caller must be the staff member of this family.
  if not exists (
    select 1 from public.family_members
    where family_id = v_fam and user_id = v_uid and role = 'staff' and status = 'active'
  ) then
    raise exception 'Not your staff profile';
  end if;
  update public.staff_profiles set date_of_birth = p_dob where id = p_staff_profile_id;
end;
$$;
grant execute on function public.set_staff_profile_dob(text, date) to authenticated;

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
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_inv
  from public.family_invites
  where token = p_token and role = 'staff' and status = 'pending' and expires_at > now()
  for update;
  if not found then raise exception 'This invite link is invalid or has expired'; end if;

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
    set role = 'staff', status = 'active', invite_id = v_inv.id, roles = v_inv.roles, features = v_inv.features
    where family_members.role = 'staff';  -- extra safety: only update an existing STAFF row

  update public.family_invites
    set status = 'accepted', accepted_at = now(), accepted_by = v_uid
    where id = v_inv.id;

  return jsonb_build_object('family_id', v_inv.family_id, 'roles', v_inv.roles, 'features', v_inv.features);
end;
$$;
grant execute on function public.accept_staff_invite(text) to authenticated;
