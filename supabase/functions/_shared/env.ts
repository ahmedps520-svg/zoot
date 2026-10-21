import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

export const SITE_URL = (Deno.env.get('SITE_URL') ?? 'https://ahmedps520-svg.github.io/zoot').replace(/\/$/, '');

/** Service-role client: bypasses RLS — only ever used server-side. */
export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Client acting as the caller (their JWT), so RLS and is_admin() apply. */
export function callerClient(req: Request): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getSettings(db: SupabaseClient) {
  const { data } = await db.from('settings').select('key, value');
  const out: Record<string, Record<string, unknown>> = { public: {}, notifications: {} };
  for (const row of data ?? []) out[row.key] = row.value ?? {};
  return out;
}

export async function loadOrder(db: SupabaseClient, id: string) {
  const { data, error } = await db.from('orders').select('*, items:order_items(*)').eq('id', id).single();
  if (error) throw error;
  return data;
}

export function socials(settings: Record<string, Record<string, unknown>>) {
  const pub = settings.public ?? {};
  return { instagram: (pub.instagram as string) || undefined, tiktok: (pub.tiktok as string) || undefined };
}
