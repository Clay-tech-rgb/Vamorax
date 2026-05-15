// api/download.js — Vercel Serverless Function (Node.js)
const RAPIDAPI_KEY  = process.env.RAPIDAPI_KEY || '2ff9169c12msh5bbb61f87b95b8cp10a495jsn57c534267f4a';
const RAPIDAPI_HOST = 'zm-api.p.rapidapi.com';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { url, isAudio } = req.body || {};
  if (!url || !url.trim()) { res.status(400).json({ error: 'URL kosong' }); return; }

  try {
    const apiRes = await fetch(
      `https://${RAPIDAPI_HOST}/v1/social/autolink?url=${encodeURIComponent(url.trim())}`,
      {
        headers: { 'x-rapidapi-host': RAPIDAPI_HOST, 'x-rapidapi-key': RAPIDAPI_KEY },
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

        const itemType = (item.type || '').toLowerCase();
        const itemExt  = (item.ext  || '').toLowerCase();
        const isItemAudio = itemType === 'audio';
        const isItemVideo = itemType === 'video';

        if (isItemVideo) {
          if (item.audioQuality == null) return;   // video-only, skip
          if (isAudio) return;                      // user minta audio, skip video
        }
        if (isItemAudio) {
          if (!isAudio) return;                     // user minta video, skip audio
          // prefer m4a, skip opus kalau ada m4a
          if (itemExt === 'opus' && mediaList.some(m =>
            (m.type||'').toLowerCase() === 'audio' && (m.ext||'').toLowerCase() === 'm4a'
          )) return;
        }
        if (!isItemAudio && !isItemVideo) return;

        const quality = item.label || item.quality || (isItemAudio ? 'Audio' : 'Video');
        const ext     = itemExt || (isItemAudio ? 'm4a' : 'mp4');

        formats.push({
          format_id:  item.formatId || `f${i}`,
          extension:  ext,
          resolution: quality,
          filesize:   item.filesize || item.size || null,
          url:        dlUrl,   // direct URL — frontend yang handle download via fetch+blob
          note:       quality,
        });
      });
    } else if (data.url || data.download_url || data.link) {
      formats.push({
        format_id:  'best',
        extension:  isAudio ? 'm4a' : 'mp4',
        resolution: isAudio ? 'Audio' : 'Best',
        filesize:   null,
        url:        data.url || data.download_url || data.link,
        note:       'Best quality',
      });
    }

    if (formats.length === 0) {
      res.status(422).json({ error: 'Tidak ada format tersedia.', debug: JSON.stringify(data).slice(0,300) });
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
