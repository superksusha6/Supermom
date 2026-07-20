-- Live sync: publish the collaborative tables so the app receives Postgres changes
-- over Realtime. RLS still applies — each client only receives rows it can SELECT.
-- The client re-queries the matching data on any change (see the realtime channel
-- in App.tsx), so we don't rely on the change payload itself.

alter publication supabase_realtime add table
  public.events,
  public.calendar_proposals,
  public.partner_links,
  public.tasks,
  public.shopping_lists,
  public.shopping_list_items,
  public.completed_task_notifications,
  public.staff_reminder_notifications;

-- Full row image so UPDATE/DELETE events carry enough for RLS to evaluate old rows.
alter table public.events replica identity full;
alter table public.calendar_proposals replica identity full;
alter table public.partner_links replica identity full;
alter table public.tasks replica identity full;
alter table public.shopping_lists replica identity full;
alter table public.shopping_list_items replica identity full;
