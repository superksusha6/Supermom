-- Staff avatar: a photo column on staff_profiles + a security-definer RPC so the
-- staff member (or the family owner) can set the avatar even though staff_profiles
-- writes are otherwise admin-only under RLS. Photo is a base64 data-URI string,
-- same pattern as child photos.

alter table public.staff_profiles add column if not exists photo_uri text;

create or replace function public.set_staff_profile_photo(p_staff_profile_id text, p_photo text)
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
  -- Any active member of this family (the staff themselves, or the family owner) may set it.
  if not exists (
    select 1 from public.family_members
    where family_id = v_fam and user_id = v_uid and status = 'active'
  ) then
    raise exception 'Not your family';
  end if;
  update public.staff_profiles set photo_uri = p_photo where id = p_staff_profile_id;
end;
$$;
grant execute on function public.set_staff_profile_photo(text, text) to authenticated;
