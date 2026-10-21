// Creates (or promotes) an owner account for ZOOOT HQ on your Supabase project.
//
//   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=… npm run create-admin -- owner@example.com
//
// The service-role key is a server secret: run this on your own machine, never
// commit the key or put it in the website build. You'll be asked for the password
// (or set ADMIN_PASSWORD in the environment).
import { createInterface } from 'node:readline/promises';

const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const email = (process.argv[2] || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
if (!url || !key || !email) {
  console.error('Usage: SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run create-admin -- owner@example.com');
  process.exit(1);
}

let password = process.env.ADMIN_PASSWORD || '';
if (!password) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  password = await rl.question(`Password for ${email} (min 10 chars, leave empty to keep an existing one): `);
  rl.close();
}

const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
const call = async (path, init = {}) => {
  const res = await fetch(`${url}${path}`, { ...init, headers: { ...headers, ...init.headers } });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(body?.msg || body?.message || body?.error_description || `HTTP ${res.status}`), { status: res.status, body });
  return body;
};

async function findUser() {
  for (let page = 1; page < 50; page++) {
    const { users = [] } = await call(`/auth/v1/admin/users?page=${page}&per_page=200`);
    const u = users.find((x) => x.email?.toLowerCase() === email);
    if (u || users.length < 200) return u || null;
  }
  return null;
}

let user = await findUser();
if (user) {
  if (password) {
    if (password.length < 10) throw new Error('Use at least 10 characters.');
    await call(`/auth/v1/admin/users/${user.id}`, { method: 'PUT', body: JSON.stringify({ password, email_confirm: true }) });
    console.log(`✓ Updated the password for ${email}`);
  } else console.log(`✓ Found existing user ${email}`);
} else {
  if (password.length < 10) throw new Error('Use a password of at least 10 characters.');
  user = await call('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }) });
  console.log(`✓ Created ${email}`);
}

await call('/rest/v1/admins?on_conflict=user_id', {
  method: 'POST',
  headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
  body: JSON.stringify({ user_id: user.id, email }),
});
console.log(`✓ ${email} is now an owner — sign in at <your site>/admin/`);
