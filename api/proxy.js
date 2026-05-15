// api/proxy.js — Vercel Serverless Function
// Proxy file dari URL yang IP-locked (googlevideo.com, dll)

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const rawProxy = req.query?.proxy;
  const filename = req.query?.filename || 'media.m4a';

  if (!rawProxy) {
    res.status(400).json({ error: 'Missing proxy param' });
    return;
  }

  const targetUrl = decodeURIComponent(rawProxy);

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
        'Referer':    'https://www.youtube.com/',
        'Origin':     'https://www.youtube.com',
      },
      signal: AbortSignal.timeout(28000),
    });

    if (!upstream.ok) {
      res.status(502).json({ error: `Upstream returned ${upstream.status}` });
      return;
    }

    // Buffer seluruh response (Vercel tidak support streaming)
    const arrayBuf = await upstream.arrayBuffer();
    const buffer   = Buffer.from(arrayBuf);

    const ct = upstream.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', ct);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.status(200).send(buffer);

  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Proxy error' });
    }
  }
};
