import '@fontsource-variable/kufam/wght.css';
import '@fontsource/lalezar/400.css';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/700.css';
import '@fontsource/archivo-black/400.css';
import '@fontsource-variable/archivo/wdth.css';

import '../styles/base.css';
import '../styles/components.css';

import { initUI } from './core/ui.js';
import {
  initCursor,
  initMagnetic,
  initMarquees,
  initPageTransitions,
  initReveals,
  initSmoothScroll,
  reduceMotion,
  runLoader,
  ScrollTrigger,
} from './core/motion.js';

/**
 * Boot sequence shared by every page:
 * UI + language → smooth scroll → page setup → loader/wipe out → page intro → reveals.
 */
export async function boot({ setup, intro } = {}) {
  if (!reduceMotion) document.documentElement.classList.add('motion');
  initUI();
  initSmoothScroll();
  initPageTransitions();
  const ctx = (await setup?.()) || {};
  initMarquees();
  initMagnetic();
  initCursor();
  await document.fonts?.ready;
  await runLoader();
  intro?.(ctx);
  initReveals();
  requestAnimationFrame(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh());
  // Hash links arriving from another page land after layout settles.
  if (location.hash) {
    const target = document.querySelector(decodeURIComponent(location.hash));
    if (target) setTimeout(() => target.scrollIntoView({ block: 'start' }), 60);
  }
  return ctx;
}
