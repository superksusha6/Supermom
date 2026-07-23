-- Live sync, part 2: make sure every collaborative table is actually published to
-- Realtime. Idempotent — safe to re-run. Adds the medicine cabinet (created later
-- than the original realtime.sql) and fills in the replica identities that were
-- missing, so UPDATE/DELETE events carry enough for RLS to evaluate the old row.

do $$
declare
  t text;
begin
  foreach t in array array[
    'events',
    'calendar_proposals',
    'partner_links',
    'tasks',
    'shopping_lists',
    'shopping_list_items',
    'completed_task_notifications',
    'staff_reminder_notifications',
    'medicines'
  ]
  loop
    if to_regclass('public.' || t) is not null
       and not exists (
         select 1 from pg_publication_tables
         where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
       )
    then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;

    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I replica identity full', t);
    end if;
  end loop;
end $$;
