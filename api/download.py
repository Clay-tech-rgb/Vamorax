from http.server import BaseHTTPRequestHandler
import json
import subprocess
import sys
import os

class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors()
        self.end_headers()

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length)
        try:
            data = json.loads(body)
        except Exception:
            self._json(400, {'error': 'Invalid JSON'})
            return

        url = (data.get('url') or '').strip()
        if not url:
            self._json(400, {'error': 'URL tidak boleh kosong'})
            return

        try:
            result = subprocess.run(
                ['yt-dlp', '--dump-json', '--no-playlist', '--quiet', '--no-warnings', url],
                capture_output=True, text=True, timeout=25
            )
            if result.returncode != 0:
                self._json(422, {'error': result.stderr.strip() or 'yt-dlp error'})
                return

            info = json.loads(result.stdout)
        except subprocess.TimeoutExpired:
            self._json(504, {'error': 'Timeout — coba lagi'})
            return
        except Exception as e:
            self._json(500, {'error': str(e)})
            return

        seen = set()
        formats = []
        for f in info.get('formats', []):
            direct_url = f.get('url')
            if not direct_url:
                continue
            if f.get('protocol') in ('m3u8', 'm3u8_native', 'http_dash_segments'):
                continue
            vcodec = f.get('vcodec', 'none')
            acodec = f.get('acodec', 'none')
            if vcodec == 'none' and acodec == 'none':
                continue
            height = f.get('height')
            ext = f.get('ext', '')
            resolution = f'{height}p' if height else 'Audio'
            key = f'{resolution}|{ext}'
            if key in seen:
                continue
            seen.add(key)
            formats.append({
                'format_id': f.get('format_id'),
                'extension': ext,
                'resolution': resolution,
                'filesize': f.get('filesize'),
                'url': direct_url,
                'note': f.get('format_note', ''),
                'vcodec': vcodec,
                'acodec': acodec,
            })

        formats.sort(key=lambda f: (
            -1 if f['resolution'] == 'Audio'
            else int(f['resolution'].replace('p', '')) if f['resolution'].endswith('p') else 0
        ), reverse=True)

        self._json(200, {
            'title': info.get('title', 'Unknown'),
            'thumbnail': info.get('thumbnail'),
            'duration': info.get('duration'),
            'formats': formats,
        })

    def _set_cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def _json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self._set_cors()
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass  # suppress default logging
