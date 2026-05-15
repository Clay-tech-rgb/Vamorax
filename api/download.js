// api/download.js — Vercel Serverless Function (Node.js)
// Proxy ke ZM Social Downloader via RapidAPI

const RAPIDAPI_KEY  = process.env.RAPIDAPI_KEY || '2ff9169c12msh5bbb61f87b95b8cp10a495jsn57c534267f4a';
const RAPIDAPI_HOST = 'zm-api.p.rapidapi.com';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // ── GET /api/download?proxy=<encoded_url>&filename=<name> ──────────────────
  // Proxy stream supaya browser bisa download (bypass CORS & force-download)
  if (req.method === 'GET') {
    const proxyUrl  = req.query && req.query.proxy;
    const filename  = (req.query && req.query.filename) || 'media';
    if (!proxyUrl) { res.status(400).json({ error: 'Missing proxy param' }); return; }

    try {
      const upstream = await fetch(decodeURIComponent(proxyUrl), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
          'Referer': 'https://www.youtube.com/',
        },
        signal: AbortSignal.timeout(28000),
      });

      if (!upstream.ok) {
        res.status(502).json({ error: 'Upstream fetch failed: ' + upstream.status });
        return;
      }

      const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const ct = upstream.headers.get('content-length');
      if (ct) res.setHeader('Content-Length', ct);

      // Stream response body ke client
      const reader = upstream.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
        res.end();
      };
      await pump();
    } catch (err) {
      if (!res.headersSent) res.status(500).json({ error: err.message });
    }
    return;
  }

  // ── POST /api/download — fetch metadata dari RapidAPI ─────────────────────
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { url, isAudio } = req.body || {};
  if (!url || !url.trim()) {
    res.status(400).json({ error: 'URL tidak boleh kosong' });
    return;
  }

  try {
    const apiUrl = `https://${RAPIDAPI_HOST}/v1/social/autolink?url=${encodeURIComponent(url.trim())}`;

    const apiRes = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key':  RAPIDAPI_KEY,
      },
      signal: AbortSignal.timeout(25000),
    });

    const data = await apiRes.json();

    if (!apiRes.ok || data.error === true) {
      res.status(422).json({ error: data.message || data.error || 'Gagal memproses URL' });
      return;
    }

    const formats  = [];
    const thumb    = data.thumbnail || data.thumb || data.cover || data.image || null;
    const title    = data.title || data.filename || data.desc || extractTitle(url.trim());
    const mediaList = data.medias || data.links || data.videos || data.data || [];

    if (Array.isArray(mediaList) && mediaList.length > 0) {
      mediaList.forEach((item, i) => {
        const dlUrl = item.url || item.link || item.download_url || item.src;
        if (!dlUrl) return;

        const itemType = (item.type || '').toLowerCase();
        const itemExt  = (item.ext  || '').toLowerCase();

        const isItemAudio = itemType === 'audio';
        const isItemVideo = itemType === 'video';

        // ── Video filter ──────────────────────────────────────────────────────
        if (isItemVideo) {
          // Skip video-only streams (no audio track) — audioQuality null = video only
          const hasMergedAudio = item.audioQuality != null;
          if (!hasMergedAudio) return;

          // User minta audio → skip semua video
          if (isAudio) return;
        }

        // ── Audio filter ──────────────────────────────────────────────────────
        if (isItemAudio) {
          // User minta video → skip audio
          if (!isAudio) return;
          // Prefer m4a over opus for compatibility
          if (itemExt === 'opus' && mediaList.some(m =>
            (m.type||'').toLowerCase() === 'audio' && (m.ext||'').toLowerCase() === 'm4a'
          )) return;
        }

        // Skip kalau bukan audio maupun video (unknown type)
        if (!isItemAudio && !isItemVideo) return;

        const quality = item.label || item.quality || item.resolution || (isItemAudio ? 'Audio' : 'Video');
        const ext     = itemExt || (isItemAudio ? 'm4a' : 'mp4');
        const safeTitle = (title || 'media').replace(/[^a-z0-9_\-]/gi, '_').slice(0, 60);
        const filename  = `${safeTitle}.${ext}`;

        // Bungkus URL asli ke proxy endpoint supaya browser bisa download
        const proxyUrl = `/api/download?proxy=${encodeURIComponent(dlUrl)}&filename=${encodeURIComponent(filename)}`;

        formats.push({
          format_id:  item.formatId || item.format_id || `f${i}`,
          extension:  ext,
          resolution: quality,
          filesize:   item.filesize || item.size || null,
          url:        proxyUrl,        // ← proxy URL, bukan direct
          direct_url: dlUrl,           // ← simpan juga untuk fallback
          note:       quality,
        });
      });
    } else if (data.url || data.download_url || data.link) {
      const dlUrl    = data.url || data.download_url || data.link;
      const ext      = isAudio ? 'm4a' : 'mp4';
      const safeTitle = (title || 'media').replace(/[^a-z0-9_\-]/gi, '_').slice(0, 60);
      const filename  = `${safeTitle}.${ext}`;
      formats.push({
        format_id:  'best',
        extension:  ext,
        resolution: isAudio ? 'Audio' : 'Best',
        filesize:   null,
        url:        `/api/download?proxy=${encodeURIComponent(dlUrl)}&filename=${encodeURIComponent(filename)}`,
        direct_url: dlUrl,
        note:       'Best quality',
      });
    }

    if (formats.length === 0) {
      res.status(422).json({
        error: 'Tidak ada format tersedia untuk URL ini.',
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
