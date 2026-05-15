// api/download.js — Vercel Serverless Function (Node.js)
// Proxy ke cobalt.tools API v10

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
    // Cobalt v10 API — instance publik
    const cobaltRes = await fetch('https://api.cobalt.tools/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        url: url.trim(),
        videoQuality: 'max',
        audioFormat: 'mp3',
        audioBitrate: '320',
        filenameStyle: 'basic',
        downloadMode: isAudio ? 'audio' : 'auto',
        twitterGif: false,
        youtubeVideoCodec: 'h264',
      }),
      signal: AbortSignal.timeout(25000),
    });

    const data = await cobaltRes.json();

    // cobalt v10 status: "tunnel", "redirect", "picker", "error"
    if (data.status === 'error') {
      res.status(422).json({ error: data.error?.code || 'Cobalt gagal memproses URL ini' });
      return;
    }

    const formats = [];

    if (data.status === 'tunnel' || data.status === 'redirect') {
      formats.push({
        format_id: 'best',
        extension: isAudio ? 'mp3' : 'mp4',
        resolution: isAudio ? 'Audio' : 'Best',
        filesize: null,
        url: data.url,
        note: 'Best quality',
      });
    } else if (data.status === 'picker') {
      (data.picker || []).forEach((item, i) => {
        formats.push({
          format_id: `pick_${i}`,
          extension: item.type === 'photo' ? 'jpg' : (isAudio ? 'mp3' : 'mp4'),
          resolution: item.type === 'photo' ? 'Photo' : (isAudio ? 'Audio' : 'Video'),
          filesize: null,
          url: item.url,
          note: item.type || '',
        });
      });
    }

    res.status(200).json({
      title: extractTitle(url.trim()),
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
