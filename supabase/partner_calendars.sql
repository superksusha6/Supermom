-- Partner calendars — Phase 1 (two separate accounts, privacy-first).
-- Alice links with her partner Bob (each has their own family/account). Alice proposes a
-- time; Bob's app checks HIS free/busy locally and confirms or declines. On confirm, the
-- event is written into BOTH families' calendars. Neither party can read the other's events
-- — only the proposal they exchanged. All cross-family writes go through security-definer
-- RPCs; the tables themselves are readable only by the two parties.

-- ------------------------------------------------------------------ tables
create table if not exists public.partner_links (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  requester_family_id uuid not null references public.families(id) on delete cascade,
  requester_name text,
  partner_id uuid references auth.users(id) on delete cascade,
  partner_family_id uuid references public.families(id) on delete cascade,
  partner_name text,
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  status text not null default 'pending',            -- pending | accepted | revoked
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create table if not exists public.calendar_proposals (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.partner_links(id) on delete cascade,
  from_user_id uuid not null references auth.users(id) on delete cascade,
  from_family_id uuid not null references public.families(id) on delete cascade,
  from_name text,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  to_family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,                    -- proposed start (UTC wall-clock)
  end_time text,                                     -- display end ("7:00 PM")
  notes text,                                        -- prebuilt event notes json (color/category/…)
  color text,
  message text,                                      -- optional note to the partner
  status text not null default 'pending',            -- pending | confirmed | declined | cancelled
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create index if not exists calendar_proposals_to_idx on public.calendar_proposals (to_user_id, status);
create index if not exists calendar_proposals_from_idx on public.calendar_proposals (from_user_id, status);

alter table public.partner_links enable row level security;
alter table public.calendar_proposals enable row level security;
grant select on table public.partner_links to authenticated;
grant select on table public.calendar_proposals to authenticated;

-- ------------------------------------------------------------------ RLS (parties only)
drop policy if exists "partner_links_select_parties" on public.partner_links;
create policy "partner_links_select_parties" on public.partner_links
for select using (requester_id = auth.uid() or partner_id = auth.uid());

drop policy if exists "calendar_proposals_select_parties" on public.calendar_proposals;
create policy "calendar_proposals_select_parties" on public.calendar_proposals
for select using (from_user_id = auth.uid() or to_user_id = auth.uid());
-- All writes happen through the security-definer RPCs below.

-- ------------------------------------------------------------------ helper: is caller a member of a family
create or replace function public.is_member_of(target_family_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.family_members
    where family_id = target_family_id and user_id = auth.uid() and status = 'active'
  );
$$;
grant execute on function public.is_member_of(uuid) to authenticated;

-- ------------------------------------------------------------------ create a partner invite
create or replace function public.create_partner_invite(p_family_id uuid, p_requester_name text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_row public.partner_links;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not public.is_member_of(p_family_id) then
    raise exception 'You are not a member of this family';
  end if;
  insert into public.partner_links (requester_id, requester_family_id, requester_name)
  values (auth.uid(), p_family_id, p_requester_name)
  returning * into v_row;
  return jsonb_build_object('id', v_row.id, 'token', v_row.token);
end; $$;
grant execute on function public.create_partner_invite(uuid, text) to authenticated;

-- ------------------------------------------------------------------ accept a partner invite
create or replace function public.accept_partner_invite(p_token text, p_family_id uuid, p_partner_name text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_link public.partner_links; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not public.is_member_of(p_family_id) then
    raise exception 'You are not a member of this family';
  end if;
  select * into v_link from public.partner_links
    where token = p_token and status = 'pending' for update;
  if not found then raise exception 'This partner link is invalid or already used'; end if;
  if v_link.requester_id = v_uid then raise exception 'You cannot accept your own invite'; end if;

  update public.partner_links
    set partner_id = v_uid, partner_family_id = p_family_id, partner_name = p_partner_name,
        status = 'accepted', accepted_at = now()
    where id = v_link.id;

  return jsonb_build_object('id', v_link.id, 'requester_name', v_link.requester_name);
end; $$;
grant execute on function public.accept_partner_invite(text, uuid, text) to authenticated;

-- ------------------------------------------------------------------ revoke a link (either party)
create or replace function public.revoke_partner_link(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.partner_links set status = 'revoked'
    where id = p_id and (requester_id = auth.uid() or partner_id = auth.uid());
end; $$;
grant execute on function public.revoke_partner_link(uuid) to authenticated;

-- ------------------------------------------------------------------ create a proposal (caller = the "from" side)
create or replace function public.create_calendar_proposal(
  p_link_id uuid, p_title text, p_starts_at timestamptz, p_end_time text,
  p_notes text, p_color text, p_message text
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_link public.partner_links; v_uid uuid := auth.uid();
  v_from_family uuid; v_from_name text; v_to_user uuid; v_to_family uuid;
  v_row public.calendar_proposals;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select * into v_link from public.partner_links
    where id = p_link_id and status = 'accepted'
      and (requester_id = v_uid or partner_id = v_uid);
  if not found then raise exception 'No accepted partner link'; end if;

  if v_link.requester_id = v_uid then
    v_from_family := v_link.requester_family_id; v_from_name := v_link.requester_name;
    v_to_user := v_link.partner_id;              v_to_family := v_link.partner_family_id;
  else
    v_from_family := v_link.partner_family_id;   v_from_name := v_link.partner_name;
    v_to_user := v_link.requester_id;            v_to_family := v_link.requester_family_id;
  end if;

  insert into public.calendar_proposals
    (link_id, from_user_id, from_family_id, from_name, to_user_id, to_family_id,
     title, starts_at, end_time, notes, color, message)
  values (p_link_id, v_uid, v_from_family, v_from_name, v_to_user, v_to_family,
     p_title, p_starts_at, p_end_time, p_notes, p_color, p_message)
  returning * into v_row;

  return jsonb_build_object('id', v_row.id);
end; $$;
grant execute on function public.create_calendar_proposal(uuid, text, timestamptz, text, text, text, text) to authenticated;

-- ------------------------------------------------------------------ respond (to-user confirms/declines)
create or replace function public.respond_calendar_proposal(p_id uuid, p_decision text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_p public.calendar_proposals; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select * into v_p from public.calendar_proposals
    where id = p_id and to_user_id = v_uid and status = 'pending' for update;
  if not found then raise exception 'Proposal not found or already answered'; end if;

  if p_decision = 'confirm' then
    -- Write the shared event into BOTH families' calendars.
    insert into public.events (family_id, title, notes, starts_at, owner_user_id, created_by)
    values (v_p.from_family_id, v_p.title, v_p.notes, v_p.starts_at, v_p.from_user_id, v_p.from_user_id);
    insert into public.events (family_id, title, notes, starts_at, owner_user_id, created_by)
    values (v_p.to_family_id, v_p.title, v_p.notes, v_p.starts_at, v_p.to_user_id, v_p.to_user_id);
    update public.calendar_proposals set status = 'confirmed', responded_at = now() where id = p_id;
  elsif p_decision = 'decline' then
    update public.calendar_proposals set status = 'declined', responded_at = now() where id = p_id;
  else
    raise exception 'Unknown decision';
  end if;

  return jsonb_build_object('id', v_p.id, 'status', p_decision);
end; $$;
grant execute on function public.respond_calendar_proposal(uuid, text) to authenticated;

-- ------------------------------------------------------------------ cancel a pending proposal (from-user)
create or replace function public.cancel_calendar_proposal(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.calendar_proposals set status = 'cancelled'
    where id = p_id and from_user_id = auth.uid() and status = 'pending';
end; $$;
grant execute on function public.cancel_calendar_proposal(uuid) to authenticated;
