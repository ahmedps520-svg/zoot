// Owner-only email actions from the dashboard: status updates, personal
// messages, newsletter campaigns and a configuration check.
import { callerClient, corsHeaders, getSettings, json, loadOrder, serviceClient, SITE_URL, socials } from '../_shared/env.ts';
import { resendConfigured, sendBatch, sendMail } from '../_shared/mail.ts';
import { campaignEmail, customMessageEmail, statusUpdateEmail } from '../_shared/email-templates.js';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // Only signed-in owners (rows in public.admins) get past this point — plus
  // couriers, who may trigger the status email for an order they're delivering.
  const caller = callerClient(req);
  const { data: auth } = await caller.auth.getUser();
  const { data: isAdmin } = await caller.rpc('is_admin');
  const { data: isCourier } = isAdmin ? { data: false } : await caller.rpc('is_courier');
  if (!auth?.user || (!isAdmin && !isCourier)) return json({ error: 'forbidden' }, 403);

  let input: Record<string, string | boolean | undefined>;
  try {
    input = await req.json();
  } catch {
    return json({ error: 'bad_json' }, 400);
  }
  const db = serviceClient();
  const settings = await getSettings(db);
  const base = { siteUrl: SITE_URL, socials: socials(settings) };
  const actor = auth.user.email ?? 'owner';

  switch (input.action) {
    case 'ping':
      if (!isAdmin) return json({ error: 'forbidden' }, 403);
      return json({
        resend: resendConfigured(),
        from: Deno.env.get('MAIL_FROM') ?? 'ZOOOT <onboarding@resend.dev>',
        push: Boolean(Deno.env.get('VAPID_PRIVATE_KEY')),
      });

    case 'status':
    case 'custom': {
      const order = await loadOrder(db, String(input.order_id));
      if (!isAdmin) {
        // Couriers: status emails only, only for their own delivery, only if the owner enabled them.
        if (input.action !== 'status' || order.courier_id !== auth.user.id) return json({ error: 'forbidden' }, 403);
        if (settings.notifications?.status_emails === false) return json({ status: 'skipped' });
      }
      if (!order.customer_email) return json({ error: 'no_email' }, 400);
      const mail =
        input.action === 'status'
          ? statusUpdateEmail({ order, ...base })
          : customMessageEmail({ order, subject: String(input.subject ?? ''), message: String(input.message ?? ''), ...base });
      const r = await sendMail(db, { to: order.customer_email, ...mail, template: input.action === 'status' ? `status_${order.status}` : 'custom', order_id: order.id });
      await db.from('order_events').insert({ order_id: order.id, type: 'email', data: { subject: mail.subject, status: r.status }, actor });
      return json(r, r.status === 'failed' ? 502 : 200);
    }

    case 'campaign': {
      if (!isAdmin) return json({ error: 'forbidden' }, 403);
      const content = {
        subject: String(input.subject ?? ''),
        heading: String(input.heading ?? ''),
        body: String(input.body ?? ''),
        ctaLabel: String(input.cta_label ?? ''),
        ctaUrl: String(input.cta_url ?? ''),
        image: String(input.image ?? ''),
      };
      if (!content.subject || !content.body) return json({ error: 'missing_content' }, 400);
      if (input.test) {
        const mail = campaignEmail({ ...content, lang: input.lang === 'en' ? 'en' : 'ar', ...base });
        return json(await sendMail(db, { to: auth.user.email!, ...mail, template: 'campaign_test' }));
      }
      const { data: subs } = await db.from('subscribers').select('email, lang, token').eq('status', 'subscribed');
      const mails = (subs ?? []).map((s) => {
        const unsubscribeUrl = `${SITE_URL}/track.html?unsubscribe=${s.token}`;
        const mail = campaignEmail({ ...content, lang: s.lang, unsubscribeUrl, ...base });
        return { to: s.email, ...mail, template: 'campaign', headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` } };
      });
      return json(await sendBatch(db, mails));
    }

    default:
      return json({ error: 'unknown_action' }, 400);
  }
});
