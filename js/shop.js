// ===== SHOP — Firestore-backed =====
import { addToCart } from './cart.js';
import { showToast, trackRecentlyViewed, icons } from './ui.js';
import { db, collection, getDocs, query, where } from './firebase-config.js';

// Inline membership check — avoid circular import with auth.js
function getCachedMembership() {
  return localStorage.getItem('vmx_membership') || 'free';
}

const PLACEHOLDER_BG = [
  'linear-gradient(135deg, #1a1a20 0%, #111116 100%)',
  'linear-gradient(135deg, #16161c 0%, #1c1c24 100%)',
  'linear-gradient(135deg, #111118 0%, #18181e 100%)',
];

// ===== FETCH FROM FIRESTORE (with localStorage override) =====
export async function fetchPresets() {
  // Check localStorage first (admin panel saves here)
  const local = localStorage.getItem('vamorax_presets');
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (parsed.length > 0) return parsed;
    } catch {}
  }
  // Try Firestore
  try {
    const snap = await getDocs(collection(db, 'presets'));
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (data.length > 0) return data;
  } catch (e) {
    console.warn('Firestore not configured yet:', e.message);
  }
  // Return empty — no fallback hardcoded data
  return [];
}

export async function fetchFreePresets() {
  try {
    const q = query(collection(db, 'presets'), where('isFree', '==', true));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    return FALLBACK_PRESETS.filter(p => p.isFree);
  }
}

export async function fetchTrendingPresets() {
  try {
    const q = query(collection(db, 'presets'), where('isTrending', '==', true));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    return FALLBACK_PRESETS.filter(p => !p.isFree);
  }
}

// Fallback data if Firestore not configured yet
const FALLBACK_PRESETS = [
  { id: 'p1', name: 'Neon Velocity',  category: 'velocity',  price: 5000, isFree: false, isTrending: true,  tags: ['velocity','fast','motion'] },
  { id: 'p2', name: 'Cinematic Fade', category: 'cinematic', price: 5000, isFree: false, isTrending: true,  tags: ['cinematic','fade','smooth'] },
  { id: 'p3', name: 'Beat Sync Pro',  category: 'beat-sync', price: 5000, isFree: false, isTrending: false, tags: ['beat','sync','music'] },
  { id: 'p4', name: 'Glitch Storm',   category: 'velocity',  price: 5000, isFree: false, isTrending: false, tags: ['glitch','velocity'] },
  { id: 'p5', name: 'Soft Cinematic', category: 'cinematic', price: 5000, isFree: false, isTrending: true,  tags: ['soft','cinematic','warm'] },
  { id: 'p6', name: 'Bass Drop Sync', category: 'beat-sync', price: 5000, isFree: false, isTrending: false, tags: ['bass','drop','sync'] },
  { id: 'f1', name: 'Basic Fade',     category: 'cinematic', price: 0,    isFree: true,  isTrending: false, tags: ['fade','basic','free'] },
  { id: 'f2', name: 'Simple Beat',    category: 'beat-sync', price: 0,    isFree: true,  isTrending: false, tags: ['beat','simple','free'] },
  { id: 'f3', name: 'Quick Velocity', category: 'velocity',  price: 0,    isFree: true,  isTrending: false, tags: ['velocity','quick','free'] },
];

// ===== RENDER CARD — FREE style (foto setengah, info di bawah) =====
// ===== RENDER CARD — user-card style (full photo, glassmorphism overlay) =====
export function renderPresetCard(preset) {
  const idx = Math.abs(preset.id.split('').reduce((a,c) => a + c.charCodeAt(0), 0)) % PLACEHOLDER_BG.length;
  const bgStyle = preset.imageUrl
    ? `background:url('${preset.imageUrl}') center/cover no-repeat`
    : `background:${PLACEHOLDER_BG[idx]}`;

  const svgDownload = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
  const svgAlight  = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
  const svgCart    = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`;

  let actionBtns;
  const isPro = getCachedMembership() === 'pro';
  const isLocked = preset.isPremium && !isPro;

  if (isLocked) {
    // Premium preset — locked for free users
    actionBtns = `<button class="preset-card-action-btn preset-lock-btn" onclick="window.location.href='membership.html'">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
      Membership to unlock
    </button>`;
  } else if (preset.isFree) {
    actionBtns = `<div class="free-preset-actions" style="display:flex;gap:6px">
      ${preset.downloadUrl
        ? `<button class="preset-card-action-btn free-dl-btn" style="flex:1;justify-content:center" onclick="window.downloadFree('${preset.id}','${preset.downloadUrl}')">${svgDownload} File</button>`
        : ''}
      ${preset.alightUrl
        ? `<button class="preset-card-action-btn free-dl-btn" style="flex:1;justify-content:center" onclick="window.downloadFree('${preset.id}','${preset.alightUrl}')">${svgAlight} Alight</button>`
        : ''}
      ${!preset.downloadUrl && !preset.alightUrl
        ? `<button class="preset-card-action-btn free-dl-btn" style="width:100%;justify-content:center" onclick="window.downloadFree('${preset.id}')">${svgDownload} Download</button>`
        : ''}
    </div>`;
  } else {
    actionBtns = `<button class="preset-card-action-btn" style="width:100%;justify-content:center" onclick="window.addPresetToCart('${preset.id}')">${svgCart} Add to cart</button>`;
  }

  return `
    <div class="preset-card preset-card--split${isLocked ? ' preset-card--locked' : ''}" data-id="${preset.id}" data-category="${preset.category}">
      <div class="preset-card-media" style="${bgStyle}">
        ${!preset.imageUrl ? `<div class="preset-card-thumb-label">${preset.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div>` : ''}
        ${isLocked ? `<div class="preset-lock-overlay">
          <div class="preset-lock-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          </div>
          <div class="preset-lock-label">Membership to unlock</div>
        </div>` : ''}
      </div>
      <button class="wishlist-btn" data-id="${preset.id}">${icons.heart}</button>
      <div class="preset-card-body">
        <div class="preset-card-cat">${(preset.category||'').replace('-',' ')}</div>
        <div class="preset-card-name">${preset.name}</div>
        <div class="preset-card-stat-price">${preset.isFree ? 'Free' : `Rp ${Number(preset.price).toLocaleString('id-ID')}`}</div>
        <div class="preset-card-footer">
          <div class="preset-card-actions">${actionBtns}</div>
        </div>
      </div>
    </div>`;
}

// ===== RENDER CARD — SHOP style (alias, same user-card look) =====
export function renderPresetCardFull(preset) {
  return renderPresetCard(preset);
}

// ===== SHOP PAGE =====
export async function initShopPage() {
  const grid = document.querySelector('#shopGrid');
  if (!grid) return;

  window.addPresetToCart = (id) => {
    fetchPresets().then(presets => {
      const p = presets.find(x => x.id === id);
      if (p) { addToCart(p); trackRecentlyViewed(id); }
    });
  };
  window.downloadFree = (id) => {
    const user = JSON.parse(localStorage.getItem('alight_user') || 'null');
    if (!user) { showToast('Please sign in to download', 'info'); setTimeout(() => window.location.href = 'login.html', 1200); return; }
    showToast('Download starting', 'success');
  };

  const presets = await fetchPresets();

  const renderGrid = (filter = 'all') => {
    // Shop only shows paid presets — free presets have their own page
    const paid = presets.filter(p => !p.isFree);
    const filtered = filter === 'all'
      ? paid
      : paid.filter(p => p.category === filter);
    grid.innerHTML = filtered.length
      ? filtered.map(p => renderPresetCardFull(p)).join('')
      : `<div style="grid-column:1/-1;padding:60px;text-align:center;color:var(--text-3);font-size:13px">No presets found</div>`;
    initWishlistBtns();
  };

  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderGrid(tab.dataset.filter);
    });
  });

  renderGrid();
}

function initWishlistBtns() {
  const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
  document.querySelectorAll('.wishlist-btn').forEach(btn => {
    const id = btn.dataset.id;
    if (wishlist.includes(id)) btn.classList.add('active');
    btn.addEventListener('click', () => {
      const idx = wishlist.indexOf(id);
      if (idx === -1) { wishlist.push(id); btn.classList.add('active'); }
      else { wishlist.splice(idx, 1); btn.classList.remove('active'); }
      localStorage.setItem('wishlist', JSON.stringify(wishlist));
    });
  });
}

// ===== SKELETON LOADING =====
export function renderSkeletonCards(count = 6) {
  return Array.from({ length: count }, () => `
    <div class="skeleton-card">
      <div class="sk-media skeleton"></div>
      <div class="sk-body">
        <div class="sk-line sk-line-sm skeleton"></div>
        <div class="sk-line sk-line-lg skeleton"></div>
        <div class="sk-line sk-line-md skeleton"></div>
        <div class="sk-btn skeleton"></div>
      </div>
    </div>`).join('');
}
