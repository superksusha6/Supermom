-- Co-parent (second parent) invites.
-- A co-parent is a FULL owner-level member of the family: they join with role
-- 'admin', which every owner RLS policy already treats as an owner (see
-- can_manage_family / is_family_admin = mother OR admin, and the tasks/staff/
-- invite policies that allow 'mother','admin'). In the client, toUiRole() maps
-- 'admin' -> 'mother', so a co-parent gets the exact same UI as the mother,
-- including the "Staff tasks" card — which is the whole point of this feature.
-- Reuses family_invites/family_members. Safe to re-run.

-- The old check allowed only child/staff/father ('father' was never a valid
-- app_role label). Allow an 'admin' invite row.
alter table public.family_invites drop constraint if exists family_invites_role_check;
alter table public.family_invites
  add constraint family_invites_role_check check (role::text in ('child', 'staff', 'admin'));

-- ---------- a family owner mints a co-parent invite ----------
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

  insert into public.family_invites (family_id, role, created_by)
  values (p_family_id, 'admin', auth.uid())
  returning * into v_row;

  return jsonb_build_object('id', v_row.id, 'token', v_row.token, 'expires_at', v_row.expires_at);
end;
$$;
revoke execute on function public.create_coparent_invite(uuid) from public, anon;
grant execute on function public.create_coparent_invite(uuid) to authenticated;

-- ---------- the invitee consumes the token → becomes a full owner (admin) ----------
create or replace function public.accept_coparent_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.family_invites;
  v_uid uuid := auth.uid();
  v_existing public.app_role;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_inv
  from public.family_invites
  where token = p_token and role = 'admin' and status = 'pending' and expires_at > now()
  for update;
  if not found then raise exception 'This invite link is invalid or has expired'; end if;

  select role into v_existing
  from public.family_members
  where family_id = v_inv.family_id and user_id = v_uid;

  if v_existing is not null then
    -- Already an owner (e.g. the mother opening her own link) → no-op, never demote.
    -- Already staff/child → don't silently promote; use a different account.
    if v_existing::text not in ('mother', 'admin') then
      raise exception 'This account is already part of the family in another role — open the link with a different account.';
    end if;
  else
    insert into public.family_members (family_id, user_id, role, status, invite_id, features)
    values (v_inv.family_id, v_uid, 'admin', 'active', v_inv.id, '[]'::jsonb);
  end if;

  update public.family_invites
    set status = 'accepted', accepted_at = now(), accepted_by = v_uid
    where id = v_inv.id;

  return jsonb_build_object('family_id', v_inv.family_id);
end;
$$;
revoke execute on function public.accept_coparent_invite(text) from public, anon;
grant execute on function public.accept_coparent_invite(text) to authenticated;
