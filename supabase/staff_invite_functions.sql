-- Staff invites — Step 2 (server RPCs, security definer).
-- create_staff_invite: a family admin mints an invite row (token auto-generated) carrying
--   the roles + features to grant. accept_staff_invite: the invited user consumes the token,
--   is linked to the family as staff with those grants, and the invite is marked accepted.

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
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if public.current_user_role(p_family_id)::text not in ('mother', 'father', 'admin') then
    raise exception 'Only a family admin can create staff invites';
  end if;

  insert into public.family_invites (family_id, role, staff_profile_id, roles, features, created_by)
  values (
    p_family_id,
    'staff',
    p_staff_profile_id,
    coalesce(p_roles, '[]'::jsonb),
    coalesce(p_features, '[]'::jsonb),
    auth.uid()
  )
  returning * into v_row;

  return jsonb_build_object('id', v_row.id, 'token', v_row.token, 'expires_at', v_row.expires_at);
end;
$$;

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

  insert into public.family_members (family_id, user_id, role, status, invite_id, roles, features)
  values (v_inv.family_id, v_uid, 'staff', 'active', v_inv.id, v_inv.roles, v_inv.features)
  on conflict (family_id, user_id) do update
    set role = 'staff',
        status = 'active',
        invite_id = v_inv.id,
        roles = v_inv.roles,
        features = v_inv.features;

  update public.family_invites
    set status = 'accepted', accepted_at = now(), accepted_by = v_uid
    where id = v_inv.id;

  return jsonb_build_object('family_id', v_inv.family_id, 'roles', v_inv.roles, 'features', v_inv.features);
end;
$$;

grant execute on function public.create_staff_invite(uuid, text, jsonb, jsonb) to authenticated;
grant execute on function public.accept_staff_invite(text) to authenticated;
