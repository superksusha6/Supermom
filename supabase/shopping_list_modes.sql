alter table public.shopping_lists add column if not exists list_type text not null default 'current';
alter table public.shopping_lists add column if not exists completed_at timestamptz;
