-- Live sync for calorie-diary data: publish nutrition_entries + custom_nutrition_foods
-- so a change on one device (phone/computer) pushes to the other within ~1s instead of
-- waiting for the 15s polling fallback. Same pattern as realtime.sql.

alter publication supabase_realtime add table
  public.nutrition_entries,
  public.custom_nutrition_foods;

alter table public.nutrition_entries replica identity full;
alter table public.custom_nutrition_foods replica identity full;
