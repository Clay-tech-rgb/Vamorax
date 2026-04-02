// ===== CART =====
import { showToast, icons } from './ui.js';
import { auth } from './firebase-config.js';

const KEY = 'alight_cart';
export const getCart = () => JSON.parse(localStorage.getItem(KEY) || '[]');
const saveCart = (cart) => { localStorage.setItem(KEY, JSON.stringify(cart)); updateCartBadge(); };

export function addToCart(preset) {
  const user = auth.currentUser;
  if (!user) {
    showToast('Please sign in to add items to cart', 'info');
    localStorage.setItem('auth_redirect', window.location.href);
    setTimeout(() => { window.location.href = 'login.html'; }, 1200);
    return;
  }
  const cart = getCart();
  if (cart.find(i => i.id === preset.id)) { showToast('Already in cart', 'info'); return; }
  cart.push(preset); saveCart(cart);
  showCartToast(preset.name);
  renderCartSidebar();
}

function showCartToast(name) {
  let container = document.querySelector('.toast-container');
  if (!container) { container = document.createElement('div'); container.className = 'toast-container'; document.body.appendChild(container); }
  const toast = document.createElement('div');
  toast.className = 'toast toast-cart';
  toast.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;color:#4ade80"><polyline points="20 6 9 17 4 12"/></svg>
    <div>
      <div style="font-size:12px;font-weight:600;margin-bottom:1px">Added to cart</div>
      <div style="font-size:11px;color:var(--text-2)">${name}</div>
    </div>
  `;
  container.appendChild(toast);
  setTimeout(() => { toast.style.animation = 'toastOut 0.25s ease forwards'; setTimeout(() => toast.remove(), 250); }, 2800);
}
export function removeFromCart(id) { saveCart(getCart().filter(i => i.id !== id)); renderCartSidebar(); }
export function clearCart() { saveCart([]); renderCartSidebar(); }
export const getCartTotal = () => getCart().reduce((s, i) => s + (i.price || 0), 0);

export function updateCartBadge() {
  const badge = document.querySelector('.cart-badge');
  const count = getCart().length;
  if (badge) { badge.textContent = count; badge.classList.toggle('show', count > 0); }
  // Also update mobile menu cart badge
  document.querySelectorAll('.cart-badge').forEach(b => {
    b.textContent = count;
    b.classList.toggle('show', count > 0);
  });
}

export function renderCartSidebar() {
  const itemsEl = document.querySelector('.cart-items');
  const totalEl = document.querySelector('.cart-total-price');
  if (!itemsEl) return;
  const cart = getCart();
  if (cart.length === 0) {
    itemsEl.innerHTML = `<div class="cart-empty"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg><p>Your cart is empty</p></div>`;
    itemsEl.style.background = 'none';
  } else {
    itemsEl.style.background = 'var(--border)';
    itemsEl.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-thumb" style="${item.imageUrl ? `background:url('${item.imageUrl}') center/cover no-repeat;` : ''}">
          ${!item.imageUrl ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>` : ''}
        </div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${item.price === 0 ? 'Free' : 'Rp ' + item.price.toLocaleString('id-ID')}</div>
        </div>
        <button class="cart-item-remove" onclick="window._cartRemove('${item.id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `).join('');
  }
  if (totalEl) {
    const t = getCartTotal();
    totalEl.textContent = t === 0 ? 'Free' : 'Rp ' + t.toLocaleString('id-ID');
  }
  updateCartBadge();
}

export function initCartSidebar() {
  const sidebar = document.querySelector('.cart-sidebar');
  const overlay = document.querySelector('.cart-overlay');
  const closeBtn = document.querySelector('.cart-close');
  const checkoutBtn = document.querySelector('.cart-checkout-btn');
  window._cartRemove = (id) => { removeFromCart(id); showToast('Removed from cart', 'info'); };
  // Bind ALL cart buttons (navbar + mobile menu)
  document.querySelectorAll('.cart-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      sidebar?.classList.add('open');
      overlay?.classList.add('show');
    });
  });
  const close = () => {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('show');
  };
  closeBtn?.addEventListener('click', close);
  overlay?.addEventListener('click', close);
  checkoutBtn?.addEventListener('click', () => {
    if (getCart().length === 0) { showToast('Your cart is empty', 'error'); return; }
    const user = auth.currentUser;
    if (!user) {
      showToast('Please sign in to checkout', 'info');
      localStorage.setItem('auth_redirect', 'checkout.html');
      setTimeout(() => { window.location.href = 'login.html'; }, 1200);
      return;
    }
    window.location.href = 'checkout.html';
  });
  renderCartSidebar(); updateCartBadge();
}
