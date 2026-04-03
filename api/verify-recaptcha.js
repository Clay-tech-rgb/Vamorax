// Vercel Serverless Function — reCAPTCHA verification + rate limiting
// Set RECAPTCHA_SECRET_KEY in Vercel Environment Variables

const rateLimit = new Map(); // IP -> { count, resetAt }
const RATE_LIMIT = 10;       // max requests per window
const WINDOW_MS  = 60_000;   // 1 minute window

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export default async function handler(req, res) {
  // Only POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Rate limit by IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ success: false, error: 'Too many requests. Try again later.' });
  }

  const { token, action } = req.body;
  if (!token) {
    return res.status(400).json({ success: false, error: 'Missing token' });
  }

  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    return res.status(500).json({ success: false, error: 'Server misconfigured' });
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secret}&response=${token}`,
    });
    const data = await response.json();

    // reCAPTCHA v3: score >= 0.5 is human
    const passed = data.success && (data.score === undefined || data.score >= 0.5);
    return res.status(200).json({
      success: passed,
      score: data.score,
      action: data.action,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Verification failed' });
  }
}
