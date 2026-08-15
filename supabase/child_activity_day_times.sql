-- Per-day times for a child activity (e.g. Mon 9:00–12:00, Wed 15:00–17:00).
-- Previously only a single `time` + `time_slots` were stored, so distinct per-day
-- times were lost on reload. Store them as jsonb maps keyed by weekday code.
-- Safe to re-run.
alter table public.child_activities add column if not exists day_times jsonb not null default '{}'::jsonb;
alter table public.child_activities add column if not exists day_end_times jsonb not null default '{}'::jsonb;
