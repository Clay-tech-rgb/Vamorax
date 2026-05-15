// api/download.js — Metadata only, no download backend
// Menggunakan YouTube oEmbed API (gratis, no key required)

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { url } = req.body || {};
  if (!url?.trim()) { res.status(400).json({ error: 'URL kosong' }); return; }

  const videoUrl = url.trim();

  // Deteksi YouTube
  const ytMatch = videoUrl.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );

  if (ytMatch) {
    const videoId = ytMatch[1];
    try {
      // YouTube oEmbed — gratis, no API key
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
        { signal: AbortSignal.timeout(8000) }
      );

      if (!oembedRes.ok) {
        res.status(422).json({ error: 'Video tidak ditemukan atau privat.' });
        return;
      }

      const oembed = await oembedRes.json();

      // Return metadata + format list (URL kosong — download handled by teman)
      res.status(200).json({
        source:    'youtube',
        title:     oembed.title || 'YouTube Video',
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        author:    oembed.author_name || '',
        videoId,
        videoFormats: [
          { format_id: 'yt_1080', extension: 'mp4', resolution: '1080p', note: 'Full HD', url: null },
          { format_id: 'yt_720',  extension: 'mp4', resolution: '720p',  note: 'HD',      url: null },
          { format_id: 'yt_480',  extension: 'mp4', resolution: '480p',  note: 'SD',      url: null },
          { format_id: 'yt_360',  extension: 'mp4', resolution: '360p',  note: 'Low',     url: null },
        ],
        audioFormats: [
          { format_id: 'yt_mp3_hi',  extension: 'mp3', resolution: '320kbps', note: 'High Quality', url: null },
          { format_id: 'yt_mp3_med', extension: 'mp3', resolution: '128kbps', note: 'Standard',     url: null },
        ],
      });
    } catch (err) {
      res.status(500).json({ error: 'Gagal mengambil info video: ' + err.message });
    }
    return;
  }

  // Non-YouTube — coming soon
  const source = detectSource(videoUrl);
  res.status(200).json({
    source,
    title:        `${source.charAt(0).toUpperCase() + source.slice(1)} Video`,
    thumbnail:    null,
    author:       '',
    videoFormats: [
      { format_id: 'best', extension: 'mp4', resolution: 'Best', note: 'Best quality', url: null },
    ],
    audioFormats: [
      { format_id: 'audio', extension: 'mp3', resolution: '128kbps', note: 'Standard', url: null },
    ],
  });
};

function detectSource(url) {
  if (url.includes('tiktok.com'))                          return 'tiktok';
  if (url.includes('instagram.com'))                       return 'instagram';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  if (url.includes('facebook.com') || url.includes('fb.watch')) return 'facebook';
  return 'unknown';
}
