-- Per-person staff task delivery.
-- Links a logged-in staff account to its staff_profiles row, then scopes task
-- visibility so each staffer sees ONLY the tasks addressed to them
-- (tasks.source_profile_id = their staff_profiles.id), and may tick their own done.

-- 1) Link column on family_members: which staff_profiles row this member is.
alter table public.family_members
  add column if not exists staff_profile_id text references public.staff_profiles(id) on delete set null;

-- Backfill existing accepted staff from the invite they used.
update public.family_members fm
set staff_profile_id = fi.staff_profile_id
from public.family_invites fi
where fm.invite_id = fi.id
  and fm.staff_profile_id is null
  and fi.staff_profile_id is not null;

-- 2) accept_staff_invite now persists the profile link.
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

  insert into public.family_members (family_id, user_id, role, status, invite_id, roles, features, staff_profile_id)
  values (v_inv.family_id, v_uid, 'staff', 'active', v_inv.id, v_inv.roles, v_inv.features, v_inv.staff_profile_id)
  on conflict (family_id, user_id) do update
    set role = 'staff',
        status = 'active',
        invite_id = v_inv.id,
        roles = v_inv.roles,
        features = v_inv.features,
        staff_profile_id = v_inv.staff_profile_id;

  update public.family_invites
    set status = 'accepted', accepted_at = now(), accepted_by = v_uid
    where id = v_inv.id;

  return jsonb_build_object(
    'family_id', v_inv.family_id,
    'roles', v_inv.roles,
    'features', v_inv.features,
    'staff_profile_id', v_inv.staff_profile_id
  );
end;
$$;

-- 3) Helper: the caller's staff_profile_id within a family (null for non-staff).
create or replace function public.my_staff_profile_id(target_family_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select staff_profile_id
  from public.family_members
  where family_id = target_family_id
    and user_id = auth.uid()
  limit 1
$$;
grant execute on function public.my_staff_profile_id(uuid) to authenticated;

-- 4) Task visibility: family (non-staff) sees all; a staffer sees only their own.
drop policy if exists "tasks_select_members" on public.tasks;
create policy "tasks_select_members" on public.tasks
for select using (
  public.can_staff_access(family_id, 'tasks')
  and (
    public.current_user_role(family_id) <> 'staff'
    or source_profile_id = public.my_staff_profile_id(family_id)
  )
);

-- 5) A staffer may update their own tasks (used to mark done). Insert/delete stay mother-only.
drop policy if exists "tasks_update_staff_own" on public.tasks;
create policy "tasks_update_staff_own" on public.tasks
for update using (
  public.current_user_role(family_id) = 'staff'
  and source_profile_id = public.my_staff_profile_id(family_id)
)
with check (
  public.current_user_role(family_id) = 'staff'
  and source_profile_id = public.my_staff_profile_id(family_id)
);
