-- Let the family owner change an ALREADY-CONNECTED staff member's access.
--
-- Until now the roles/features checkboxes only reached the server inside the invite
-- token. Editing them afterwards updated local storage only, so the staff member's
-- account kept whatever access it was invited with — and the change was invisible on
-- any other admin device.

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

  -- Only an active NON-staff member (the owner) may hand out or revoke access.
  if not exists (
    select 1 from public.family_members
    where family_id = v_fam and user_id = v_uid and status = 'active' and role <> 'staff'
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
