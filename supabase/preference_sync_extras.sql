-- Sync the remaining preferences that were localStorage-only, so they survive a new
-- device / browser / cache clear: notification settings and the opt-in module toggles.
-- Client degrades gracefully (retries without these columns) if this isn't applied yet.

alter table public.user_preferences add column if not exists meds_enabled boolean;
alter table public.user_preferences add column if not exists habits_enabled boolean;
alter table public.user_preferences add column if not exists habit_reminders_enabled boolean;
alter table public.user_preferences add column if not exists quiet_hours_enabled boolean;
alter table public.user_preferences add column if not exists quiet_hours_start text;
alter table public.user_preferences add column if not exists quiet_hours_end text;
alter table public.user_preferences add column if not exists event_reminders_enabled boolean;
alter table public.user_preferences add column if not exists event_reminder_lead text;
