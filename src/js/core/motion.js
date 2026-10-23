import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };
export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export let lenis = null;

export function initSmoothScroll() {
  if (reduceMotion) return null;
  lenis = new Lenis({ duration: 1.1, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.4 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  // Anchor links scroll smoothly through Lenis.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"], a[href*=".html#"]');
    if (!a) return;
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    const target = document.querySelector(decodeURIComponent(url.hash));
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -80, duration: 1.4 });
    history.replaceState(null, '', url.hash);
  });
  return lenis;
}

export const lockScroll = (on) => {
  if (lenis) on ? lenis.stop() : lenis.start();
  document.documentElement.style.overflow = on ? 'hidden' : '';
};

/* ----------------------------------------------------------- text splitting
   Arabic letters join, so we only ever split on WORDS (never characters).
   Each word is wrapped in a mask so it can slide up into view. */
export function splitWords(el) {
  if (el.dataset.splitDone) return [...el.querySelectorAll('.split-word')];
  const words = [];
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 3) {
        const parts = child.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach((p) => {
          if (!p) return;
          if (/^\s+$/.test(p)) {
            frag.append(document.createTextNode(' '));
            return;
          }
          const mask = document.createElement('span');
          mask.className = 'split-line';
          mask.style.display = 'inline-block';
          const w = document.createElement('span');
          w.className = 'split-word';
          w.textContent = p;
          mask.append(w);
          frag.append(mask);
          words.push(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1 && child.tagName !== 'BR' && !child.matches('svg, img')) {
        walk(child);
      }
    });
  };
  walk(el);
  el.dataset.splitDone = '1';
  return words;
}

/* Re-split after a language switch (innerHTML was replaced). */
export function resplit(root = document) {
  root.querySelectorAll('[data-split]').forEach((el) => {
    delete el.dataset.splitDone;
    splitWords(el).forEach((w) => gsap.set(w, { yPercent: 0 }));
  });
  root.querySelectorAll('[data-scrub-words]').forEach((el) => {
    scrubTweens.get(el)?.scrollTrigger?.kill();
    scrubTweens.get(el)?.kill();
    delete el.dataset.splitDone;
    if (!reduceMotion) scrubWords(el);
  });
}

const scrubTweens = new Map();
function scrubWords(el) {
  const words = splitWords(el);
  scrubTweens.set(
    el,
    gsap.fromTo(
      words,
      { opacity: 0.14 },
      { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true } },
    ),
  );
}

export function initReveals(root = document) {
  if (reduceMotion) return;

  root.querySelectorAll('[data-split]').forEach((el) => {
    const words = splitWords(el);
    gsap.from(words, {
      yPercent: 115,
      rotate: 4,
      duration: 1.15,
      ease: 'expo.out',
      stagger: 0.05,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });

  root.querySelectorAll('[data-reveal]').forEach((el) => {
    const type = el.dataset.reveal;
    const st = { trigger: el, start: 'top 88%', once: true };
    if (type === 'stagger') {
      gsap.from(el.children, { y: 50, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.08, scrollTrigger: st });
    } else if (type === 'clip') {
      const img = el.querySelector('img');
      gsap.fromTo(el, { clipPath: 'inset(100% 0% 0% 0% round 24px)' }, { clipPath: 'inset(0% 0% 0% 0% round 24px)', duration: 1.4, ease: 'expo.out', scrollTrigger: st });
      if (img) gsap.from(img, { scale: 1.35, duration: 1.8, ease: 'expo.out', scrollTrigger: st });
    } else if (type === 'pop') {
      gsap.from(el, { scale: 0.4, rotate: -12, opacity: 0, duration: 1, ease: 'back.out(2)', scrollTrigger: st });
    } else if (type === 'fade') {
      gsap.from(el, { opacity: 0, duration: 1.2, ease: 'power2.out', scrollTrigger: st });
    } else {
      gsap.from(el, { y: 46, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: st });
    }
  });

  root.querySelectorAll('[data-parallax]').forEach((el) => {
    const speed = parseFloat(el.dataset.parallax) || 0.2;
    gsap.fromTo(
      el,
      { yPercent: -speed * 50 },
      { yPercent: speed * 50, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } },
    );
  });

  root.querySelectorAll('[data-count]').forEach((el) => {
    const end = parseInt(el.dataset.count, 10);
    const pad = el.dataset.pad ? parseInt(el.dataset.pad, 10) : 0;
    const obj = { v: 0 };
    gsap.to(obj, {
      v: end,
      duration: 1.6,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => (el.textContent = String(Math.round(obj.v)).padStart(pad, '0')),
    });
  });

  // Words light up as you read (manifesto blocks).
  root.querySelectorAll('[data-scrub-words]').forEach(scrubWords);
}

/* --------------------------------------------------------------- marquees */
export function initMarquees(root = document) {
  root.querySelectorAll('.marquee').forEach((m) => {
    const track = m.querySelector('.marquee-track');
    if (!track || track.dataset.ready) return;
    track.dataset.ready = '1';
    // Fill at least 2 × viewport, then duplicate for a seamless -50% loop.
    const base = track.innerHTML;
    let guard = 0;
    while (track.scrollWidth < window.innerWidth * 1.2 && guard++ < 8) track.insertAdjacentHTML('beforeend', base);
    track.insertAdjacentHTML('beforeend', track.innerHTML);
    track.style.animation = 'none';
    if (reduceMotion) return;
    const reverse = m.classList.contains('marquee--reverse');
    const dur = parseFloat(getComputedStyle(m).getPropertyValue('--speed')) || 38;
    const tween = gsap.fromTo(track, { xPercent: reverse ? -50 : 0 }, { xPercent: reverse ? 0 : -50, duration: dur, ease: 'none', repeat: -1 });
    if (lenis) {
      lenis.on('scroll', ({ velocity }) => {
        const boost = 1 + Math.min(Math.abs(velocity) * 0.12, 5);
        gsap.to(tween, { timeScale: velocity < 0 ? -boost : boost, duration: 0.3, overwrite: true });
      });
    }
  });
}

/* ------------------------------------------------------------- magnetic */
export function initMagnetic(root = document) {
  if (!finePointer || reduceMotion) return;
  root.querySelectorAll('[data-magnetic]').forEach((el) => {
    if (el.dataset.magReady) return;
    el.dataset.magReady = '1';
    const strength = parseFloat(el.dataset.magnetic) || 0.3;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    });
    el.addEventListener('pointerleave', () => {
      xTo(0);
      yTo(0);
    });
  });
}

/* ---------------------------------------------------------------- cursor */
export function initCursor() {
  if (!finePointer || reduceMotion) return;
  const c = document.createElement('div');
  c.className = 'cursor is-hidden';
  c.innerHTML = '<div class="cursor-ring"><span></span></div><div class="cursor-dot"></div>';
  document.body.append(c);
  const ring = c.querySelector('.cursor-ring');
  const dot = c.querySelector('.cursor-dot');
  const label = ring.querySelector('span');
  const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' });
  const ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
  const dx = gsap.quickTo(dot, 'x', { duration: 0.08 });
  const dy = gsap.quickTo(dot, 'y', { duration: 0.08 });
  window.addEventListener('pointermove', (e) => {
    c.classList.remove('is-hidden');
    rx(e.clientX);
    ry(e.clientY);
    dx(e.clientX);
    dy(e.clientY);
  });
  document.addEventListener('pointerleave', () => c.classList.add('is-hidden'));
  document.addEventListener('pointerover', (e) => {
    const lab = e.target.closest('[data-cursor]');
    if (lab) {
      const text = document.documentElement.lang === 'en' ? lab.dataset.cursorEn || lab.dataset.cursor : lab.dataset.cursor;
      label.textContent = text;
      c.classList.add('is-label');
      c.classList.remove('is-link');
      return;
    }
    c.classList.remove('is-label');
    c.classList.toggle('is-link', !!e.target.closest('a, button, [role="button"], label, select, input, textarea'));
  });
}

/* --------------------------------------------------- loader & transitions */
const markIntroSeen = () => {
  try {
    sessionStorage.setItem('zooot-intro', '1');
  } catch {
    /* ignore */
  }
};

export function runLoader() {
  const html = document.documentElement;
  const loader = document.querySelector('[data-loader]');
  const wipe = document.querySelector('[data-wipe]');
  const done = () => html.classList.add('wipe-done');
  // GSAP reads the CSS translateY(100%) as a pixel `y` and adds every later yPercent
  // on top of it (the wipe then parks over the page), so pin y to 0 on first touch.

  if (!html.classList.contains('is-loading') || !loader) {
    // Regular navigation: lift the yellow wipe that covers the page.
    return new Promise((resolve) => {
      if (reduceMotion || !wipe) {
        done();
        return resolve();
      }
      gsap.set(wipe, { y: 0, yPercent: 0 });
      done();
      gsap.to(wipe, { yPercent: -100, duration: 0.85, ease: 'expo.inOut', delay: 0.05, onComplete: resolve });
      setTimeout(resolve, 450); // start page intros while the wipe is still moving
    });
  }

  markIntroSeen();
  done();
  return new Promise((resolve) => {
    if (reduceMotion) {
      html.classList.remove('is-loading');
      return resolve();
    }
    const logo = loader.querySelector('[data-loader-logo]');
    const count = loader.querySelector('[data-loader-count]');
    const panels = loader.querySelectorAll('.loader-panels i');
    const n = { v: 0 };
    const tl = gsap.timeline({
      onComplete: () => {
        html.classList.remove('is-loading');
        loader.remove();
        resolve();
      },
    });
    tl.from(logo, { scale: 0.2, rotate: -14, opacity: 0, duration: 1, ease: 'back.out(2.2)' })
      .to(n, { v: 1, duration: 1.1, ease: 'power2.inOut', onUpdate: () => (count.textContent = String(Math.round(n.v)).padStart(3, '0')) }, '-=0.6')
      .to(logo, { scale: 1.08, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.inOut' })
      .to(panels, { yPercent: 0, duration: 0.7, ease: 'expo.inOut', stagger: 0.07 }, '+=0.1')
      .set(loader.querySelector('.loader-center'), { opacity: 0 })
      .set(loader, { background: 'transparent' })
      .set(loader.querySelector('.loader-dots'), { opacity: 0 })
      .add(() => resolve(), '-=0.1')
      .to(panels, { yPercent: -100, duration: 0.8, ease: 'expo.inOut', stagger: 0.07 });
    if (wipe) gsap.set(wipe, { y: 0, yPercent: 100 });
  });
}

export function initPageTransitions() {
  const wipe = document.querySelector('[data-wipe]');
  if (!wipe || reduceMotion) return;
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname)) return;
    if (url.pathname === location.pathname && url.hash) return; // in-page anchor
    if (url.href === location.href) return;
    e.preventDefault();
    gsap.fromTo(wipe, { yPercent: 100 }, { yPercent: 0, duration: 0.6, ease: 'expo.inOut', onComplete: () => (location.href = url.href) });
  });
  // Back/forward cache: make sure the wipe isn't left covering the page.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) gsap.set(wipe, { yPercent: -100 });
  });
}
