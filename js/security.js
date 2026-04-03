// ===== SECURITY UTILITIES =====

const RECAPTCHA_SITE_KEY = '6LcbQaQsAAAAAKE6r0wj_2X--DsEb0f15kXWE2gn';

// ── Load reCAPTCHA v3 ──
export function loadRecaptcha() {
  if (document.querySelector('script[src*="recaptcha"]')) return;
  const s = document.createElement('script');
  s.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
  s.async = true;
  document.head.appendChild(s);
}

// ── Get reCAPTCHA token ──
export function getRecaptchaToken(action = 'submit') {
  return new Promise((resolve, reject) => {
    if (!window.grecaptcha) { resolve(null); return; }
    window.grecaptcha.ready(() => {
      window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action })
        .then(resolve).catch(reject);
    });
  });
}

// ── Verify token via our API route ──
export async function verifyRecaptcha(action = 'submit') {
  try {
    const token = await getRecaptchaToken(action);
    if (!token) return true; // skip if recaptcha not loaded (dev)
    const res = await fetch('/api/verify-recaptcha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, action }),
    });
    const data = await res.json();
    return data.success;
  } catch {
    return true; // fail open — don't block users if API is down
  }
}

// ── Sanitize input (prevent XSS) ──
export function sanitize(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Honeypot check — returns true if bot detected ──
export function isBot(form) {
  const honeypot = form.querySelector('[name="website"]');
  return honeypot && honeypot.value.length > 0;
}

// ── Add honeypot field to a form ──
export function addHoneypot(form) {
  if (form.querySelector('[name="website"]')) return;
  const field = document.createElement('input');
  field.type = 'text';
  field.name = 'website';
  field.autocomplete = 'off';
  field.tabIndex = -1;
  field.style.cssText = 'position:absolute;left:-9999px;opacity:0;height:0;width:0;';
  field.setAttribute('aria-hidden', 'true');
  form.appendChild(field);
}

// ── Auto logout after inactivity (default 30 min) ──
export function initAutoLogout(logoutFn, minutes = 30) {
  let timer;
  const reset = () => {
    clearTimeout(timer);
    timer = setTimeout(logoutFn, minutes * 60 * 1000);
  };
  ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'].forEach(e => {
    document.addEventListener(e, reset, { passive: true });
  });
  reset();
}

// ── Disable console in production ──
export function disableConsoleInProd() {
  const isProd = window.location.hostname !== 'localhost' &&
                 !window.location.hostname.includes('127.0.0.1');
  if (isProd) {
    console.log = console.warn = console.error = console.info = () => {};
  }
}

// ── Client-side rate limit (per action, localStorage-backed) ──
export function clientRateLimit(key, maxAttempts = 5, windowMs = 60_000) {
  const now = Date.now();
  const stored = JSON.parse(localStorage.getItem(`rl_${key}`) || '{"count":0,"resetAt":0}');
  if (now > stored.resetAt) {
    localStorage.setItem(`rl_${key}`, JSON.stringify({ count: 1, resetAt: now + windowMs }));
    return true;
  }
  if (stored.count >= maxAttempts) return false;
  stored.count++;
  localStorage.setItem(`rl_${key}`, JSON.stringify(stored));
  return true;
}
