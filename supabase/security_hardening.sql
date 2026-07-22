-- Security hardening: per-user rate limiting for the paid (OpenAI) edge functions,
-- so an authenticated user can't spam them and run up cost. A fixed-window counter
-- keyed by (user, bucket, window). Called by edge functions with the service role.

create table if not exists public.edge_rate_limits (
  user_id uuid not null,
  bucket text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (user_id, bucket, window_start)
);

-- No client access — only the service role (edge functions) touches this.
alter table public.edge_rate_limits enable row level security;
revoke all on table public.edge_rate_limits from anon, authenticated;

-- Returns TRUE if the call is allowed (still under the limit for the current window).
create or replace function public.bump_rate_limit(
  p_user uuid,
  p_bucket text,
  p_limit int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_count int;
begin
  if p_user is null then return false; end if;
  v_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.edge_rate_limits (user_id, bucket, window_start, count)
    values (p_user, p_bucket, v_start, 1)
  on conflict (user_id, bucket, window_start)
    do update set count = edge_rate_limits.count + 1
  returning count into v_count;
  return v_count <= p_limit;
end;
$$;
-- Only the service role (used inside edge functions) may call this.
revoke all on function public.bump_rate_limit(uuid, text, int, int) from anon, authenticated;

-- Housekeeping: drop old windows so the table stays small.
create index if not exists edge_rate_limits_window_idx on public.edge_rate_limits (window_start);
