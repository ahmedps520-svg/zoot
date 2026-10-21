/**
 * Backend selection.
 *
 *  - "supabase": set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (the public anon /
 *    publishable key — safe in the browser; Row Level Security protects the data).
 *    Orders, payments and stock are shared, live, and protected by real owner logins.
 *  - "demo" (default): everything lives in this browser's localStorage so the
 *    dashboard can be tried before any backend exists. Tabs stay in sync live.
 */
const env = import.meta.env || {};

export const SUPABASE_URL = (env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
export const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
export const VAPID_PUBLIC_KEY = env.VITE_VAPID_PUBLIC_KEY || '';
export const MODE = SUPABASE_URL && SUPABASE_KEY ? 'supabase' : 'demo';

/**
 * Demo owner login (demo mode only — ignored once Supabase is connected).
 * Only a salted PBKDF2-SHA256 hash is stored, never the password itself.
 * This gate keeps casual visitors out of the demo; it is NOT real security —
 * real protection comes from Supabase Auth + RLS.
 */
export const DEMO_OWNER = {
  email: 'admindemo@zooot.sa',
  salt: '6be192c8db48b8be08988abb4ba4a1f9',
  iterations: 150000,
  hash: 'f06ccd4e1ff9e3c92a9b9357f87b415df82c936ceb551675c78dc25a78e61ae4',
};

/** Demo courier login(s) for the delivery app — demo mode only, hashes only. */
export const DEMO_COURIERS = [
  {
    id: 'courier-demo-1',
    email: 'courier1demo@zooot.sa',
    salt: '0edd9ea73d99392a6accecfbb0b17654',
    iterations: 150000,
    hash: '0395be12fb255ecc2b0ccba161dc0c86b9f5dc1276027d45ceba1db1a1e46e3c',
  },
];
