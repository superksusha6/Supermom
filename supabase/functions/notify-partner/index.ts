// @ts-nocheck
// Sends a Web Push to a partner about a calendar proposal.
// - `pending`   proposal → notifies the recipient ("new time slot"). Caller must be the sender.
// - `confirmed`/`declined` → notifies the original sender. Caller must be the responder.
// The proposal (and thus the recipient) is re-derived server-side from the DB, so a
// client can only ever trigger the notification that legitimately belongs to it.

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:hello@famos.app';
    if (!supabaseUrl || !serviceKey || !vapidPublic || !vapidPrivate) {
      return json({ error: 'Push is not configured.' }, 500);
    }

    // Who is calling? (JWT is verified by the gateway; we read the uid from it.)
    const authHeader = req.headers.get('Authorization') || '';
    const userClient = createClient(supabaseUrl, anonKey || serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const caller = userData?.user?.id;
    if (!caller) return json({ error: 'Not authenticated.' }, 401);

    const { proposalId } = await req.json().catch(() => ({}));
    if (!proposalId) return json({ error: 'proposalId is required.' }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    // Cap how often one account can trigger partner pushes (anti-spam / abuse guard).
    const { data: allowed } = await admin.rpc('bump_rate_limit', {
      p_user: caller,
      p_bucket: 'notify-partner',
      p_limit: 120,
      p_window_seconds: 3600,
    });
    if (allowed === false) return json({ error: 'Too many requests — please slow down.' }, 429);

    const { data: proposal, error: pErr } = await admin
      .from('calendar_proposals')
      .select('id, from_user_id, from_name, to_user_id, title, starts_at, end_time, status')
      .eq('id', proposalId)
      .single();
    if (pErr || !proposal) return json({ error: 'Proposal not found.' }, 404);

    // Decide recipient + message from the proposal's authoritative state.
    let recipientId: string;
    let title: string;
    let body: string;
    const when = formatWhen(proposal.starts_at, proposal.end_time);
    const partnerName = proposal.from_name || 'Your partner';

    if (proposal.status === 'pending') {
      if (caller !== proposal.from_user_id) return json({ error: 'Not your proposal to send.' }, 403);
      recipientId = proposal.to_user_id;
      title = `📅 ${partnerName} proposed a time`;
      body = `${proposal.title} · ${when}`;
    } else if (proposal.status === 'confirmed') {
      if (caller !== proposal.to_user_id) return json({ error: 'Not your response to send.' }, 403);
      recipientId = proposal.from_user_id;
      title = '✅ Confirmed';
      body = `${proposal.title} · ${when} — added to both calendars`;
    } else if (proposal.status === 'declined') {
      if (caller !== proposal.to_user_id) return json({ error: 'Not your response to send.' }, 403);
      recipientId = proposal.from_user_id;
      title = '🚫 Declined';
      body = `${proposal.title} · ${when}`;
    } else {
      return json({ ok: true, sent: 0, skipped: 'nothing to notify' });
    }

    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', recipientId);
    if (!subs || subs.length === 0) return json({ ok: true, sent: 0 });

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
    const payload = JSON.stringify({ title, body, url: '/', tag: `proposal-${proposal.id}` });

    let sent = 0;
    const stale: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          );
          sent += 1;
        } catch (err) {
          const code = err?.statusCode;
          if (code === 404 || code === 410) stale.push(s.endpoint);
        }
      }),
    );
    if (stale.length) await admin.from('push_subscriptions').delete().in('endpoint', stale);

    return json({ ok: true, sent });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: message }, 500);
  }
});

// starts_at is stored as wall-clock time in UTC, so read it back in UTC to avoid drift.
function formatWhen(startsAt: string, endTime?: string | null): string {
  try {
    const d = new Date(startsAt);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let h = d.getUTCHours();
    const m = d.getUTCMinutes();
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12 === 0 ? 12 : h % 12;
    const clock = `${h}:${String(m).padStart(2, '0')} ${period}`;
    return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${clock}${endTime ? `–${endTime}` : ''}`;
  } catch {
    return '';
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
