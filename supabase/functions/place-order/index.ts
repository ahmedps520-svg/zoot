// Storefront checkout: validates + prices the order in the database, then emails
// the customer and alerts the owners (email + push). Public endpoint.
import { corsHeaders, getSettings, json, loadOrder, serviceClient, SITE_URL, socials } from '../_shared/env.ts';
import { sendMail } from '../_shared/mail.ts';
import { notifyOwners } from '../_shared/push.ts';
import { orderConfirmationEmail, ownerNewOrderEmail, money } from '../_shared/email-templates.js';

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void } | undefined;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let input: Record<string, unknown>;
  try {
    input = await req.json();
  } catch {
    return json({ error: 'bad_json' }, 400);
  }

  const db = serviceClient();
  // The service role is not an admin, so create_order applies customer rules:
  // server-side prices, stock checks, source = web.
  const { data, error } = await db.rpc('create_order', { p: input });
  if (error) return json({ error: error.message }, error.message.startsWith('out_of_stock') ? 409 : 400);

  // Answer the shopper as soon as the order is saved; emails and push go out in the background.
  const notify = notifyNewOrder(db, data.id).catch((e) => console.error('place-order notify', e));
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(notify);
  else await notify;

  return json({ id: data.id, order_no: data.order_no, total: data.total, subtotal: data.subtotal, shipping: data.shipping });
});

async function notifyNewOrder(db: ReturnType<typeof serviceClient>, id: string) {
  const [order, settings] = await Promise.all([loadOrder(db, id), getSettings(db)]);
  const owner = (settings.notifications.owner_email as string) || Deno.env.get('OWNER_EMAIL');
  const dashboardUrl = `${SITE_URL}/admin/#/orders/${order.order_no}`;
  const jobs: Promise<unknown>[] = [];

  if (order.customer_email) {
    const mail = orderConfirmationEmail({ order, settings: settings.public, siteUrl: SITE_URL, socials: socials(settings) });
    jobs.push(
      sendMail(db, { to: order.customer_email, ...mail, template: 'order_confirmation', order_id: order.id }).then((r) =>
        r.status === 'sent' ? db.from('orders').update({ confirmation_sent_at: new Date().toISOString() }).eq('id', order.id) : null,
      ),
    );
  }
  if (owner && settings.notifications.owner_new_order !== false) {
    const mail = ownerNewOrderEmail({ order, dashboardUrl, siteUrl: SITE_URL });
    jobs.push(sendMail(db, { to: owner, ...mail, template: 'owner_new_order', order_id: order.id }));
  }
  jobs.push(
    notifyOwners(db, {
      title: `طلب جديد ${order.order_no}`,
      body: `${order.customer_name} · ${money(order.total, 'ar')}`,
      url: dashboardUrl,
      tag: order.order_no,
    }),
  );
  await Promise.allSettled(jobs);
}
