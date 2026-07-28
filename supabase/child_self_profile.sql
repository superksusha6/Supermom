-- Let a connected child manage their OWN profile: set a photo and write an "about me".
-- They can only touch their own child_profiles row; parents keep full control.
-- Safe to re-run.

alter table public.child_profiles add column if not exists about text;

drop policy if exists "child_profiles_update_own" on public.child_profiles;
create policy "child_profiles_update_own" on public.child_profiles
  for update using (
    public.is_child_of(family_id) and id = public.my_child_profile_id(family_id)
  ) with check (
    public.is_child_of(family_id) and id = public.my_child_profile_id(family_id)
  );
