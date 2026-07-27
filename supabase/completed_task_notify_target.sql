-- Route a "task done" notification to the parent who ASSIGNED the task, so with two
-- co-parents each is notified only about completions of their own tasks (not the
-- other's). Null on legacy rows → shown to every owner as a safe fallback.
-- Safe to re-run.
alter table public.completed_task_notifications
  add column if not exists notify_user_id uuid references auth.users(id) on delete set null;
