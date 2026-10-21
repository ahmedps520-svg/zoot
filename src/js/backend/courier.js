import { MODE } from './config.js';

let impl;
/** The delivery app's backend: Supabase when configured, otherwise the in-browser demo. */
export const courierBackend = () => (impl ||= MODE === 'supabase' ? import('./courier-supabase.js') : import('./local.js').then((m) => m.courierApp));
export { MODE };
