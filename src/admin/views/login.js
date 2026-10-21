import { errorText, esc, icon, L, lang, setLang } from '../ui.js';

/** Owner sign-in. No credentials are ever printed on this page. */
export function renderLogin(root, { mode, onSignIn }) {
  root.className = '';
  root.removeAttribute('aria-busy');
  root.innerHTML = `
    <div class="login">
      <section class="login-art" aria-hidden="true">
        <svg class="logo"><use href="#zooot-logo"/></svg>
        <div>
          <span class="hq-pill">HQ</span>
          <h1 style="margin-top:14px">${esc(L('كل طلب، كل ريال، كل قطعة — في مكان واحد.', 'Every order, every riyal, every piece — in one place.'))}</h1>
        </div>
        <p style="opacity:.6;font-size:13px">${esc(L('لوحة تحكم أصحاب زوووط', 'ZOOOT owners’ dashboard'))}</p>
      </section>
      <div class="login-form-wrap">
        <form class="login-card" novalidate>
          <div class="spread">
            <h2>${esc(L('تسجيل الدخول', 'Sign in'))}</h2>
            <button class="b b-sm b-ghost" type="button" data-lang>${icon('globe')}${lang === 'en' ? 'عربي' : 'English'}</button>
          </div>
          <p class="muted" style="margin-top:-8px">${esc(L('هذي اللوحة للمالكين فقط.', 'This dashboard is for the owners only.'))}</p>
          <label class="f"><span>${esc(L('البريد الإلكتروني', 'Email'))}</span>
            <input type="email" name="email" autocomplete="username" inputmode="email" dir="ltr" required></label>
          <div class="f"><label for="pw">${esc(L('كلمة المرور', 'Password'))}</label>
            <div class="pw-wrap">
              <input id="pw" type="password" name="password" autocomplete="current-password" dir="ltr" required>
              <button class="b b-ghost b-sm b-icon pw-toggle" type="button" aria-label="${esc(L('إظهار كلمة المرور', 'Show password'))}" aria-pressed="false">${icon('eye')}</button>
            </div>
          </div>
          <label class="check"><input type="checkbox" name="remember" checked>${esc(L('تذكّرني على هذا الجهاز ٣٠ يوم', 'Keep me signed in on this device for 30 days'))}</label>
          <div class="login-err" role="alert" aria-live="assertive"></div>
          <button class="b b-primary" type="submit" style="min-height:48px">${icon('lock')}${esc(L('دخول', 'Sign in'))}</button>
          ${
            mode === 'demo'
              ? `<div class="mode-note">${icon('lock')}<span>${esc(
                  L(
                    'وضع تجريبي: الدخول يحمي اللوحة من الزوار العاديين فقط، والبيانات محفوظة في هذا المتصفح. للحماية الحقيقية اربط Supabase (التعليمات في README).',
                    'Demo mode: this sign-in only keeps casual visitors out, and data stays in this browser. Connect Supabase for real protection (see README).',
                  ),
                )}</span></div>`
              : ''
          }
          <a class="muted" href="../index.html" style="font-size:13px;justify-self:center">${esc(L('← رجوع للمتجر', '← Back to the store'))}</a>
        </form>
      </div>
    </div>`;

  const form = root.querySelector('form');
  const err = root.querySelector('.login-err');
  const submit = form.querySelector('[type=submit]');
  const pw = form.querySelector('#pw');
  form.email.focus();

  root.querySelector('[data-lang]').onclick = () => {
    setLang(lang === 'en' ? 'ar' : 'en');
    renderLogin(root, { mode, onSignIn });
  };
  root.querySelector('.pw-toggle').onclick = (e) => {
    const b = e.currentTarget;
    const show = pw.type === 'password';
    pw.type = show ? 'text' : 'password';
    b.setAttribute('aria-pressed', String(show));
    b.innerHTML = icon(show ? 'eyeoff' : 'eye');
  };

  let timer;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    const email = form.email.value.trim();
    const password = pw.value;
    if (!email || !password) {
      err.textContent = L('اكتب البريد وكلمة المرور', 'Enter your email and password');
      return;
    }
    submit.classList.add('is-busy');
    try {
      await onSignIn(email, password, form.remember.checked);
    } catch (ex) {
      submit.classList.remove('is-busy');
      pw.select();
      if (ex.message === 'too_many_attempts' && ex.retryIn) {
        let left = ex.retryIn;
        submit.disabled = true;
        const tick = () => {
          err.textContent = L(`محاولات كثيرة — جرّب بعد ${left} ثانية`, `Too many attempts — try again in ${left}s`);
          if (left-- <= 0) {
            clearInterval(timer);
            submit.disabled = false;
            err.textContent = '';
          }
        };
        clearInterval(timer);
        tick();
        timer = setInterval(tick, 1000);
      } else {
        err.textContent = errorText(ex);
      }
    }
  });
}
