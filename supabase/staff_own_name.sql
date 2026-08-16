-- Let a connected staff member edit their OWN display name.
-- staff_profiles writes are otherwise admin-only via RLS, so this is a
-- SECURITY DEFINER RPC scoped to the caller's own staff row.
--
-- It also rewrites the staff_name on the caller's own past proof rows so the
-- "History" view (which matches id-less routine completions by name) keeps
-- showing their history after a rename.

create or replace function public.set_staff_own_name(p_staff_profile_id text, p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_fam uuid;
  v_old text;
  v_new text := btrim(coalesce(p_name, ''));
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if length(v_new) = 0 then raise exception 'Name cannot be empty'; end if;
  if length(v_new) > 80 then v_new := left(v_new, 80); end if;

  select family_id, name into v_fam, v_old
  from public.staff_profiles where id = p_staff_profile_id;
  if v_fam is null then raise exception 'Staff profile not found'; end if;

  -- The caller must be the staff member of this family.
  if not exists (
    select 1 from public.family_members
    where family_id = v_fam and user_id = v_uid and role = 'staff' and status = 'active'
  ) then
    raise exception 'Not your staff profile';
  end if;

  update public.staff_profiles set name = v_new where id = p_staff_profile_id;

  -- Keep this staffer's own completed-task history attributed to the new name.
  update public.completed_task_notifications
     set staff_name = v_new
   where family_id = v_fam and created_by = v_uid;
end;
$$;

revoke execute on function public.set_staff_own_name(text, text) from public, anon;
grant execute on function public.set_staff_own_name(text, text) to authenticated;
