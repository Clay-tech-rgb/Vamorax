// api/download.js — Vercel Serverless Function (Node.js)
// Proxy ke ZM Social Downloader via RapidAPI

const RAPIDAPI_KEY  = process.env.RAPIDAPI_KEY || '2ff9169c12msh5bbb61f87b95b8cp10a495jsn57c534267f4a';
const RAPIDAPI_HOST = 'zm-api.p.rapidapi.com';

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
    const apiUrl = `https://${RAPIDAPI_HOST}/v1/social/autolink?url=${encodeURIComponent(url.trim())}`;

    const apiRes = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'content-type': 'application/json',
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': RAPIDAPI_KEY,
      },
      signal: AbortSignal.timeout(25000),
    });

    const data = await apiRes.json();

    if (!apiRes.ok || data.error || data.status === false) {
      res.status(422).json({ error: data.error || data.message || 'Gagal memproses URL' });
      return;
    }

    // Parse response — cek berbagai kemungkinan struktur
    const formats = [];
    const thumb   = data.thumbnail || data.thumb || data.cover || data.image || null;
    const title   = data.title || data.filename || data.desc || extractTitle(url.trim());

    // Format bisa ada di: data.medias, data.links, data.data, data.videos, atau langsung data.url
    const mediaList = data.medias || data.links || data.videos || data.data || [];

    if (Array.isArray(mediaList) && mediaList.length > 0) {
      const hasAudioItem = mediaList.some(m =>
        (m.type || '').toLowerCase() === 'audio' ||
        (m.ext || '').toLowerCase() === 'm4a' ||
        (m.ext || '').toLowerCase() === 'opus'
      );

      mediaList.forEach((item, i) => {
        const dlUrl = item.url || item.link || item.download_url || item.src;
        if (!dlUrl) return;

        const itemType = (item.type || '').toLowerCase();
        const itemExt  = (item.ext || '').toLowerCase();
        const isItemAudio = itemType === 'audio' || itemExt === 'm4a' || itemExt === 'opus';
        const isItemVideo = itemType === 'video';

        // Untuk video: hanya ambil format yang punya audio (audioQuality tidak null)
        // atau format merged (biasanya formatId 18/22 di YouTube)
        if (isItemVideo) {
          const hasAudio = item.audioQuality && item.audioQuality !== null;
          const isMerged = item.is_audio === true || hasAudio;
          if (!isMerged) return; // skip video-only streams
        }

        // Filter sesuai pilihan user
        if (isAudio && !isItemAudio && hasAudioItem) return;
        if (!isAudio && isItemAudio) return;

        // zm-api pakai field "label" untuk kualitas
        const quality = item.label || item.quality || item.resolution || item.type || (isItemAudio ? 'Audio' : 'Video');
        const ext     = item.ext || item.extension || (isItemAudio ? 'm4a' : 'mp4');

        formats.push({
          format_id: item.formatId || item.format_id || `f${i}`,
          extension: ext,
          resolution: quality,
          filesize: item.filesize || item.size || item.clen || null,
          url: dlUrl,
          note: quality,
        });
      });
    } else if (data.url || data.download_url || data.link) {
      formats.push({
        format_id: 'best',
        extension: isAudio ? 'mp3' : 'mp4',
        resolution: isAudio ? 'Audio' : 'Best',
        filesize: null,
        url: data.url || data.download_url || data.link,
        note: 'Best quality',
      });
    }

    if (formats.length === 0) {
      // Kembalikan raw data untuk debug
      res.status(422).json({
        error: 'Tidak ada format tersedia. Raw: ' + JSON.stringify(data).slice(0, 200)
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
    if (u.hostname.includes('tiktok')) return 'TikTok Video';
    if (u.hostname.includes('instagram')) return 'Instagram Media';
    if (u.hostname.includes('twitter') || u.hostname.includes('x.com')) return 'Twitter Video';
    if (u.hostname.includes('facebook')) return 'Facebook Video';
    return 'Media';
  } catch { return 'Media'; }
}
