/**
 * Storefront-side backend: only the public calls (catalogue, checkout, newsletter,
 * order tracking). In Supabase mode it talks to the REST/RPC/function endpoints
 * with plain fetch so shoppers never download the full supabase-js client.
 */
import { MODE, SUPABASE_KEY, SUPABASE_URL } from './config.js';

const headers = () => ({
  apikey: SUPABASE_KEY,
  // Legacy anon keys are JWTs; new publishable keys go in `apikey` only.
  ...(SUPABASE_KEY.startsWith('eyJ') ? { Authorization: `Bearer ${SUPABASE_KEY}` } : {}),
  'Content-Type': 'application/json',
});

async function rest(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, { ...init, headers: { ...headers(), ...init.headers } });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.message || body?.error || `http_${res.status}`);
  return body;
}
const rpc = (name, args) => rest(`/rest/v1/rpc/${name}`, { method: 'POST', body: JSON.stringify(args) });

/** Edge function call; null when it isn't deployed (or unreachable) so callers fall back to RPC. */
async function fn(name, body) {
  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  } catch {
    return null;
  }
  if (res.status === 404) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (!data?.error) return null;
    throw new Error(data.error);
  }
  return data;
}

const remote = {
  mode: 'supabase',
  catalog: () => rest('/rest/v1/products?select=*&active=eq.true&order=sort'),
  publicSettings: async () => (await rest('/rest/v1/settings?select=value&key=eq.public'))[0]?.value || {},
  placeOrder: async (payload) => (await fn('place-order', payload)) || rpc('create_order', { p: payload }),
  subscribe: async ({ email, lang = 'ar', source = 'footer' }) => (await fn('subscribe', { email, lang, source })) || rpc('subscribe', { p_email: email, p_lang: lang, p_source: source }),
  trackOrder: (orderNo, phone) => rpc('track_order', { p_order_no: orderNo, p_phone: phone }),
  unsubscribe: (token) => rpc('unsubscribe', { p_token: token }),
  onChange: () => () => {},
};

let demo;
export const publicApi = async () => (MODE === 'supabase' ? remote : (demo ||= import('./local.js')));
export { MODE };
