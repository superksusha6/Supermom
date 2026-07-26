-- Child profile, Phase 1: an invited child with their OWN login and a parent-gated
-- view, built on the same family_invites / family_members model as staff.
-- Safe to re-run.

-- ---------- invite carries which child profile + which functions ----------
alter table public.family_invites add column if not exists child_profile_id uuid references public.child_profiles(id) on delete cascade;
alter table public.family_invites add column if not exists features jsonb not null default '[]'::jsonb;

-- ---------- create a child invite (family admin only) ----------
create or replace function public.create_child_invite(
  p_family_id uuid,
  p_child_profile_id uuid,
  p_features jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.family_invites;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role(p_family_id)::text not in ('mother', 'father', 'admin') then
    raise exception 'Only a family admin can create child invites';
  end if;

  insert into public.family_invites (family_id, role, child_profile_id, features, created_by)
  values (p_family_id, 'child', p_child_profile_id, coalesce(p_features, '[]'::jsonb), auth.uid())
  returning * into v_row;

  return jsonb_build_object('id', v_row.id, 'token', v_row.token, 'expires_at', v_row.expires_at);
end;
$$;
grant execute on function public.create_child_invite(uuid, uuid, jsonb) to authenticated;

-- ---------- the child consumes the token and is linked to the family ----------
create or replace function public.accept_child_invite(p_token text)
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
  where token = p_token and role = 'child' and status = 'pending' and expires_at > now()
  for update;
  if not found then raise exception 'This invite link is invalid or has expired'; end if;

  -- An owner / existing non-child member must not be demoted into a child by this link.
  if exists (
    select 1 from public.family_members
    where family_id = v_inv.family_id and user_id = v_uid and role <> 'child'
  ) then
    raise exception 'You are already a member of this family — open the link with a different account.';
  end if;

  insert into public.family_members (family_id, user_id, role, status, invite_id, features, linked_child_profile_id)
  values (v_inv.family_id, v_uid, 'child', 'active', v_inv.id, v_inv.features, v_inv.child_profile_id)
  on conflict (family_id, user_id) do update
    set role = 'child', status = 'active', invite_id = v_inv.id, features = v_inv.features,
        linked_child_profile_id = v_inv.child_profile_id
    where family_members.role = 'child';  -- only ever update an existing CHILD row

  update public.family_invites
    set status = 'accepted', accepted_at = now(), accepted_by = v_uid
    where id = v_inv.id;

  return jsonb_build_object('family_id', v_inv.family_id, 'features', v_inv.features);
end;
$$;
grant execute on function public.accept_child_invite(text) to authenticated;

-- ---------- the owner changes an already-connected child's access ----------
create or replace function public.set_child_access(p_child_profile_id uuid, p_features jsonb)
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
  select family_id into v_fam from public.child_profiles where id = p_child_profile_id;
  if v_fam is null then raise exception 'Child profile not found'; end if;
  if not exists (
    select 1 from public.family_members
    where family_id = v_fam and user_id = v_uid and status = 'active' and role <> 'staff' and role <> 'child'
  ) then
    raise exception 'Only the family owner can change child access';
  end if;
  update public.family_members
     set features = coalesce(p_features, '[]'::jsonb)
   where family_id = v_fam and linked_child_profile_id = p_child_profile_id and role = 'child';
end;
$$;
revoke execute on function public.set_child_access(uuid, jsonb) from public, anon;
grant execute on function public.set_child_access(uuid, jsonb) to authenticated;

-- ---------- privacy: a child is a "limited member" like staff ----------
create or replace function public.is_child_of(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.family_members fm
    where fm.family_id = target_family_id and fm.user_id = auth.uid()
      and fm.role = 'child' and fm.status = 'active'
  );
$$;

create or replace function public.is_limited_member(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_staff_of(target_family_id) or public.is_child_of(target_family_id);
$$;

grant execute on function public.is_child_of(uuid) to authenticated;
grant execute on function public.is_limited_member(uuid) to authenticated;

-- ---------- block children from the owner's personal data (same set as staff) ----------
-- Re-create the owner-personal SELECT policies to exclude BOTH staff and child.
drop policy if exists "events_select_members" on public.events;
create policy "events_select_members" on public.events
  for select using (public.is_family_member(family_id) and not public.is_limited_member(family_id));

drop policy if exists "chores_select_members" on public.chores;
create policy "chores_select_members" on public.chores
  for select using (public.is_family_member(family_id) and not public.is_limited_member(family_id));

drop policy if exists "imported_email_events_select_members" on public.imported_email_events;
create policy "imported_email_events_select_members" on public.imported_email_events
  for select using (public.is_family_member(family_id) and not public.is_limited_member(family_id));

-- staff avatars/DOB and co-worker rows stay staff-scoped; a child sees no staff profiles.
drop policy if exists "staff_profiles_select_members" on public.staff_profiles;
create policy "staff_profiles_select_members" on public.staff_profiles
  for select using (
    public.is_family_member(family_id)
    and not public.is_child_of(family_id)
    and (not public.is_staff_of(family_id) or id = public.my_staff_profile_id(family_id))
  );

-- a child sees only their own household row, not the roster of members and grants.
drop policy if exists "family_members_select_members" on public.family_members;
create policy "family_members_select_members" on public.family_members
  for select using (
    public.is_family_member(family_id)
    and (not public.is_limited_member(family_id) or user_id = auth.uid())
  );

-- staff can inject events; a child must not either.
drop policy if exists "events_insert_members" on public.events;
create policy "events_insert_members" on public.events
  for insert with check (
    public.is_family_member(family_id) and created_by = auth.uid() and not public.is_limited_member(family_id)
  );

-- the child's own linked profile id (for reading their own name).
create or replace function public.my_child_profile_id(target_family_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select fm.linked_child_profile_id
  from public.family_members fm
  where fm.family_id = target_family_id and fm.user_id = auth.uid()
    and fm.role = 'child' and fm.status = 'active'
  limit 1;
$$;
grant execute on function public.my_child_profile_id(uuid) to authenticated;

-- Let a connected child read ONLY their own child_profiles row (name), on top of the
-- existing owner/staff access. Keeps the greeting working after a fresh login.
drop policy if exists "child_profiles_select_members" on public.child_profiles;
create policy "child_profiles_select_members" on public.child_profiles
  for select using (
    (public.is_family_member(family_id) and not public.is_limited_member(family_id))
    or (public.is_staff_of(family_id) and (public.can_staff_access(family_id, 'schedule') or public.can_staff_access(family_id, 'tasks')))
    or (public.is_child_of(family_id) and id = public.my_child_profile_id(family_id))
  );
