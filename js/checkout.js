// ===== CHECKOUT & PAYMENT =====
import { getCart, getCartTotal, clearCart } from './cart.js';
import { auth, db, collection, addDoc, doc, updateDoc, getDoc, serverTimestamp } from './firebase-config.js';
import { showToast } from './ui.js';

export function initCheckoutPage() {
  // Use Firebase auth state
  auth.onAuthStateChanged ? null : null; // ensure auth loaded
  const user = auth.currentUser;
  if (!user) {
    localStorage.setItem('auth_redirect', 'checkout.html');
    window.location.href = 'login.html';
    return;
  }

  const cart = getCart();
  if (cart.length === 0) { window.location.href = 'shop.html'; return; }

  const emailInput = document.querySelector('[name="email"]');
  if (emailInput && user.email) emailInput.value = user.email;

  renderOrderSummary();
  initPaymentMethods();

  const form = document.querySelector('#checkout-form');
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const method = document.querySelector('.payment-method.selected')?.dataset.method;
    if (!method) { showToast('Please select a payment method', 'error'); return; }

    if (method === 'qris') {
      const total = getCartTotal();
      const orderId = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2,6).toUpperCase();
      const pendingOrder = {
        orderId, userId: user.uid,
        items: cart, totalPrice: total,
        paymentMethod: 'qris', status: 'pending',
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('alight_pending_order', JSON.stringify(pendingOrder));
      window.location.href = 'payment-qris.html';
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Processing...';
    await processPayment(method);
    btn.disabled = false; btn.textContent = 'Pay now';
  });
}

function renderOrderSummary() {
  const cart = getCart();
  const summaryEl = document.querySelector('.order-summary-items');
  const totalEl = document.querySelector('.order-total-price');
  if (!summaryEl) return;
  summaryEl.innerHTML = cart.map(item => `
    <div class="receipt-row">
      <span class="receipt-row-label">${item.name}</span>
      <span class="receipt-row-value">${item.price === 0 ? 'Free' : 'Rp ' + item.price.toLocaleString('id-ID')}</span>
    </div>
  `).join('');
  const total = getCartTotal();
  if (totalEl) totalEl.textContent = total === 0 ? 'Free' : 'Rp ' + total.toLocaleString('id-ID');
}

function initPaymentMethods() {
  document.querySelectorAll('.payment-method').forEach(method => {
    method.addEventListener('click', () => {
      document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
      method.classList.add('selected');
      const type = method.dataset.method;
      document.querySelectorAll('.payment-detail').forEach(d => d.classList.add('hidden'));
      document.querySelector(`.payment-detail-${type}`)?.classList.remove('hidden');
      if (type === 'qris') generateQRIS();
    });
  });
}

function generateQRIS() {
  const qrisEl = document.querySelector('.qris-code');
  if (!qrisEl) return;
  const total = getCartTotal();
  // In production: call payment gateway API for real QRIS
  qrisEl.innerHTML = `
    <div style="text-align:center;padding:20px">
      <div style="font-size:48px;margin-bottom:8px">📱</div>
      <div style="font-size:12px;color:#666">QRIS Code</div>
      <div style="font-size:14px;font-weight:700;margin-top:8px">Rp ${total.toLocaleString('id-ID')}</div>
      <div style="font-size:10px;color:#999;margin-top:4px">Scan with any e-wallet</div>
    </div>
  `;
}

async function processPayment(method) {
  const user = auth.currentUser;
  const cart = getCart();
  const total = getCartTotal();
  const orderId = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2,6).toUpperCase();

  await new Promise(r => setTimeout(r, 1500));

  const order = {
    orderId, userId: user?.uid || 'guest',
    items: cart.map(i => ({ id: i.id, name: i.name, price: i.price })),
    totalPrice: total,
    paymentMethod: method, status: 'paid',
    createdAt: serverTimestamp()
  };

  try {
    // Save order to Firestore
    await addDoc(collection(db, 'orders'), order);

    // Update user's purchased presets in Firestore
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      const existing = snap.exists() ? (snap.data().purchasedPresets || []) : [];
      const newIds = [...new Set([...existing, ...cart.map(i => i.id)])];
      await updateDoc(userRef, { purchasedPresets: newIds });
    }
  } catch(e) {
    console.warn('Firestore save failed, using localStorage fallback:', e.message);
    const orders = JSON.parse(localStorage.getItem('alight_orders') || '[]');
    orders.push({ ...order, createdAt: new Date().toISOString() });
    localStorage.setItem('alight_orders', JSON.stringify(orders));
  }

  // Always save last order locally for receipt page
  localStorage.setItem('alight_last_order', JSON.stringify({
    ...order, createdAt: new Date().toISOString()
  }));

  clearCart();
  showToast('Payment successful! 🎉', 'success');
  setTimeout(() => window.location.href = 'receipt.html', 1500);
}

export function initReceiptPage() {
  const order = JSON.parse(localStorage.getItem('alight_last_order') || 'null');
  if (!order) { window.location.href = 'index.html'; return; }

  document.querySelector('.receipt-order-id')?.setAttribute('data-id', order.orderId);
  document.querySelector('.receipt-order-id-text')?.textContent && (document.querySelector('.receipt-order-id-text').textContent = order.orderId);

  const fields = {
    '.receipt-order-id-val': order.orderId,
    '.receipt-payment-method': order.paymentMethod?.toUpperCase(),
    '.receipt-status': '✅ Paid',
    '.receipt-date': new Date(order.createdAt).toLocaleDateString('id-ID', { dateStyle: 'long' }),
    '.receipt-total': order.totalPrice === 0 ? 'FREE' : 'Rp ' + order.totalPrice.toLocaleString('id-ID'),
  };
  Object.entries(fields).forEach(([sel, val]) => {
    const el = document.querySelector(sel);
    if (el) el.textContent = val;
  });

  const downloadList = document.querySelector('.receipt-download-list');
  if (downloadList) {
    downloadList.innerHTML = order.items.map(item => `
      <div class="receipt-download-item">
        <span class="receipt-download-name">${item.name}</span>
        <button class="btn btn-primary btn-sm" onclick="window.downloadPreset('${item.id}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download ZIP
        </button>
      </div>
    `).join('');
  }

  window.downloadPreset = (id) => {
    showToast('Download starting...', 'success');
    // In production: fetch secure URL from Firebase Storage
  };

  document.querySelector('.download-receipt-btn')?.addEventListener('click', () => {
    window.print();
  });
}
