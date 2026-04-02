// ===== SHOP — Firestore-backed =====
import { addToCart } from './cart.js';
import { showToast, trackRecentlyViewed, icons } from './ui.js';
import { db, collection, getDocs, query, where } from './firebase-config.js';

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

// ===== RENDER CARD =====
export function renderPresetCard(preset) {
  const priceLabel = preset.isFree ? 'Free' : `Rp ${Number(preset.price).toLocaleString('id-ID')}`;
  const idx = Math.abs(preset.id.split('').reduce((a,c) => a + c.charCodeAt(0), 0)) % PLACEHOLDER_BG.length;
  const bg = preset.imageUrl
    ? `url('${preset.imageUrl}') center/cover no-repeat`
    : PLACEHOLDER_BG[idx];

  const actionBtn = preset.isFree
    ? `<div style="display:flex;gap:6px;margin-top:12px">
        ${preset.downloadUrl ? `<a href="${preset.downloadUrl}" target="_blank" class="btn btn-ghost btn-sm" style="flex:1;justify-content:center">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          File</a>` : ''}
        ${preset.alightUrl ? `<a href="${preset.alightUrl}" target="_blank" class="btn btn-ghost btn-sm" style="flex:1;justify-content:center">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Alight</a>` : ''}
        ${!preset.downloadUrl && !preset.alightUrl ? `<button class="btn btn-ghost btn-sm w-full" style="justify-content:center" onclick="window.downloadFree('${preset.id}')">Download</button>` : ''}
       </div>`
    : `<div style="display:flex;gap:6px;margin-top:12px">
        <button class="btn btn-primary btn-sm w-full" style="justify-content:center" onclick="window.addPresetToCart('${preset.id}')">Add to cart</button>
       </div>`;

  return `
    <div class="preset-card" data-id="${preset.id}" data-category="${preset.category}">
      <div class="preset-card-media" style="background:${bg}">
        ${!preset.imageUrl ? `<div class="preset-card-thumb-label">${preset.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div>` : ''}
        <span class="preset-badge ${preset.isFree ? 'badge-free' : 'badge-paid'}">${preset.isFree ? 'Free' : 'Rp ' + Number(preset.price).toLocaleString('id-ID')}</span>
        <button class="wishlist-btn" data-id="${preset.id}">${icons.heart}</button>
      </div>
      <div class="preset-card-body">
        <div class="preset-card-cat">${(preset.category||'').replace('-',' ')}</div>
        <div class="preset-card-name">${preset.name}</div>
        <div class="preset-card-footer">
          <span class="preset-price ${preset.isFree ? 'free' : ''}">${priceLabel}</span>
        </div>
        ${actionBtn}
      </div>
    </div>`;
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
      ? filtered.map(p => renderPresetCard(p)).join('')
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
