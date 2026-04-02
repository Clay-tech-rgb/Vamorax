// ===== VERCEL SERVERLESS FUNCTION — Midtrans Snap Token =====
// Endpoint: POST /api/create-payment
// Body: { orderId, amount, customerName, customerEmail, items }

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { orderId, amount, customerName, customerEmail, items } = req.body;

  if (!orderId || !amount) {
    return res.status(400).json({ error: 'orderId and amount are required' });
  }

  const SERVER_KEY = 'Mid-server-2ChjQiU54xoaGs74-yQbhWt_';
  const IS_PRODUCTION = false;
  const BASE_URL = IS_PRODUCTION
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

  const authString = Buffer.from(SERVER_KEY + ':').toString('base64');

  const payload = {
    transaction_details: {
      order_id: orderId,
      gross_amount: amount,
    },
    credit_card: { secure: true },
    customer_details: {
      first_name: customerName || 'Customer',
      email: customerEmail || '',
    },
    item_details: items || [],
  };

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error_messages || 'Midtrans error' });
    }

    return res.status(200).json({ token: data.token, redirect_url: data.redirect_url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
