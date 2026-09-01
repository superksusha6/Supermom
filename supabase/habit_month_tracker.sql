-- Monthly habit tracker: per-day completion history + a chosen accent colour.
-- Safe to run more than once (IF NOT EXISTS). The app already works before this
-- runs (it falls back gracefully); applying it enables cross-device sync.

-- Per-day marks: { "YYYY-MM-DD": true } for done days. Missing day = not done.
ALTER TABLE public.habit_entries
  ADD COLUMN IF NOT EXISTS completions jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Chosen habit-tracker accent colour (any hex, e.g. Luminous Blue #3345e6).
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS habit_color text;
