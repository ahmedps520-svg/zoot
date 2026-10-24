import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

/**
 * Phone / desktop notifications for the owners (the dashboard PWA registers the
 * subscription). Optional: does nothing until VAPID keys are set as secrets.
 */
export async function notifyOwners(db: SupabaseClient, payload: { title: string; body: string; url: string; tag?: string }) {
  const pub = Deno.env.get('VAPID_PUBLIC_KEY');
  const priv = Deno.env.get('VAPID_PRIVATE_KEY');
  if (!pub || !priv) return { sent: 0, skipped: true };
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:owner@zooot.shop', pub, priv);
  const { data } = await db.from('push_subscriptions').select('endpoint, keys');
  let sent = 0;
  await Promise.allSettled(
    (data ?? []).map(async (s: { endpoint: string; keys: { p256dh: string; auth: string } }) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(payload), { TTL: 3600 });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
      }
    }),
  );
  return { sent };
}
