// ===== MIDTRANS PAYMENT =====
// Requires Snap.js loaded in HTML:
// <script src="https://app.sandbox.midtrans.com/snap/snap.js" data-client-key="Mid-client-_7J6DNxka4CNpX3t"></script>

const CLIENT_KEY = 'Mid-client-_7J6DNxka4CNpX3t';
const IS_PRODUCTION = false;

// Load Snap.js dynamically
function loadSnapScript() {
  return new Promise((resolve, reject) => {
    if (window.snap) return resolve();
    const script = document.createElement('script');
    script.src = IS_PRODUCTION
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js';
    script.setAttribute('data-client-key', CLIENT_KEY);
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Get Snap token from our backend
async function getSnapToken({ orderId, amount, customerName, customerEmail, items }) {
  const res = await fetch('/api/create-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, amount, customerName, customerEmail, items }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create payment');
  }
  const data = await res.json();
  return data.token;
}

// Main: open Midtrans Snap popup
export async function openMidtransPayment({ orderId, amount, customerName, customerEmail, items, onSuccess, onPending, onError }) {
  await loadSnapScript();

  const token = await getSnapToken({ orderId, amount, customerName, customerEmail, items });

  window.snap.pay(token, {
    onSuccess(result) {
      console.log('Payment success:', result);
      if (onSuccess) onSuccess(result);
    },
    onPending(result) {
      console.log('Payment pending:', result);
      if (onPending) onPending(result);
    },
    onError(result) {
      console.error('Payment error:', result);
      if (onError) onError(result);
    },
    onClose() {
      console.log('Snap popup closed');
    },
  });
}
