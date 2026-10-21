import { boot } from '../main.js';
import '../../styles/home.css';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { finePointer, gsap, reduceMotion, ScrollTrigger } from '../core/motion.js';
import { $, $$, esc } from '../core/ui.js';
import { formatPrice, t, ui } from '../core/i18n.js';
import { byId, COLORWAYS, FABRICS, LOOKS, PRODUCTS, STATEMENTS } from '../data.js';
import { createGauge } from '../components/gauge.js';
import { createOutfit } from '../components/outfit.js';

gsap.registerPlugin(Draggable, InertiaPlugin);

/* ------------------------------------------------------------------ hero */
function burstPoints(spikes = 15, seed = 7) {
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const pts = [];
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? 66 + rnd() * 8 : 92 + rnd() * 16;
    pts.push(`${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(' ');
}

function setupHero() {
  const hero = $('[data-hero]');
  const burst = $('[data-hero-burst]', hero);
  burst.querySelector('polygon').setAttribute('points', burstPoints());
  if (reduceMotion) return;
  gsap.to(burst, { rotate: 360, duration: 140, repeat: -1, ease: 'none', transformOrigin: '50% 50%' });

  // Scroll: models rise slower than the page, title drifts and shrinks.
  gsap.to($('[data-hero-models]', hero), { yPercent: -10, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to($('.hero-copy', hero), { yPercent: 30, scale: 0.92, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });

  if (finePointer) {
    const layers = [
      [$('.hero-dots', hero), 26],
      [burst, 16],
      [$('[data-hero-models] img', hero), -12],
      [$('[data-hero-sticker]', hero), -22],
    ].map(([el, k]) => [gsap.quickTo(el, 'x', { duration: 1, ease: 'power3' }), gsap.quickTo(el, 'y', { duration: 1, ease: 'power3' }), k]);
    hero.addEventListener('pointermove', (e) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      layers.forEach(([qx, qy, k]) => {
        qx(nx * k);
        qy(ny * k);
      });
    });
  }
}

function heroIntro() {
  if (reduceMotion) return;
  const hero = $('[data-hero]');
  gsap
    .timeline({ defaults: { ease: 'expo.out' } })
    .from($('[data-hero-burst]', hero), { scale: 0.2, opacity: 0, duration: 1.4 }, 0)
    .from($$('[data-hero-line]', hero), { yPercent: 70, scale: 0.6, rotate: -8, opacity: 0, duration: 1.1, ease: 'back.out(1.7)', stagger: 0.12 }, 0.05)
    .from($('[data-hero-models] img', hero), { yPercent: 28, opacity: 0, duration: 1.4 }, 0.2)
    .from($$('[data-hero-fade]', hero), { y: 24, opacity: 0, duration: 1, stagger: 0.08 }, 0.55)
    .from($('[data-hero-sticker]', hero), { scale: 0, rotate: -160, duration: 1.1, ease: 'back.out(2)' }, 0.7);
}

/* ------------------------------------------------------------ statements */
function setupStatements() {
  const root = $('[data-statements]');
  const photos = $('[data-st-photos]', root);
  const list = $('[data-st-list]', root);
  const art = $('[data-st-art]', root);
  const code = $('[data-st-code]', root);
  const bar = $('[data-st-progress]', root);
  const stage = $('[data-st-stage]', root);
  const DURATION = 5.5;
  let active = 0;
  let progress;

  photos.innerHTML = STATEMENTS.map(
    (s, i) => `<img src="${s.back}" width="1000" height="1206" alt="${esc(`${s.ar} — «${s.quote.ar}»`)}" ${i ? 'loading="lazy"' : ''} decoding="async">`,
  ).join('');

  const render = () => {
    list.innerHTML = STATEMENTS.map(
      (s, i) => `
      <div class="st-item${i === active ? ' is-active' : ''}">
        <button class="st-tab" type="button" role="tab" id="st-tab-${i}" aria-selected="${i === active}" aria-controls="st-panel-${i}" data-st="${i}">
          <span class="st-num">S${s.n}</span>
          <span><span class="st-name">${esc(t({ ar: s.ar, en: s.en }))}</span><br><span class="st-en">${esc(s.en.toUpperCase())}</span></span>
          <span class="tag" style="--tag-bg:${s.methodColor}">${esc(s.method)}</span>
        </button>
        <div class="st-panel" role="tabpanel" id="st-panel-${i}" aria-labelledby="st-tab-${i}"><div><div class="st-panel-inner">
          <p class="st-quote" lang="ar">«${esc(s.quote.ar)}»</p>
          <p class="st-meta"><span>${esc(t(s.spec))}</span><span class="sw-row">${s.colors.map((c) => `<i class="sw" style="--c:${c}"></i>`).join('')}</span></p>
          <a class="btn btn--sm" href="product.html?id=hoodie-${s.n}"><span>${esc(t({ ar: 'اطلب الهودي', en: 'Get the hoodie' }))}</span><svg aria-hidden="true"><use href="#i-arrow"/></svg></a>
        </div></div></div>
      </div>`,
    ).join('');
  };

  const select = (i, user = false) => {
    active = (i + STATEMENTS.length) % STATEMENTS.length;
    const s = STATEMENTS[active];
    $$('img', photos).forEach((img, k) => img.classList.toggle('is-active', k === active));
    $$('.st-item', list).forEach((el, k) => {
      el.classList.toggle('is-active', k === active);
      el.querySelector('.st-tab').setAttribute('aria-selected', String(k === active));
    });
    code.textContent = `S${s.n}`;
    stage.dataset.href = `product.html?id=hoodie-${s.n}`;
    if (art.getAttribute('src') !== s.cut) {
      art.src = s.cut;
      art.alt = '';
      if (!reduceMotion) gsap.fromTo(art, { scale: 0.5, rotate: -18, opacity: 0 }, { scale: 1, rotate: -6, opacity: 1, duration: 0.9, ease: 'back.out(2)' });
    }
    restart(user);
  };

  const restart = (user) => {
    progress?.kill();
    if (reduceMotion) return;
    progress = gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: user ? DURATION * 1.6 : DURATION, ease: 'none', onComplete: () => select(active + 1), paused: !inView || hovering });
  };

  let inView = false;
  let hovering = false;
  ScrollTrigger.create({
    trigger: root,
    start: 'top 70%',
    end: 'bottom 30%',
    onToggle: (self) => {
      inView = self.isActive;
      if (!progress) return;
      inView && !hovering ? progress.play() : progress.pause();
    },
  });
  root.addEventListener('pointerenter', () => {
    hovering = true;
    progress?.pause();
  });
  root.addEventListener('pointerleave', () => {
    hovering = false;
    if (inView) progress?.play();
  });

  list.addEventListener('click', (e) => {
    const b = e.target.closest('[data-st]');
    if (b) select(Number(b.dataset.st), true);
  });
  list.addEventListener('keydown', (e) => {
    if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    select(active + (e.key === 'ArrowDown' ? 1 : -1), true);
    $(`#st-tab-${active}`, list).focus();
  });
  stage.addEventListener('click', () => (location.href = stage.dataset.href));
  window.addEventListener('langchange', () => {
    render();
    select(active);
  });
  render();
  select(0);
}

/* ------------------------------------------------------------------ mood */
const MOOD_ORDER = ['S05', 'S04', 'S03', 'S02', 'S06', 'S01'];

function setupMood() {
  const root = $('[data-mood]');
  const label = $('[data-mood-label]', root);
  const card = $('[data-mood-result]', root);
  let current = -1;
  let value = 90;
  const show = (v, force = false) => {
    value = v;
    const idx = Math.min(MOOD_ORDER.length - 1, Math.floor((v / 100) * MOOD_ORDER.length));
    if (idx === current && !force) return;
    current = idx;
    const s = byId(STATEMENTS, MOOD_ORDER[idx]);
    label.textContent = t(s.mood);
    card.href = `product.html?id=hoodie-${s.n}`;
    card.innerHTML = `
      <img src="${s.cut}" alt="" width="1200" height="1200" loading="lazy">
      <p class="mr-quote" lang="ar">«${esc(s.quote.ar)}»</p>
      <p class="mr-meta"><span>S${s.n} · ${esc(t({ ar: s.ar, en: s.en }))}</span><span>${esc(t({ ar: 'البسه', en: 'Wear it' }))} <svg aria-hidden="true" style="display:inline;vertical-align:-4px"><use href="#i-arrow"/></svg></span></p>`;
    if (!reduceMotion && !force) gsap.fromTo(card, { rotate: -4, scale: 0.94 }, { rotate: 0, scale: 1, duration: 0.6, ease: 'back.out(2.5)' });
  };
  const gauge = createGauge($('[data-gauge]', root), { value, onChange: (v) => show(v) });
  show(value, true);
  window.addEventListener('langchange', () => show(value, true));
  // A little wiggle when it scrolls into view, to say "drag me".
  if (!reduceMotion) {
    ScrollTrigger.create({
      trigger: root,
      start: 'top 60%',
      once: true,
      onEnter: () => {
        const o = { v: 90 };
        gsap.timeline().to(o, { v: 12, duration: 1.1, ease: 'power2.inOut', onUpdate: () => gauge.set(o.v) }).to(o, { v: 90, duration: 1.3, ease: 'elastic.out(1, 0.5)', onUpdate: () => gauge.set(o.v) });
      },
    });
  }
}

/* ----------------------------------------------------------------- looks */
function setupLooks() {
  const root = $('[data-looks]');
  const track = $('[data-looks-track]', root);
  const viewport = $('[data-looks-viewport]', root);
  const bar = $('[data-looks-progress]', root);

  const render = () => {
    track.innerHTML =
      LOOKS.map((l) => {
        const p = PRODUCTS.find((x) => x.ref === l.id);
        return `
        <article class="look-card">
          <a class="look-media" href="product.html?id=${p.id}" data-cursor="شوفها" data-cursor-en="VIEW">
            <img src="${l.imgs[0]}" alt="${esc(t({ ar: `إطلالة ${l.ar}`, en: `${l.en} look` }))}" loading="lazy" decoding="async" draggable="false">
            <span class="look-num">${l.n}</span>
          </a>
          <div class="look-names"><h3 class="look-name">${esc(t({ ar: l.ar, en: l.en }))}</h3><span class="look-en">${esc(l.en.toUpperCase())}</span></div>
          <div class="look-recipe">
            <span>${esc(t({ ar: 'الهودي', en: 'Hoodie' }))}</span><span class="sw-strip"><i style="--c:${l.hoodie}"></i></span>
            <span>${esc(t({ ar: 'الطباعة', en: 'Print' }))}</span><span class="sw-strip">${l.print.map((c) => `<i style="--c:${c}"></i>`).join('')}</span>
            <span>${esc(t({ ar: 'الشروال', en: 'Sirwal' }))}</span><span class="sw-strip">${l.sirwal.map((c) => `<i style="--c:${c}"></i>`).join('')}</span>
          </div>
          <div class="look-foot"><span class="look-price">${formatPrice(p.price)}</span><a class="btn btn--sm" href="product.html?id=${p.id}"><span>${esc(ui('shopLook'))}</span></a></div>
        </article>`;
      }).join('') +
      `<a class="look-cta-card" href="shop.html"><span class="kicker kicker--ink">DROP 001</span><strong>${esc(t({ ar: '8 إطلالات · 6 عبارات · 6 شراويل', en: '8 looks · 6 statements · 6 sirwals' }))}</strong><span class="link-arrow"><span>${esc(t({ ar: 'المتجر كامل', en: 'The full shop' }))}</span><svg aria-hidden="true"><use href="#i-arrow"/></svg></span></a>`;
  };
  render();
  window.addEventListener('langchange', () => {
    render();
    ScrollTrigger.refresh();
  });

  const mm = gsap.matchMedia();
  mm.add('(min-width: 861px) and (prefers-reduced-motion: no-preference)', () => {
    const dist = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
    const dir = () => (document.documentElement.dir === 'rtl' ? 1 : -1);
    const tween = gsap.to(track, {
      x: () => dir() * dist(),
      ease: 'none',
      scrollTrigger: {
        trigger: root,
        start: 'top top',
        end: () => `+=${dist()}`,
        pin: $('[data-looks-pin]', root),
        scrub: 0.8,
        invalidateOnRefresh: true,
        onUpdate: (self) => gsap.set(bar, { scaleX: self.progress }),
      },
    });
    return () => tween.scrollTrigger?.kill();
  });
}

/* ---------------------------------------------------------------- teaser */
function setupTeaser() {
  const host = $('[data-teaser-outfit]');
  const chips = $('[data-teaser-chips]');
  const presets = LOOKS.map((l, i) => ({ hoodie: l.hoodie, statement: STATEMENTS[i % STATEMENTS.length].id, fabric: l.fabric, colorway: l.colorway }));
  let i = 0;
  const outfit = createOutfit(host, presets[0], { label: t({ ar: 'معاينة طقم زوووط', en: 'ZOOOT outfit preview' }) });
  const renderChips = (c) => {
    const st = byId(STATEMENTS, c.statement);
    const fab = byId(FABRICS, c.fabric);
    const cw = byId(COLORWAYS, c.colorway);
    const look = LOOKS.find((l) => l.hoodie === c.hoodie);
    chips.innerHTML = [
      [c.hoodie, ui('hoodieColor'), t({ ar: look.ar, en: look.en })],
      [st.colors[1], ui('statement'), `S${st.n}`],
      [null, ui('fabric'), t({ ar: fab.ar, en: fab.en })],
      [cw.fill, ui('backLogo'), t({ ar: cw.ar, en: cw.en })],
    ]
      .map(([c2, k, v]) => `<li>${c2 ? `<i class="sw" style="--c:${c2}"></i>` : `<i class="sw" style="background:url(${fab.img}) center/cover"></i>`}<small>${esc(k)}</small> ${esc(v)}</li>`)
      .join('');
  };
  renderChips(presets[0]);
  window.addEventListener('langchange', () => renderChips(outfit.config));
  if (reduceMotion) return;
  let timer;
  ScrollTrigger.create({
    trigger: host,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => {
      clearInterval(timer);
      if (self.isActive)
        timer = setInterval(() => {
          i = (i + 1) % presets.length;
          renderChips(outfit.update(presets[i]));
          gsap.fromTo(host.querySelector('.o-logo'), { scale: 0.7 }, { scale: 1, duration: 0.7, ease: 'back.out(3)' });
        }, 2400);
    },
  });
}

/* ---------------------------------------------------------------- street */
function setupStreet() {
  const board = $('[data-board]');
  if (!board || reduceMotion) return;
  const mm = gsap.matchMedia();
  mm.add('(min-width: 761px)', () => {
    let z = 10;
    const ds = Draggable.create($$('.polaroid', board), {
      bounds: board,
      inertia: true,
      edgeResistance: 0.8,
      onPress() {
        this.target.style.zIndex = ++z;
        gsap.to(this.target, { scale: 1.06, rotate: 0, duration: 0.3 });
      },
      onRelease() {
        gsap.to(this.target, { scale: 1, rotate: gsap.utils.random(-7, 7), duration: 0.6, ease: 'back.out(2)' });
      },
    });
    gsap.from($$('.polaroid', board), { y: 120, opacity: 0, rotate: () => gsap.utils.random(-30, 30), stagger: 0.08, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: board, start: 'top 75%', once: true } });
    return () => ds.forEach((d) => d.kill());
  });
}

boot({
  setup() {
    setupHero();
    setupStatements();
    setupMood();
    setupLooks();
    setupTeaser();
    setupStreet();
  },
  intro: heroIntro,
});
