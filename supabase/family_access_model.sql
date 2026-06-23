create extension if not exists "pgcrypto";

do $$
begin
  if exists (select 1 from pg_type where typname = 'app_role')
    and not exists (
      select 1
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'app_role' and e.enumlabel = 'father'
    ) then
    alter type public.app_role add value 'father';
  end if;
end
$$;

create table if not exists public.family_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  role public.app_role not null check (role in ('child', 'staff', 'father')),
  email text,
  child_name text,
  staff_label text,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.family_members
  add column if not exists status text not null default 'active' check (status in ('active', 'invited', 'disabled'));

alter table public.family_members
  add column if not exists invite_id uuid references public.family_invites(id) on delete set null;

alter table public.family_members
  add column if not exists linked_child_profile_id uuid references public.child_profiles(id) on delete set null;

alter table public.family_invites enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.family_invites to authenticated;

drop policy if exists "family_invites_select_family_admins" on public.family_invites;
create policy "family_invites_select_family_admins" on public.family_invites
for select using (public.current_user_role(family_id)::text in ('mother', 'father', 'admin'));

drop policy if exists "family_invites_insert_family_admins" on public.family_invites;
create policy "family_invites_insert_family_admins" on public.family_invites
for insert with check (
  public.current_user_role(family_id)::text in ('mother', 'father', 'admin')
  and created_by = auth.uid()
);

drop policy if exists "family_invites_update_family_admins" on public.family_invites;
create policy "family_invites_update_family_admins" on public.family_invites
for update using (public.current_user_role(family_id)::text in ('mother', 'father', 'admin'))
with check (public.current_user_role(family_id)::text in ('mother', 'father', 'admin'));

drop policy if exists "family_invites_delete_family_admins" on public.family_invites;
create policy "family_invites_delete_family_admins" on public.family_invites
for delete using (public.current_user_role(family_id)::text in ('mother', 'father', 'admin'));
