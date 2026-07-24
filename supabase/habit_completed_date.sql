-- Habits: persist WHICH DAY a habit was last ticked.
--
-- Without this column the client could only store "completed_today", so on every
-- load the app re-derived "completed today?" from a date it never had, decided the
-- answer was no, and wrote that back — which is why ticks did not survive moving
-- between devices and streaks stopped advancing.

alter table public.habit_entries add column if not exists completed_date date;
