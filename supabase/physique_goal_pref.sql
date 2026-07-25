-- Persist the protein-posture choice (physique_goal) so it survives a new device.
-- It was previously localStorage-only. Values: 'toned' (Balanced) or 'strong' (Higher
-- protein) — legacy values 'lean'/'athletic'/'curvy' still map into the 1.6–1.8 g/kg band.

alter table public.user_preferences add column if not exists physique_goal text;
