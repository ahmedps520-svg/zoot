/**
 * Delivery app backend on Supabase. Couriers have their own sign-in and only
 * reach orders through the courier_* RPCs (see the couriers migration).
 */
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from './config.js';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'zooot-courier-auth' },
});

export const mode = 'supabase';

function fail(error) {
  if (error) throw Object.assign(new Error(error.message || String(error)), { cause: error });
}
const me = async (patch = {}) => {
  const { data, error } = await sb.rpc('courier_me', { p_name: patch.name || null, p_phone: patch.phone || null });
  fail(error);
  return { ...data, id: data.user_id };
};

export const auth = {
  async signIn(email, password) {
    const { error } = await sb.auth.signInWithPassword({ email: String(email).trim(), password });
    if (error) throw new Error(error.status === 400 ? 'invalid_credentials' : error.message);
    const { data: ok } = await sb.rpc('is_courier');
    if (!ok) {
      await sb.auth.signOut();
      throw new Error('not_courier');
    }
    return me();
  },
  async signOut() {
    await sb.auth.signOut();
  },
  async session() {
    const { data } = await sb.auth.getSession();
    if (!data.session) return null;
    const { data: ok } = await sb.rpc('is_courier');
    return ok ? me() : null;
  },
};

export { me };

export async function orders() {
  const { data, error } = await sb.rpc('courier_orders');
  fail(error);
  return data || [];
}

export async function act(orderId, action, { eta = null, text = null, collected = null } = {}) {
  const { data, error } = await sb.rpc('courier_action', { p_order: orderId, p_action: action, p_eta: eta, p_text: text, p_collected: collected });
  fail(error);
  // Let the customer know by email when the owner has status emails on (sent server-side).
  if (action === 'start' || action === 'delivered') sb.functions.invoke('admin-email', { body: { action: 'status', order_id: orderId } }).catch(() => {});
  return data;
}

export async function ping({ lat, lng, accuracy = null, heading = null, speed = null }) {
  const { error } = await sb.rpc('courier_ping', { p_lat: lat, p_lng: lng, p_accuracy: accuracy, p_heading: heading, p_speed: speed });
  fail(error);
}

/** Couriers can't subscribe to order tables (RLS) — the app polls instead. */
export function live() {
  return () => {};
}
