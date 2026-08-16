-- Creating a fresh invite link now disables the target's earlier UNUSED links.
-- (Old pending links otherwise stayed valid for 14 days each — so a re-sent link
-- didn't invalidate a lost/leaked one.) Only 'pending' rows are revoked; an already
-- accepted (connected) member is unaffected.

-- ---------- STAFF ----------
create or replace function public.create_staff_invite(
  p_family_id uuid,
  p_staff_profile_id text,
  p_roles jsonb,
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
    raise exception 'Only a family admin can create staff invites';
  end if;

  -- Disable any earlier unused link for THIS staff person.
  update public.family_invites
     set status = 'revoked'
   where family_id = p_family_id and role = 'staff'
     and staff_profile_id = p_staff_profile_id and status = 'pending';

  insert into public.family_invites (family_id, role, staff_profile_id, roles, features, created_by)
  values (p_family_id, 'staff', p_staff_profile_id, coalesce(p_roles, '[]'::jsonb), coalesce(p_features, '[]'::jsonb), auth.uid())
  returning * into v_row;

  return jsonb_build_object('id', v_row.id, 'token', v_row.token, 'expires_at', v_row.expires_at);
end;
$$;
grant execute on function public.create_staff_invite(uuid, text, jsonb, jsonb) to authenticated;

-- ---------- CHILD ----------
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

  update public.family_invites
     set status = 'revoked'
   where family_id = p_family_id and role = 'child'
     and child_profile_id = p_child_profile_id and status = 'pending';

  insert into public.family_invites (family_id, role, child_profile_id, features, created_by)
  values (p_family_id, 'child', p_child_profile_id, coalesce(p_features, '[]'::jsonb), auth.uid())
  returning * into v_row;

  return jsonb_build_object('id', v_row.id, 'token', v_row.token, 'expires_at', v_row.expires_at);
end;
$$;
grant execute on function public.create_child_invite(uuid, uuid, jsonb) to authenticated;

-- ---------- CO-PARENT ----------
create or replace function public.create_coparent_invite(p_family_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.family_invites;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role(p_family_id)::text not in ('mother', 'admin') then
    raise exception 'Only a family owner can invite a co-parent';
  end if;

  -- Co-parent invites aren't tied to a profile; revoke all pending ones for the family.
  update public.family_invites
     set status = 'revoked'
   where family_id = p_family_id and role = 'admin' and status = 'pending';

  insert into public.family_invites (family_id, role, created_by)
  values (p_family_id, 'admin', auth.uid())
  returning * into v_row;

  return jsonb_build_object('id', v_row.id, 'token', v_row.token, 'expires_at', v_row.expires_at);
end;
$$;
revoke execute on function public.create_coparent_invite(uuid) from public, anon;
grant execute on function public.create_coparent_invite(uuid) to authenticated;
