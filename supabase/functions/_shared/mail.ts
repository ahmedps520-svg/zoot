import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

type Mail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  template: string;
  order_id?: string | null;
  headers?: Record<string, string>;
};

const RESEND = 'https://api.resend.com';
const from = () => Deno.env.get('MAIL_FROM') ?? 'ZOOOT <onboarding@resend.dev>';
const replyTo = () => Deno.env.get('MAIL_REPLY_TO') || undefined;
export const resendConfigured = () => Boolean(Deno.env.get('RESEND_API_KEY'));

function payload(m: Mail) {
  return { from: from(), to: [m.to], subject: m.subject, html: m.html, text: m.text, headers: m.headers, reply_to: replyTo() };
}

/** Send one email through Resend and log it. Without RESEND_API_KEY it is logged as "skipped". */
export async function sendMail(db: SupabaseClient, m: Mail) {
  let status = 'skipped';
  let provider_id: string | null = null;
  let error: string | null = null;
  const key = Deno.env.get('RESEND_API_KEY');
  if (key) {
    try {
      const res = await fetch(`${RESEND}/emails`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload(m)),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        status = 'sent';
        provider_id = body.id ?? null;
      } else {
        status = 'failed';
        error = body.message ?? `${res.status} ${res.statusText}`;
      }
    } catch (e) {
      status = 'failed';
      error = String(e);
    }
  }
  await db.from('email_log').insert({ to_email: m.to, subject: m.subject, template: m.template, status, provider_id, error, order_id: m.order_id ?? null });
  return { status, provider_id, error };
}

/** Campaigns: Resend's batch endpoint takes up to 100 emails per call. */
export async function sendBatch(db: SupabaseClient, mails: Mail[]) {
  const key = Deno.env.get('RESEND_API_KEY');
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < mails.length; i += 100) {
    const chunk = mails.slice(i, i + 100);
    let status = 'skipped';
    let error: string | null = null;
    if (key) {
      const res = await fetch(`${RESEND}/emails/batch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk.map(payload)),
      });
      status = res.ok ? 'sent' : 'failed';
      if (!res.ok) error = (await res.json().catch(() => ({}))).message ?? res.statusText;
    }
    if (status === 'sent') sent += chunk.length;
    if (status === 'failed') failed += chunk.length;
    await db.from('email_log').insert(chunk.map((m) => ({ to_email: m.to, subject: m.subject, template: m.template, status, error })));
  }
  return { sent, failed, total: mails.length };
}
