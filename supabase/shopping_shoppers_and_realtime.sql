-- "Send a shopping list to whoever buys" — support.
-- 1) list_family_shoppers: the people a list can be sent to — the OTHER co-parents
--    (owners, identified by user_id so two parents never collide on a Mom/Dad label)
--    plus connected staff who have shopping access. Security-definer so the caller can
--    read co-parent names without broad profiles access.
-- 2) Put shopping_shares in the realtime publication so a sent list lands instantly.
-- Safe to re-run.

create or replace function public.list_family_shoppers(p_family_id uuid)
returns table (kind text, target_id text, name text)
language sql
stable
security definer
set search_path = public
as $$
  -- co-parent owners (not the caller)
  select 'parent'::text, fm.user_id::text, coalesce(nullif(btrim(p.full_name), ''), 'Parent')
  from public.family_members fm
  left join public.profiles p on p.id = fm.user_id
  where fm.family_id = p_family_id
    and fm.status = 'active'
    and fm.role in ('mother', 'admin')
    and fm.user_id <> auth.uid()
    and public.is_family_member(p_family_id)
  union all
  -- connected staff who can shop
  select 'staff'::text, sp.id, sp.name
  from public.staff_profiles sp
  join public.family_members fm
    on fm.family_id = sp.family_id and fm.staff_profile_id = sp.id
   and fm.role = 'staff' and fm.status = 'active'
  where sp.family_id = p_family_id
    and coalesce(fm.features, '[]'::jsonb) ? 'shopping'
    and public.is_family_member(p_family_id);
$$;
revoke execute on function public.list_family_shoppers(uuid) from public, anon;
grant execute on function public.list_family_shoppers(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'shopping_shares'
  ) then
    alter publication supabase_realtime add table public.shopping_shares;
  end if;
end $$;
