// @ts-nocheck
// Push a staff member when the family assigns them a task.
// Caller must be an active member of the staff profile's family; the recipient is the
// user account linked to that staff profile (family_members.staff_profile_id). Sends to
// all of that user's registered devices. Nothing is sent if the staff hasn't connected
// an account or hasn't enabled push.

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

    const authHeader = req.headers.get('Authorization') || '';
    const userClient = createClient(supabaseUrl, anonKey || serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const caller = userData?.user?.id;
    if (!caller) return json({ error: 'Not authenticated.' }, 401);

    const { staffProfileId, title } = await req.json().catch(() => ({}));
    if (!staffProfileId) return json({ error: 'staffProfileId is required.' }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    // Cap how often one account can trigger staff pushes (anti-spam / abuse guard).
    const { data: allowed } = await admin.rpc('bump_rate_limit', {
      p_user: caller,
      p_bucket: 'notify-staff',
      p_limit: 120,
      p_window_seconds: 3600,
    });
    if (allowed === false) return json({ error: 'Too many requests — please slow down.' }, 429);

    // Which family does this staff profile belong to?
    const { data: profile } = await admin
      .from('staff_profiles')
      .select('family_id')
      .eq('id', staffProfileId)
      .single();
    if (!profile) return json({ error: 'Staff profile not found.' }, 404);

    // The caller must be an active member of that family.
    const { data: callerMember } = await admin
      .from('family_members')
      .select('user_id')
      .eq('family_id', profile.family_id)
      .eq('user_id', caller)
      .eq('status', 'active')
      .maybeSingle();
    if (!callerMember) return json({ error: 'Not your family.' }, 403);

    // The staff's own connected account.
    const { data: staffMember } = await admin
      .from('family_members')
      .select('user_id')
      .eq('staff_profile_id', staffProfileId)
      .eq('status', 'active')
      .maybeSingle();
    const recipientId = staffMember?.user_id;
    if (!recipientId) return json({ ok: true, sent: 0, skipped: 'staff not connected' });

    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', recipientId);
    if (!subs || subs.length === 0) return json({ ok: true, sent: 0 });

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
    const payload = JSON.stringify({
      title: '📋 New task',
      body: title || 'The family assigned you a task.',
      url: '/',
      tag: 'staff-task',
    });

    let sent = 0;
    const stale: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
