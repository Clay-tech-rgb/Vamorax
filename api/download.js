// api/download.js — Vercel Serverless Function (Node.js)
// Proxy ke cobalt.tools API — tidak butuh yt-dlp binary

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { url } = req.body || {};
  if (!url || !url.trim()) {
    res.status(400).json({ error: 'URL tidak boleh kosong' });
    return;
  }

  try {
    // Cobalt.tools API — gratis, no key needed
    const cobaltRes = await fetch('https://api.cobalt.tools/api/json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        url: url.trim(),
        vQuality: 'max',       // ambil kualitas tertinggi
        filenamePattern: 'basic',
        isAudioOnly: false,
        disableMetadata: false,
      }),
      signal: AbortSignal.timeout(20000),
    });

    const data = await cobaltRes.json();

    // cobalt status: "stream", "redirect", "picker", "error", "rate-limit"
    if (data.status === 'error' || data.status === 'rate-limit') {
      res.status(422).json({ error: data.text || 'Cobalt gagal memproses URL ini' });
      return;
    }

    // Normalkan response ke format yang sama dengan frontend kita
    const formats = [];

    if (data.status === 'stream' || data.status === 'redirect') {
      // Single direct URL
      formats.push({
        format_id: 'best',
        extension: 'mp4',
        resolution: 'Best',
        filesize: null,
        url: data.url,
        note: 'Best quality',
        vcodec: 'avc1',
        acodec: 'mp4a',
      });
    } else if (data.status === 'picker') {
      // Multiple options (misal Instagram carousel)
      (data.picker || []).forEach((item, i) => {
        formats.push({
          format_id: `pick_${i}`,
          extension: item.type === 'photo' ? 'jpg' : 'mp4',
          resolution: item.type === 'photo' ? 'Photo' : 'Video',
          filesize: null,
          url: item.url,
          note: item.type || '',
          vcodec: item.type === 'photo' ? 'none' : 'avc1',
          acodec: item.type === 'photo' ? 'none' : 'mp4a',
        });
      });
    }

    res.status(200).json({
      title: data.filename || extractTitle(url.trim()),
      thumbnail: null,
      duration: null,
      formats,
    });

  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
};

function extractTitle(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube') || u.hostname.includes('youtu.be')) return 'YouTube Video';
    if (u.hostname.includes('tiktok')) return 'TikTok Video';
    if (u.hostname.includes('instagram')) return 'Instagram Media';
    if (u.hostname.includes('twitter') || u.hostname.includes('x.com')) return 'Twitter Video';
    if (u.hostname.includes('facebook')) return 'Facebook Video';
    return 'Media';
  } catch { return 'Media'; }
}
