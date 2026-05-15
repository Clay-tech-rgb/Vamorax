// api/download.js — Vercel Serverless Function (Node.js)
const RAPIDAPI_KEY  = process.env.RAPIDAPI_KEY || '2ff9169c12msh5bbb61f87b95b8cp10a495jsn57c534267f4a';
const RAPIDAPI_HOST = 'social-download-all-in-one.p.rapidapi.com';

// Domain yang URL-nya IP-locked (harus di-proxy dari server)
const NEEDS_PROXY = ['googlevideo.com', 'googleusercontent.com'];

function needsProxy(url) {
  try { return NEEDS_PROXY.some(d => new URL(url).hostname.includes(d)); }
  catch { return false; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // ── GET /api/download?proxy=URL&filename=NAME — server-side proxy ──────────
  if (req.method === 'GET') {
    const rawProxy  = req.query?.proxy;
    const filename  = req.query?.filename || 'audio.m4a';
    if (!rawProxy) { res.status(400).json({ error: 'Missing proxy param' }); return; }

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
        res.status(502).json({ error: `Upstream ${upstream.status}` });
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
      if (!res.headersSent) res.status(500).json({ error: err.message });
    }
    return;
  }

  // ── POST /api/download — fetch metadata ────────────────────────────────────
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { url, isAudio } = req.body || {};
  if (!url?.trim()) { res.status(400).json({ error: 'URL kosong' }); return; }

  try {
    const apiRes = await fetch(
      `https://${RAPIDAPI_HOST}/v1/social/autolink`,
      {
        method:  'POST',
        headers: {
          'Content-Type':    'application/json',
          'x-rapidapi-host': RAPIDAPI_HOST,
          'x-rapidapi-key':  RAPIDAPI_KEY,
        },
        body:   JSON.stringify({ url: url.trim() }),
        signal: AbortSignal.timeout(25000),
      }
    );

    const data = await apiRes.json();
    if (!apiRes.ok || data.error === true) {
      res.status(422).json({ error: data.message || 'Gagal memproses URL' });
      return;
    }

    const thumb     = data.thumbnail || data.thumb || data.cover || data.image || null;
    const title     = data.title || data.filename || data.desc || extractTitle(url.trim());
    const mediaList = data.medias || data.links || data.videos || data.data || [];
    const formats   = [];

    if (Array.isArray(mediaList) && mediaList.length > 0) {
      mediaList.forEach((item, i) => {
        const dlUrl    = item.url || item.link || item.download_url || item.src;
        if (!dlUrl) return;

        const itemType    = (item.type    || '').toLowerCase();
        const itemExt     = (item.ext     || item.extension || '').toLowerCase();
        const itemQuality = (item.quality || '').toLowerCase();
        const audioQ      = item.audioQuality || '';

        const isItemAudio = itemType === 'audio';
        // Video dengan audio track = type video + audioQuality tidak kosong
        const isItemVideoWithAudio = itemType === 'video' && audioQ !== '' && audioQ != null;
        // Video-only = type video + audioQuality kosong
        const isItemVideoOnly = itemType === 'video' && (audioQ === '' || audioQ == null);

        if (isAudio) {
          // User minta audio — ambil hanya type=audio
          if (!isItemAudio) return;
          // Prefer m4a, skip opus kalau ada m4a
          if (itemExt === 'opus' && mediaList.some(m =>
            (m.type||'').toLowerCase() === 'audio' && (m.ext||'').toLowerCase() === 'm4a'
          )) return;
        } else {
          // User minta video — skip audio, skip video-only, skip watermark
          if (isItemAudio) return;
          if (isItemVideoOnly) return;
          if (itemQuality === 'watermark') return;
        }

        const quality = item.quality || item.label || (isItemAudio ? 'Audio' : 'Video');
        const ext     = itemExt || (isItemAudio ? 'm4a' : 'mp4');
        const safeTitle = (title || 'media').replace(/[^a-z0-9_\-]/gi, '_').slice(0, 50);
        const filename  = `${safeTitle}.${ext}`;

        // Kalau URL perlu proxy (googlevideo), bungkus ke endpoint GET
        const finalUrl = needsProxy(dlUrl)
          ? `/api/download?proxy=${encodeURIComponent(dlUrl)}&filename=${encodeURIComponent(filename)}`
          : dlUrl;

        formats.push({
          format_id:   `f${i}`,
          extension:   ext,
          resolution:  quality,
          filesize:    item.filesize || item.size || null,
          url:         finalUrl,
          needs_proxy: needsProxy(dlUrl),
          note:        quality,
        });
      });
    } else if (data.url || data.download_url || data.link) {
      const dlUrl   = data.url || data.download_url || data.link;
      const ext     = isAudio ? 'm4a' : 'mp4';
      const safeTitle = (title || 'media').replace(/[^a-z0-9_\-]/gi, '_').slice(0, 50);
      const filename  = `${safeTitle}.${ext}`;
      formats.push({
        format_id:   'best',
        extension:   ext,
        resolution:  isAudio ? 'Audio' : 'Best',
        filesize:    null,
        url:         needsProxy(dlUrl)
          ? `/api/download?proxy=${encodeURIComponent(dlUrl)}&filename=${encodeURIComponent(filename)}`
          : dlUrl,
        needs_proxy: needsProxy(dlUrl),
        note:        'Best quality',
      });
    }

    if (formats.length === 0) {
      res.status(422).json({
        error: 'Tidak ada format tersedia.',
        debug: JSON.stringify(data).slice(0, 300),
      });
      return;
    }

    res.status(200).json({ title, thumbnail: thumb, duration: data.duration || null, formats });

  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
};

function extractTitle(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube') || u.hostname.includes('youtu.be')) return 'YouTube Video';
    if (u.hostname.includes('tiktok'))    return 'TikTok Video';
    if (u.hostname.includes('instagram')) return 'Instagram Media';
    if (u.hostname.includes('twitter') || u.hostname.includes('x.com')) return 'Twitter Video';
    if (u.hostname.includes('facebook'))  return 'Facebook Video';
    return 'Media';
  } catch { return 'Media'; }
}
