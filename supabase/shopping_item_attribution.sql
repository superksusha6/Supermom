-- Per-item attribution for shared shopping lists: who added an item and when.
-- Shown in small print under each product. Lists are already family-scoped
-- (RLS is_family_member), so wife/husband/staff share the same list; this adds
-- the "added by X · <when>" provenance the client echoes back on every save.
alter table public.shopping_list_items add column if not exists added_by_name text;
alter table public.shopping_list_items add column if not exists added_at timestamptz;
