-- A recipe can belong to several sections at once (e.g. snack + breakfast).
-- meal_type stays the primary section; meal_types_json holds the full set.
-- Safe to re-run. Backfills existing rows to [meal_type].
alter table public.recipes add column if not exists meal_types_json jsonb not null default '[]'::jsonb;

update public.recipes
   set meal_types_json = jsonb_build_array(meal_type)
 where (meal_types_json is null or jsonb_array_length(meal_types_json) = 0)
   and meal_type is not null;
