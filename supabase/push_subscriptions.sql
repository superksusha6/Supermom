-- Web Push subscriptions — one row per device/browser that opted in.
-- Each user manages only their own rows (RLS). The notify-partner edge function
-- reads across users with the service role to deliver a push to the recipient.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
grant select, insert, update, delete on table public.push_subscriptions to authenticated;

drop policy if exists "push_subscriptions_own" on public.push_subscriptions;
create policy "push_subscriptions_own" on public.push_subscriptions
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
