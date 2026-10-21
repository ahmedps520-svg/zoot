// Newsletter sign-up from the storefront footer: stores the subscriber and sends
// the themed welcome email (only the first time). Public endpoint.
import { corsHeaders, getSettings, json, serviceClient, SITE_URL, socials } from '../_shared/env.ts';
import { sendMail } from '../_shared/mail.ts';
import { welcomeEmail } from '../_shared/email-templates.js';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let input: { email?: string; lang?: string; source?: string };
  try {
    input = await req.json();
  } catch {
    return json({ error: 'bad_json' }, 400);
  }
  const email = String(input.email ?? '').trim().toLowerCase();
  const lang = input.lang === 'en' ? 'en' : 'ar';

  const db = serviceClient();
  const { data, error } = await db.rpc('subscribe', { p_email: email, p_lang: lang, p_source: input.source ?? 'footer' });
  if (error) return json({ error: error.message }, 400);

  if (data?.is_new) {
    const { data: sub } = await db.from('subscribers').select('token').eq('email', email).single();
    const unsubscribeUrl = `${SITE_URL}/track.html?unsubscribe=${sub?.token}`;
    const settings = await getSettings(db);
    const mail = welcomeEmail({ lang, unsubscribeUrl, siteUrl: SITE_URL, socials: socials(settings) });
    await sendMail(db, {
      to: email,
      ...mail,
      template: 'welcome',
      headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` },
    });
  }
  return json({ ok: true, is_new: Boolean(data?.is_new) });
});
