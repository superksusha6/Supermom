alter table public.user_preferences add column if not exists nutrition_goal text;
alter table public.user_preferences add column if not exists activity_level text;
alter table public.user_preferences add column if not exists nutrition_sex text;
alter table public.user_preferences add column if not exists desired_weight text;
alter table public.user_preferences add column if not exists nutrition_pace text;
alter table public.user_preferences add column if not exists calorie_override text;
