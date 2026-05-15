// api/download.js — Vercel Serverless Function (Node.js 20)
const RAPIDAPI_KEY  = process.env.RAPIDAPI_KEY || '2ff9169c12msh5bbb61f87b95b8cp10a495jsn57c534267f4a';
const RAPIDAPI_HOST = 'social-download-all-in-one.p.rapidapi.com';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // ── GET ?proxy=URL&filename=NAME  →  proxy file ke browser ────────────────
  if (req.method === 'GET') {
    const rawProxy = req.query?.proxy;
    const filename = req.query?.filename || 'media';
    if (!rawProxy) { res.status(400).json({ error: 'Missing proxy param' }); return; }

    try {
      const upstream = await fetch(decodeURIComponent(rawProxy), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer':    'https://www.youtube.com/',
          'Origin':     'https://www.youtube.com',
        },
        signal: AbortSignal.timeout(28000),
      });

      if (!upstream.ok) {
        res.status(502).json({ error: `Upstream ${upstream.status}` });
        return;
      }

      const buf = Buffer.from(await upstream.arrayBuffer());
      const ct  = upstream.headers.get('content-type') || 'application/octet-stream';
      res.setHeader('Content-Type', ct);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Content-Length', buf.length);
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).end(buf);    } catch (err) {
      if (!res.headersSent) res.status(500).json({ error: err.message });
    }
    return;
  }

  // ── POST  →  fetch SEMUA format sekaligus (video + audio) ─────────────────
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { url } = req.body || {};
  if (!url?.trim()) { res.status(400).json({ error: 'URL kosong' }); return; }

  try {
    const apiRes = await fetch(`https://${RAPIDAPI_HOST}/v1/social/autolink`, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key':  RAPIDAPI_KEY,
      },
      body:   JSON.stringify({ url: url.trim() }),
      signal: AbortSignal.timeout(25000),
    });

    const data = await apiRes.json();
    if (!apiRes.ok || data.error === true) {
      res.status(422).json({ error: data.message || 'Gagal memproses URL' });
      return;
    }

    const source    = (data.source || '').toLowerCase();
    const isYouTube = source === 'youtube';
    const thumb     = data.thumbnail || data.thumb || data.cover || data.image || null;
    const title     = data.title || data.filename || data.desc || extractTitle(url.trim());
    const mediaList = data.medias || data.links || data.videos || data.data || [];

    const videoFormats = [];
    const audioFormats = [];

    if (Array.isArray(mediaList) && mediaList.length > 0) {
      // Cek apakah ada m4a untuk skip opus
      const hasM4a = mediaList.some(m =>
        (m.type||'').toLowerCase() === 'audio' && (m.ext||m.extension||'').toLowerCase() === 'm4a'
      );

      mediaList.forEach((item, i) => {
        const dlUrl    = item.url || item.link || item.download_url || item.src;
        if (!dlUrl) return;

        const itemType    = (item.type    || '').toLowerCase();
        const itemExt     = (item.ext     || item.extension || '').toLowerCase();
        const itemQuality = (item.quality || item.label || '').toLowerCase();
        const audioQ      = item.audioQuality || '';

        const isItemAudio = itemType === 'audio';
        const isItemVideo = itemType === 'video';

        const quality   = item.quality || item.label || (isItemAudio ? 'Audio' : 'Video');
        const ext       = itemExt || (isItemAudio ? 'm4a' : 'mp4');
        const safeTitle = (title || 'media').replace(/[^a-z0-9_\-]/gi, '_').slice(0, 50);
        const filename  = `${safeTitle}.${ext}`;

        // YouTube (googlevideo.com) IP-locked — tidak bisa di-proxy dari Vercel, kirim direct
        const isGooglevideo = dlUrl.includes('googlevideo.com');
        const finalUrl = isGooglevideo
          ? dlUrl
          : `/api/download?proxy=${encodeURIComponent(dlUrl)}&filename=${encodeURIComponent(filename)}`;

        const formatObj = {
          format_id:  `f${i}`,
          extension:  ext,
          resolution: quality,
          filesize:   item.filesize || item.size || null,
          url:        finalUrl,
          direct:     isGooglevideo,
          note:       quality,
        };

        if (isItemAudio) {
          // Skip opus kalau ada m4a
          if (itemExt === 'opus' && hasM4a) return;
          audioFormats.push(formatObj);

        } else if (isItemVideo) {
          // Skip watermark
          if (itemQuality === 'watermark') return;
          // YouTube: skip video-only (tidak ada audioQuality = tidak ada suara)
          if (isYouTube && !audioQ) return;
          // Non-YouTube: skip kalau quality eksplisit "audio"
          if (!isYouTube && itemQuality === 'audio') return;
          videoFormats.push(formatObj);
        }
      });
    } else if (data.url || data.download_url || data.link) {
      const dlUrl     = data.url || data.download_url || data.link;
      const safeTitle = (title || 'media').replace(/[^a-z0-9_\-]/gi, '_').slice(0, 50);
      videoFormats.push({
        format_id:  'best',
        extension:  'mp4',
        resolution: 'Best',
        filesize:   null,
        url:        `/api/download?proxy=${encodeURIComponent(dlUrl)}&filename=${encodeURIComponent(safeTitle + '.mp4')}`,
        note:       'Best quality',
      });
    }

    if (videoFormats.length === 0 && audioFormats.length === 0) {
      res.status(422).json({
        error: 'Tidak ada format tersedia.',
        debug: JSON.stringify(data).slice(0, 300),
      });
      return;
    }

    res.status(200).json({
      title,
      thumbnail: thumb,
      duration:  data.duration || null,
      source,
      videoFormats,
      audioFormats,
    });

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
