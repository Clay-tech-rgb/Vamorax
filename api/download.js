// api/download.js — Vercel Serverless Function (Node.js)
// Proxy ke All Media Downloader via RapidAPI

const RAPIDAPI_KEY  = '2ff9169c12msh5bbb61f87b95b8cp10a495jsn57c534267f4a';
const RAPIDAPI_HOST = 'all-media-downloader1.p.rapidapi.com';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { url, isAudio } = req.body || {};
  if (!url || !url.trim()) {
    res.status(400).json({ error: 'URL tidak boleh kosong' });
    return;
  }

  try {
    const params = new URLSearchParams({
      url: url.trim(),
      cookies: '',
      cookies_file: '',
    });

    const apiRes = await fetch(`https://${RAPIDAPI_HOST}/all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': RAPIDAPI_KEY,
      },
      body: params.toString(),
      signal: AbortSignal.timeout(25000),
    });

    const data = await apiRes.json();

    if (!apiRes.ok || data.error) {
      res.status(422).json({ error: data.error || data.message || 'Gagal memproses URL' });
      return;
    }

    // Normalkan response ke format frontend kita
    const formats = [];

    // Cek berbagai format response yang mungkin dikembalikan API ini
    const videos = data.videos || data.formats || data.links || [];
    const thumb  = data.thumbnail || data.thumb || data.image || null;
    const title  = data.title || data.filename || extractTitle(url.trim());

    if (Array.isArray(videos) && videos.length > 0) {
      videos.forEach((v, i) => {
        const dlUrl = v.url || v.link || v.download_url;
        if (!dlUrl) return;
        const quality = v.quality || v.resolution || v.format || (isAudio ? 'Audio' : 'Video');
        const ext     = v.ext || v.extension || v.format || (isAudio ? 'mp3' : 'mp4');
        formats.push({
          format_id: v.format_id || `f${i}`,
          extension: ext,
          resolution: quality,
          filesize: v.filesize || v.size || null,
          url: dlUrl,
          note: v.note || quality,
        });
      });
    } else if (data.url || data.download_url || data.link) {
      // Single URL response
      const dlUrl = data.url || data.download_url || data.link;
      formats.push({
        format_id: 'best',
        extension: isAudio ? 'mp3' : 'mp4',
        resolution: isAudio ? 'Audio' : 'Best',
        filesize: null,
        url: dlUrl,
        note: 'Best quality',
      });
    }

    if (formats.length === 0) {
      res.status(422).json({ error: 'Tidak ada format yang tersedia untuk URL ini' });
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
    if (u.hostname.includes('tiktok')) return 'TikTok Video';
    if (u.hostname.includes('instagram')) return 'Instagram Media';
    if (u.hostname.includes('twitter') || u.hostname.includes('x.com')) return 'Twitter Video';
    if (u.hostname.includes('facebook')) return 'Facebook Video';
    return 'Media';
  } catch { return 'Media'; }
}
