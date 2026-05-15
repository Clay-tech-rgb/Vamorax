from flask import Flask, request, jsonify
from flask_cors import CORS
import yt_dlp

app = Flask(__name__)
CORS(app)


@app.route('/api/download', methods=['POST'])
def download_video():
    data = request.get_json(silent=True) or {}
    video_url = data.get('url', '').strip()

    if not video_url:
        return jsonify({"error": "URL tidak boleh kosong"}), 400

    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        # Hindari download — hanya ambil info
        'skip_download': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)

        results = {
            "title": info.get('title', 'Unknown'),
            "thumbnail": info.get('thumbnail'),
            "duration": info.get('duration'),
            "formats": []
        }

        seen = set()
        for f in info.get('formats', []):
            direct_url = f.get('url')
            if not direct_url:
                continue

            # Lewati manifest HLS/DASH — tidak bisa di-download langsung di browser
            if f.get('protocol') in ('m3u8', 'm3u8_native', 'http_dash_segments'):
                continue

            vcodec = f.get('vcodec', 'none')
            acodec = f.get('acodec', 'none')

            # Harus punya setidaknya video atau audio
            if vcodec == 'none' and acodec == 'none':
                continue

            height = f.get('height')
            ext = f.get('ext', '')
            resolution = f"{height}p" if height else "Audio"

            # Deduplikasi berdasarkan resolusi + ekstensi
            key = (resolution, ext)
            if key in seen:
                continue
            seen.add(key)

            results["formats"].append({
                "format_id": f.get('format_id'),
                "extension": ext,
                "resolution": resolution,
                "filesize": f.get('filesize'),
                "url": direct_url,
                "note": f.get('format_note', ''),
                "vcodec": vcodec,
                "acodec": acodec,
            })

        # Urutkan: resolusi tertinggi dulu, audio di bawah
        def sort_key(f):
            res = f['resolution']
            if res == 'Audio':
                return -1
            try:
                return int(res.replace('p', ''))
            except ValueError:
                return 0

        results["formats"] = sorted(results["formats"], key=sort_key, reverse=True)

        return jsonify(results)

    except yt_dlp.utils.DownloadError as e:
        return jsonify({"error": f"Gagal mengambil info: {str(e)}"}), 422
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Entry point untuk Vercel Serverless
def handler(request, context=None):
    return app(request.environ, request.start_response)
