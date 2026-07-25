-- Free-text notes / instructions attached to a task, so the owner can describe a
-- task in detail (how to cook it, what to buy, where things are) and the assignee
-- sees it. RLS on tasks already governs who can read it. Safe to re-run.

alter table public.tasks add column if not exists details text;
