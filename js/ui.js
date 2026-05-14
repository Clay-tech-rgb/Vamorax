// ===== SVG ICONS — all have explicit width/height so they never inherit wrong sizes =====
function svg(body, w = 16, h = 16) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}
export const icons = {
  cart:     svg(`<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>`),
  search:   svg(`<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`),
  close:    svg(`<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`),
  sun:      svg(`<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`),
  moon:     svg(`<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>`),
  heart:    svg(`<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>`, 14, 14),
  download: svg(`<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>`, 14, 14),
  film:     svg(`<rect x="2" y="2" width="20" height="20" rx="2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>`, 20, 20),
  send:     svg(`<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>`, 14, 14),
  message:  svg(`<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>`),
};

// ===== TOP PROGRESS BAR — gradient black/white like Instagram =====
let progressInterval;
export function startProgress() {
  const bar = document.getElementById('top-progress');
  if (!bar) return;
  let w = 0;
  bar.style.width = '0%';
  bar.classList.add('loading');
  bar.classList.remove('done');
  progressInterval = setInterval(() => {
    w += Math.random() * 18;
    if (w > 85) w = 85;
    bar.style.width = w + '%';
  }, 120);
}
export function doneProgress() {
  const bar = document.getElementById('top-progress');
  if (!bar) return;
  clearInterval(progressInterval);
  bar.classList.add('done');
  setTimeout(() => bar.classList.remove('loading', 'done'), 700);
}

// ===== CONFIRM MODAL =====
export function showConfirm(message, onConfirm) {
  // Remove any existing modal
  document.querySelector('.confirm-modal')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'confirm-modal';
  overlay.innerHTML = `
    <div class="confirm-box">
      <p class="confirm-msg">${message}</p>
      <div class="confirm-actions">
        <button class="btn btn-ghost btn-sm confirm-cancel">Cancel</button>
        <button class="btn btn-primary btn-sm confirm-ok">Sign out</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  // Animate in
  requestAnimationFrame(() => overlay.classList.add('visible'));

  const close = () => {
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 250);
  };

  overlay.querySelector('.confirm-cancel').addEventListener('click', close);
  overlay.querySelector('.confirm-ok').addEventListener('click', () => { close(); onConfirm(); });
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
}

// ===== THEME =====
export function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}
export function toggleTheme() {
  const cur  = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';

  const apply = () => {
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon(next);
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }));
  };

  // View Transition API — smooth circular wipe (Chrome 111+)
  if (document.startViewTransition) {
    document.startViewTransition(apply);
  } else {
    // Fallback: flash transition via CSS class
    document.documentElement.classList.add('theme-transitioning');
    apply();
    setTimeout(() => document.documentElement.classList.remove('theme-transitioning'), 300);
  }
}
function updateThemeIcon(theme) {
  const btn = document.querySelector('.theme-toggle');
  if (btn) btn.innerHTML = theme === 'dark' ? icons.sun : icons.moon;
}

// ===== TOAST =====
export function showToast(message, type = 'info', duration = 3000) {
  let container = document.querySelector('.toast-container');
  if (!container) { container = document.createElement('div'); container.className = 'toast-container'; document.body.appendChild(container); }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-dot"></span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.animation = 'toastOut 0.25s ease forwards'; setTimeout(() => toast.remove(), 250); }, duration);
}

// ===== SCROLL REVEAL =====
export function initScrollReveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold: 0.08 });
  document.querySelectorAll('.fade-up, .reveal-text').forEach(el => io.observe(el));
}

// ===== SMOOTH SCROLL =====
// Menggunakan native CSS scroll-behavior — lebih smooth karena jalan di compositor thread
// Custom JS scroll (requestAnimationFrame + window.scrollTo) dihapus karena menyebabkan glitch
export function initSmoothScroll() {
  // Hanya lock scroll saat panel overlay terbuka
  function isPageScrollLocked() {
    return !!(
      document.querySelector('.cart-sidebar.open') ||
      document.querySelector('.vmx-drawer.open')
    );
  }

  function getScrollableAncestor(el, deltaY) {
    while (el && el !== document.body) {
      const oy = window.getComputedStyle(el).overflowY;
      if (oy === 'auto' || oy === 'scroll' || oy === 'overlay') {
        if (el.scrollHeight > el.clientHeight) {
          const atTop    = el.scrollTop <= 0;
          const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
          if ((deltaY < 0 && !atTop) || (deltaY > 0 && !atBottom)) return el;
        }
      }
      el = el.parentElement;
    }
    return null;
  }

  window.addEventListener('wheel', e => {
    if (isPageScrollLocked()) {
      const scrollable = getScrollableAncestor(e.target, e.deltaY);
      if (!scrollable) e.preventDefault();
    }
  }, { passive: false });
}

// ===== MOBILE NAV =====
export function initMobileNav() {
  const hamburger = document.querySelector('.hamburger');
  const nav = document.querySelector('.mobile-nav');
  const close = document.querySelector('.mobile-nav-close');
  if (!hamburger || !nav) return;
  hamburger.addEventListener('click', () => nav.classList.add('open'));
  close?.addEventListener('click', () => nav.classList.remove('open'));
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
}

// ===== HORIZONTAL SCROLL (drag) =====
export function initHorizontalScroll() {
  document.querySelectorAll('.h-scroll-wrapper').forEach(wrapper => {
    let isDown = false, startX, scrollLeft;
    wrapper.addEventListener('mousedown', e => { isDown = true; startX = e.pageX - wrapper.offsetLeft; scrollLeft = wrapper.scrollLeft; });
    wrapper.addEventListener('mouseleave', () => isDown = false);
    wrapper.addEventListener('mouseup', () => isDown = false);
    wrapper.addEventListener('mousemove', e => {
      if (!isDown) return; e.preventDefault();
      wrapper.scrollLeft = scrollLeft - (e.pageX - wrapper.offsetLeft - startX) * 1.4;
    });
  });
}

// ===== COMPARISON SLIDER =====
export function initComparisonSliders() {
  document.querySelectorAll('.comparison-slider').forEach(slider => {
    const after = slider.querySelector('.comparison-after');
    const handle = slider.querySelector('.comparison-handle');
    let dragging = false;
    const move = (clientX) => {
      const rect = slider.getBoundingClientRect();
      const pct = Math.min(Math.max((clientX - rect.left) / rect.width * 100, 0), 100);
      after.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
      handle.style.left = pct + '%';
    };
    slider.addEventListener('mousedown', () => dragging = true);
    window.addEventListener('mouseup', () => dragging = false);
    window.addEventListener('mousemove', e => { if (dragging) move(e.clientX); });
    slider.addEventListener('touchmove', e => move(e.touches[0].clientX));
  });
}

// ===== LIVE CHAT =====
export function initLiveChat() {
  const btn = document.querySelector('.live-chat-btn');
  const win = document.querySelector('.live-chat-window');
  if (!btn || !win) return;

  btn.addEventListener('click', () => win.classList.toggle('open'));

  // Prevent page scroll when wheel is inside the live chat window
  win.addEventListener('wheel', e => e.stopPropagation(), { passive: true });

  const QA = [
    { q: 'How do I get a free preset?',      a: 'Create a free account, then go to the Free Presets page and click Download.' },
    { q: 'How much is 1 preset?',            a: 'All paid presets are Rp 5.000 each. Very affordable!' },
    { q: 'How do I buy a preset?',           a: 'Go to Shop, add a preset to cart, then checkout with QRIS, GoPay, or PayPal.' },
    { q: 'How do I use the preset?',         a: 'Download the ZIP, extract it, then import into Alight Motion via Projects → Import.' },
    { q: 'Does it work on mobile?',          a: 'Yes! Alight Motion is a mobile app — all presets work on Android and iOS.' },
    { q: 'What do I get after buying?',      a: 'Instant ZIP download on the receipt page and in your dashboard anytime.' },
    { q: "What if I don't like the preset?", a: 'Try our 3 free presets first before buying. Email us at support@vamorax.com for issues.' },
    { q: 'Which preset do you recommend?',   a: 'Beginners: Cinematic Fade. TikTok: Neon Velocity. Music videos: Beat Sync Pro.' },
  ];

  const msgs = win.querySelector('.live-chat-messages');
  const quickReplies = win.querySelector('.live-chat-quick');

  function addMsg(text, type) {
    const el = document.createElement('div');
    el.className = `chat-msg ${type}`;
    el.textContent = text;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showQuickReplies() {
    if (!quickReplies) return;
    quickReplies.innerHTML = QA.map((item, i) =>
      `<button class="chat-quick-btn" data-i="${i}">${item.q}</button>`
    ).join('');
    quickReplies.querySelectorAll('.chat-quick-btn').forEach(b => {
      b.addEventListener('click', () => {
        const item = QA[+b.dataset.i];
        addMsg(item.q, 'user');
        quickReplies.innerHTML = '';
        setTimeout(() => { addMsg(item.a, 'bot'); showQuickReplies(); }, 500);
      });
    });
  }

  showQuickReplies();
}

// ===== WISHLIST =====
export function initWishlist() {
  const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
  document.querySelectorAll('.wishlist-btn').forEach(btn => {
    const id = btn.dataset.id;
    if (wishlist.includes(id)) btn.classList.add('active');
    btn.addEventListener('click', () => {
      const idx = wishlist.indexOf(id);
      if (idx === -1) { wishlist.push(id); btn.classList.add('active'); showToast('Added to wishlist', 'success'); }
      else { wishlist.splice(idx, 1); btn.classList.remove('active'); showToast('Removed from wishlist', 'info'); }
      localStorage.setItem('wishlist', JSON.stringify(wishlist));
    });
  });
}

export function trackRecentlyViewed(id) {
  const r = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
  localStorage.setItem('recentlyViewed', JSON.stringify([id, ...r.filter(x => x !== id)].slice(0, 10)));
}
export function getRecentlyViewed() { return JSON.parse(localStorage.getItem('recentlyViewed') || '[]'); }



