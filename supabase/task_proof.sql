-- When a staff member ticks a task done they can attach a photo of the result and a
-- short note (e.g. "couldn't do it that way, did X instead"). Both ride along on the
-- completion notification the family already receives. Photo is stored as a compressed
-- data URI in the same column, matching how the app persists other photos.

alter table public.completed_task_notifications
  add column if not exists staff_comment text,
  add column if not exists photo_url text;
