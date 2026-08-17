-- Weekly menu rotation for the family meal plan.
-- Lets the family cycle several named menus by week (e.g. Menu 1 / Menu 2 alternating,
-- or 4 menus across a month). Family-shared, so it lives on weekly_meal_plans.
-- Shape: { "enabled": bool, "order": ["profileKey", ...], "anchorWeekKey": "YYYY-MM-DD", "mode": "continuous"|"monthly" }

alter table public.weekly_meal_plans
  add column if not exists rotation_json jsonb not null default '{}'::jsonb;
