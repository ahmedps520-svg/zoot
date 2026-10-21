import { gsap, lenis, lockScroll, reduceMotion, resplit, ScrollTrigger } from './motion.js';
import { cart } from './cart.js';
import { CONFIG } from '../data.js';
import { applyLang, formatPrice, getLang, setLang, t, ui } from './i18n.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export { $, $$, esc };

/* ----------------------------------------------------------------- header */
function initHeader() {
  const header = $('[data-header]');
  if (!header) return;
  const page = document.body.dataset.page;
  $$('[data-nav]', header).forEach((a) => {
    if (a.dataset.nav === page) a.setAttribute('aria-current', 'page');
  });
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    const menuOpen = document.body.classList.contains('menu-open');
    header.classList.toggle('is-hidden', !menuOpen && y > 160 && y > lastY + 2);
    if (y < lastY - 2 || y < 160) header.classList.remove('is-hidden');
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ------------------------------------------------------------------- menu */
function initMenu() {
  const btn = $('[data-menu-toggle]');
  const menu = $('[data-menu]');
  if (!btn || !menu) return;
  const links = $$('[data-menu-link]', menu);
  const open = () => {
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
    lockScroll(true);
    if (!reduceMotion) {
      gsap.fromTo(menu, { clipPath: 'circle(0% at 92% 4%)' }, { clipPath: 'circle(150% at 92% 4%)', duration: 0.8, ease: 'expo.inOut' });
      gsap.fromTo(links, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.06, delay: 0.25 });
    }
  };
  const close = () => {
    btn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
    lockScroll(false);
    if (reduceMotion) {
      menu.hidden = true;
      return;
    }
    gsap.to(menu, { clipPath: 'circle(0% at 92% 4%)', duration: 0.6, ease: 'expo.inOut', onComplete: () => (menu.hidden = true) });
  };
  btn.addEventListener('click', () => (btn.getAttribute('aria-expanded') === 'true' ? close() : open()));
  links.forEach((a) => a.addEventListener('click', close));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') close();
  });
}

/* ----------------------------------------------------------------- toasts */
export function toast(message, { img, action } = {}) {
  const wrap = $('[data-toasts]');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `${img ? `<img src="${esc(img)}" alt="">` : ''}<p>${esc(message)}</p>`;
  if (action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn--sm';
    b.textContent = action.label;
    b.addEventListener('click', () => {
      action.onClick();
      dismiss();
    });
    el.append(b);
  }
  wrap.append(el);
  const dismiss = () => {
    el.classList.add('is-out');
    setTimeout(() => el.remove(), 360);
  };
  setTimeout(dismiss, 4200);
}

/* ------------------------------------------------------------------- cart */
const optionText = (o) => `${t(o.label)}: ${typeof o.value === 'object' ? t(o.value) : o.value}`;

function renderCart() {
  const linesEl = $('[data-cart-lines]');
  const foot = $('[data-cart-foot]');
  const count = cart.count();
  $$('[data-cart-count]').forEach((el) => {
    const prev = el.textContent;
    el.textContent = count;
    el.classList.toggle('has-items', count > 0);
    if (prev !== String(count) && el.classList.contains('bag-count')) {
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    }
  });
  if (!linesEl) return;
  $('[data-cart-subtotal]').textContent = formatPrice(cart.subtotal());
  foot.hidden = count === 0;
  if (!count) {
    linesEl.innerHTML = `<div class="cart-empty"><svg aria-hidden="true"><use href="#zooot-logo"/></svg><p>${esc(ui('emptyBag'))}</p><a class="btn btn--sm" href="shop.html">${esc(getLang() === 'en' ? 'Shop DROP 001' : 'تسوّق DROP 001')}</a></div>`;
    return;
  }
  linesEl.innerHTML = cart.lines
    .map(
      (l) => `
    <div class="cart-line" data-key="${esc(l.key)}">
      <div class="cart-line-img${l.imgBg ? ' is-print' : ''}"${l.imgBg ? ` style="background:${esc(l.imgBg)}"` : ''}><img src="${esc(l.img)}" alt="" loading="lazy"></div>
      <div>
        <p class="cart-line-name">${esc(t(l.name))}</p>
        <div class="cart-line-opts">${(l.options || [])
          .map((o) => `<span>${o.swatch ? `<i class="sw" style="--c:${esc(o.swatch)}"></i> ` : ''}${esc(optionText(o))}</span>`)
          .join('')}</div>
      </div>
      <div class="cart-line-side">
        <span class="cart-line-price">${formatPrice(l.price * l.qty)}</span>
        <div class="qty" role="group" aria-label="${esc(ui('qty'))}">
          <button type="button" data-qty="-1" aria-label="-"><svg><use href="#i-${l.qty > 1 ? 'minus' : 'trash'}"/></svg></button>
          <output>${l.qty}</output>
          <button type="button" data-qty="1" aria-label="+"><svg><use href="#i-plus"/></svg></button>
        </div>
      </div>
    </div>`,
    )
    .join('');
}

let lastFocus = null;
export function openCart() {
  const drawer = $('[data-cart-drawer]');
  if (!drawer || !drawer.hidden) return;
  lastFocus = document.activeElement;
  drawer.hidden = false;
  lockScroll(true);
  const panel = $('.drawer-panel', drawer);
  const dir = document.documentElement.dir === 'rtl' ? -1 : 1;
  if (!reduceMotion) {
    gsap.fromTo($('.drawer-scrim', drawer), { opacity: 0 }, { opacity: 1, duration: 0.4 });
    gsap.fromTo(panel, { xPercent: dir * 110 }, { xPercent: 0, duration: 0.7, ease: 'expo.out' });
    gsap.from($$('.cart-line, .cart-empty', drawer), { x: dir * 40, opacity: 0, duration: 0.6, stagger: 0.05, delay: 0.15, ease: 'power3.out' });
  }
  panel.focus();
}
export function closeCart() {
  const drawer = $('[data-cart-drawer]');
  if (!drawer || drawer.hidden) return;
  const panel = $('.drawer-panel', drawer);
  const dir = document.documentElement.dir === 'rtl' ? -1 : 1;
  const finish = () => {
    drawer.hidden = true;
    lockScroll(false);
    lastFocus?.focus?.();
  };
  if (reduceMotion) return finish();
  gsap.to($('.drawer-scrim', drawer), { opacity: 0, duration: 0.35 });
  gsap.to(panel, { xPercent: dir * 110, duration: 0.5, ease: 'expo.in', onComplete: finish });
}

/** Add to cart + feedback. Item shape: see cart.js. */
export function addToCart(item) {
  cart.add(item);
  toast(`${ui('added')} — ${t(item.name)}`, { img: item.img, action: { label: ui('viewBag'), onClick: openCart } });
}

function initCart() {
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-cart-open]')) openCart();
    if (e.target.closest('[data-cart-close]')) closeCart();
    const q = e.target.closest('[data-qty]');
    if (q) {
      const line = q.closest('[data-key]');
      const l = cart.lines.find((x) => x.key === line.dataset.key);
      if (l) cart.setQty(l.key, l.qty + Number(q.dataset.qty));
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCart();
  });
  $('[data-cart-lines]')?.setAttribute('data-lenis-prevent', '');
  window.addEventListener('cart:change', renderCart);
  window.addEventListener('langchange', renderCart);
  renderCart();
}

/* --------------------------------------------------------------- checkout */
function validate(form) {
  let ok = true;
  $$('input, textarea', form).forEach((input) => {
    const valid = input.checkValidity();
    input.closest('.field')?.classList.toggle('is-invalid', !valid);
    input.setAttribute('aria-invalid', String(!valid));
    if (!valid) ok = false;
  });
  return ok;
}

function orderText(order) {
  const L = getLang() === 'en';
  const lines = order.lines.map((l) => `• ${t(l.name)} ×${l.qty}${l.options?.length ? ` (${l.options.map(optionText).join(' · ')})` : ''} — ${formatPrice(l.price * l.qty)}`);
  return [
    L ? `ZOOOT order ${order.no}` : `طلب زوووط ${order.no}`,
    ...lines,
    `${L ? 'Total' : 'المجموع'}: ${formatPrice(order.total)}`,
    `${L ? 'Name' : 'الاسم'}: ${order.customer.name}`,
    `${L ? 'Mobile' : 'الجوال'}: ${order.customer.phone}`,
    `${L ? 'Address' : 'العنوان'}: ${order.customer.city}${order.customer.district ? ' — ' + order.customer.district : ''} — ${order.customer.address}`,
  ].join('\n');
}

function initCheckout() {
  const dialog = $('[data-checkout]');
  if (!dialog) return;
  const form = $('[data-checkout-form]', dialog);
  const msg = $('[data-form-msg]', form);
  const stepForm = $('[data-step="form"]', dialog);
  const stepDone = $('[data-step="done"]', dialog);

  const renderSummary = () => {
    $('[data-checkout-summary]', dialog).innerHTML =
      cart.lines.map((l) => `<div><span>${esc(t(l.name))} ×${l.qty}</span><span class="num">${formatPrice(l.price * l.qty)}</span></div>`).join('') +
      `<div class="total"><span>${getLang() === 'en' ? 'Total' : 'المجموع'}</span><span class="num">${formatPrice(cart.subtotal())}</span></div>`;
  };

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-checkout-open]')) {
      if (!cart.count()) return;
      closeCart();
      stepForm.hidden = false;
      stepDone.hidden = true;
      renderSummary();
      setTimeout(() => {
        dialog.showModal();
        lockScroll(true);
      }, reduceMotion ? 0 : 420);
    }
    if (e.target.closest('[data-checkout-close]')) dialog.close();
    const flip = e.target.closest('[data-flip]');
    if (flip) flip.setAttribute('aria-pressed', String(flip.getAttribute('aria-pressed') !== 'true'));
  });
  dialog.addEventListener('close', () => lockScroll(false));
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  form.addEventListener('input', (e) => {
    const f = e.target.closest('.field');
    if (f?.classList.contains('is-invalid') && e.target.checkValidity()) f.classList.remove('is-invalid');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.classList.remove('is-error');
    if (!validate(form)) {
      msg.textContent = ui('invalid');
      msg.classList.add('is-error');
      $('[aria-invalid="true"]', form)?.focus();
      return;
    }
    const data = Object.fromEntries(new FormData(form));
    const order = {
      no: `ZT-001-${Date.now().toString(36).slice(-5).toUpperCase()}`,
      lines: cart.lines.map((l) => ({ ...l })),
      total: cart.subtotal(),
      currency: 'SAR',
      customer: data,
      lang: getLang(),
      createdAt: new Date().toISOString(),
    };
    const submit = $('button[type="submit"]', form);
    submit.classList.add('is-busy');
    msg.textContent = ui('sending');
    try {
      if (CONFIG.orderEndpoint) {
        const res = await fetch(CONFIG.orderEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(order) });
        if (!res.ok) throw new Error(String(res.status));
      }
    } catch {
      submit.classList.remove('is-busy');
      msg.textContent = getLang() === 'en' ? 'We could not send your order — please try again.' : 'ما قدرنا نرسل طلبك — جرّب مرة ثانية.';
      msg.classList.add('is-error');
      return;
    }
    submit.classList.remove('is-busy');
    msg.textContent = '';
    $('[data-order-no]', dialog).textContent = order.no;
    const wa = $('[data-whatsapp-link]', dialog);
    if (CONFIG.whatsapp) {
      wa.href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(orderText(order))}`;
      wa.hidden = false;
    } else wa.hidden = true;
    $('[data-checkout-next]', dialog).textContent = CONFIG.whatsapp
      ? getLang() === 'en'
        ? 'Tap “Confirm on WhatsApp” to send us your order and we’ll confirm delivery.'
        : 'اضغط «أكّد عبر واتساب» يوصلنا طلبك ونأكّد معك التوصيل.'
      : getLang() === 'en'
        ? 'Flip the card — the surprise that comes inside every box.'
        : 'اقلب البطاقة — هذي المفاجأة اللي تجيك داخل كل علبة.';
    try {
      localStorage.setItem('zooot-last-order', JSON.stringify(order));
    } catch {
      /* ignore */
    }
    cart.clear();
    form.reset();
    stepForm.hidden = true;
    stepDone.hidden = false;
    if (!reduceMotion) gsap.from(stepDone.children, { y: 30, opacity: 0, stagger: 0.07, duration: 0.7, ease: 'power3.out' });
    setTimeout(() => $('[data-flip]', dialog)?.setAttribute('aria-pressed', 'true'), 1400);
  });
}

/* ------------------------------------------------------------- newsletter */
function initNewsletter() {
  $$('[data-newsletter]').forEach((form) => {
    const msg = $('[data-form-msg]', form);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = $('input[type="email"]', form);
      const ok = input.checkValidity() && input.value.trim();
      form.classList.toggle('is-invalid', !ok);
      msg.classList.toggle('is-error', !ok);
      if (!ok) {
        msg.textContent = ui('emailInvalid');
        input.focus();
        return;
      }
      msg.textContent = ui('sending');
      try {
        if (CONFIG.newsletterEndpoint) {
          const res = await fetch(CONFIG.newsletterEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ email: input.value.trim() }) });
          if (!res.ok) throw new Error(String(res.status));
        }
        msg.textContent = ui('joined');
        form.reset();
        if (!reduceMotion) gsap.fromTo(msg, { scale: 0.8 }, { scale: 1, ease: 'back.out(3)', duration: 0.5 });
      } catch {
        msg.classList.add('is-error');
        msg.textContent = getLang() === 'en' ? 'Something went wrong — try again.' : 'صار خطأ — جرّب مرة ثانية.';
      }
    });
  });
}

/* --------------------------------------------------------------- language */
function initLangToggle() {
  $$('[data-lang-toggle]').forEach((b) =>
    b.addEventListener('click', () => {
      const next = getLang() === 'ar' ? 'en' : 'ar';
      const swap = () => {
        setLang(next);
        resplit();
        ScrollTrigger.refresh();
      };
      if (reduceMotion) return swap();
      const wipe = $('[data-wipe]');
      gsap
        .timeline()
        .fromTo(wipe, { yPercent: 100 }, { yPercent: 0, duration: 0.5, ease: 'expo.inOut' })
        .add(swap)
        .to(wipe, { yPercent: -100, duration: 0.6, ease: 'expo.inOut', delay: 0.1 });
    }),
  );
}

function initMisc() {
  $$('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
  $$('[data-social]').forEach((a) => {
    const url = CONFIG.socials[a.dataset.social];
    if (url) a.href = url;
  });
}

export function initUI() {
  applyLang();
  initHeader();
  initMenu();
  initCart();
  initCheckout();
  initNewsletter();
  initLangToggle();
  initMisc();
}

export { lenis };
