// Web Push (real OS notifications, even when the app is closed).
//
// Flow: register /sw.js → ask permission → subscribe via the Push API with our
// VAPID public key → store the subscription in Supabase (push_subscriptions).
// The `notify-partner` edge function later reads a recipient's subscriptions and
// pushes to them. Works on Android/desktop browsers and on iOS 16.4+ when the
// site is installed to the home screen.

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY || '';
const SW_URL = '/sw.js';

export type PushState = 'unsupported' | 'default' | 'denied' | 'enabled' | 'error';

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

async function ensureRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration(SW_URL);
    if (existing) return existing;
    const reg = await navigator.serviceWorker.register(SW_URL);
    await navigator.serviceWorker.ready;
    return reg;
  } catch {
    return null;
  }
}

// Is push actually armed on THIS device/browser (permission granted + live subscription)?
export async function currentPushState(): Promise<PushState> {
  if (!isPushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_URL);
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub && Notification.permission === 'granted') return 'enabled';
    return 'default';
  } catch {
    return 'error';
  }
}

export async function enablePush(userId: string): Promise<PushState> {
  if (!isPushSupported()) return 'unsupported';
  if (!VAPID_PUBLIC_KEY) return 'error';
  let permission = Notification.permission;
  if (permission === 'default') permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'default';

  const reg = await ensureRegistration();
  if (!reg) return 'error';
  try {
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    await saveSubscription(userId, sub);
    return 'enabled';
  } catch {
    return 'error';
  }
}

export async function disablePush(): Promise<void> {
  if (!isPushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_URL);
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (!sub) return;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    if (isSupabaseConfigured && supabase) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    }
  } catch {
    /* best effort */
  }
}

async function saveSubscription(userId: string, sub: PushSubscription): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const json = sub.toJSON();
  const keys = json.keys || {};
  if (!keys.p256dh || !keys.auth) return;
  await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    },
    { onConflict: 'endpoint' },
  );
}

// Ask the edge function to push the partner about a proposal (new / confirmed / declined).
// Fire-and-forget: a failed push must never block the calendar action itself.
export async function notifyPartner(proposalId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !proposalId) return;
  try {
    await supabase.functions.invoke('notify-partner', { body: { proposalId } });
  } catch {
    /* non-fatal */
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}
