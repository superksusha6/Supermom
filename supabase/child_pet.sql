-- The child's virtual pet (tamagotchi). Lives on their profile row.
-- pet_type: which monster they chose. pet_fed: total fruits ever fed = growth/size.
-- pet_fed_today / pet_fed_date: cap daily feeding to fruits earned that day.
-- Age (months) is derived from child_profiles.created_at on the client.
-- Safe to re-run. A child can already UPDATE their own profile row (child_profiles_update_own).
alter table public.child_profiles
  add column if not exists pet_type text,
  add column if not exists pet_fed integer not null default 0,
  add column if not exists pet_fed_today integer not null default 0,
  add column if not exists pet_fed_date date;
