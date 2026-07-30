-- Let a connected child ADD a chore for themselves (e.g. "brush teeth"), while
-- DELETE stays owner-only — a child can create and tick, but only an adult can
-- remove. Safe to re-run.
--
-- Existing policies (from child_today_access.sql) already give the child:
--   * select — only their own chores
--   * update — only their own chore (to mark done)
--   * manage (all) — owners only, and is_limited_member excludes the child
-- This adds INSERT for the child, scoped to their OWN profile only. There is no
-- child DELETE policy, so removal remains an adult-only action.

drop policy if exists "chores_insert_own_child" on public.chores;
create policy "chores_insert_own_child" on public.chores
  for insert with check (
    public.is_child_of(family_id)
    and child_profile_id = public.my_child_profile_id(family_id)
  );
