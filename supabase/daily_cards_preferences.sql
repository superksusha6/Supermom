alter table public.user_preferences add column if not exists daily_card_date date;
alter table public.user_preferences add column if not exists daily_card_id text;
