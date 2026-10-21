import { MODE } from './config.js';

let impl = null;

/** Lazily load the active backend (demo or Supabase) — keeps it out of the first paint. */
export const backend = () => (impl ||= MODE === 'supabase' ? import('./supabase.js') : import('./local.js'));

export { MODE };
