-- Owner account avatar. Was stored only in the browser (localStorage), so it "slipped"
-- in private windows / other browsers / other devices. Persist it on the profile row.
-- Safe to re-run.
alter table public.profiles add column if not exists photo_uri text;
