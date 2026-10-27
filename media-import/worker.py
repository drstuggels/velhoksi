"""One disposable process per resolve/download. stdout is a JSON event stream."""
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
from urllib.parse import urlsplit, parse_qs

from network import install_guard, validate_url

MAX_BYTES = 128 * 1024 * 1024
MAX_SECONDS = 60 * 60


def emit(**event):
    print(json.dumps(event, ensure_ascii=False), flush=True)


def spotify_id(url):
    parsed = urlsplit(url)
    if parsed.hostname != 'open.spotify.com':
        return None
    match = re.fullmatch(r'/(?:intl-[a-zA-Z-]+/)?track/([A-Za-z0-9]{22})/?', parsed.path)
    if not match:
        raise ValueError('Paste one Spotify track. Albums, playlists and podcasts are not supported yet.')
    return match[1]


def spotify_metadata(track_id):
    # Public embed metadata avoids shared credentials and unrelated artist/album API requests.
    # This is an isolated adapter: upstream markup can change. Never use the preview as media.
    import requests
    from bs4 import BeautifulSoup
    with requests.get(f'https://open.spotify.com/embed/track/{track_id}', timeout=20, stream=True) as response:
        response.raise_for_status()
        body = bytearray()
        for chunk in response.iter_content(65536):
            body.extend(chunk)
            if len(body) > 2 * 1024 * 1024:
                raise ValueError('Spotify returned an unexpected response. Try a YouTube link instead.')
    script = BeautifulSoup(bytes(body), 'html.parser').find('script', id='__NEXT_DATA__')
    if not script:
        raise ValueError('Spotify metadata is unavailable. Try a YouTube link instead.')
    entity = json.loads(script.string)['props']['pageProps']['state']['data']['entity']
    artists = [a['name'] for a in entity.get('artists', [])]
    if not entity.get('name') or not artists or not entity.get('duration'):
        raise ValueError('This Spotify track has no usable metadata. Try a YouTube link instead.')
    return {'title': entity['name'], 'artists': artists, 'duration': entity['duration'] / 1000,
            'id': track_id, 'url': f'https://open.spotify.com/track/{track_id}'}


def match_spotify(track):
    from spotdl.types.song import Song
    from spotdl.providers.audio.ytmusic import YouTubeMusic
    from spotdl.utils.matching import order_results
    song = Song(name=track['title'], artists=track['artists'], artist=track['artists'][0],
                genres=[], disc_number=1, disc_count=1, album_name='', album_artist=track['artists'][0],
                duration=round(track['duration']), year=0, date='', track_number=1, tracks_count=1,
                song_id=track['id'], explicit=False, publisher='', url=track['url'], isrc=None,
                cover_url=None, copyright_text=None)
    provider = YouTubeMusic()
    query = f"{' '.join(track['artists'])} - {track['title']}"
    found = {}
    for category in ('songs', 'videos'):
        results = provider.get_results(query, filter=category, limit=12, ignore_spelling=True)
        for result, score in order_results(results, song).items():
            if score >= 65 and result.duration and abs(result.duration - track['duration']) <= max(12, track['duration'] * .08):
                found[result.result_id] = {
                    'id': result.result_id, 'url': result.url, 'title': result.name,
                    'artist': ', '.join(result.artists) or result.author,
                    'duration': result.duration, 'score': round(score, 1),
                    'kind': 'song' if result.verified else 'video',
                }
    # The score ranks candidates; it is deliberately not exposed as a certainty percentage.
    return sorted(found.values(), key=lambda r: (r['kind'] == 'song', r['score']), reverse=True)[:5]


class QuietLogger:
    def debug(self, msg): pass
    def warning(self, msg): pass
    def error(self, msg): pass


def downloader(**extra):
    from yt_dlp import YoutubeDL
    options = {
        'quiet': True, 'no_warnings': True, 'logger': QuietLogger(), 'noplaylist': True, 'playlistend': 1,
        'socket_timeout': 15, 'retries': 2, 'fragment_retries': 2, 'extractor_retries': 1,
        'cachedir': False, 'proxy': '', 'enable_file_urls': False, 'max_filesize': MAX_BYTES,
        'js_runtimes': {'node': {}}, 'remote_components': [], 'hls_prefer_native': True,
        'postprocessor_args': {'ffmpeg_i': ['-protocol_whitelist', 'file,pipe']},
        **extra,
    }
    ydl = YoutubeDL(options)
    # Native libcurl bypasses Python socket validation. Use guarded urllib/requests only.
    ydl._request_director.handlers.pop('CurlCFFI', None)
    return ydl


def check_info(info):
    if not info or info.get('_type') in ('playlist', 'multi_video') or info.get('entries') is not None:
        raise ValueError('Paste a link to one recording; collections are not supported yet.')
    if info.get('is_live') or info.get('live_status') in ('is_live', 'is_upcoming'):
        raise ValueError('Live streams cannot be imported. Try a finished recording.')
    duration = info.get('duration')
    if duration and duration > MAX_SECONDS:
        raise ValueError('Imports are limited to one hour per recording.')
    if info.get('has_drm'):
        raise ValueError('This recording is protected and cannot be imported.')
    for selected in info.get('requested_formats') or [info]:
        protocol = selected.get('protocol')
        if protocol and protocol not in ('http', 'https', 'http_dash_segments', 'm3u8_native'):
            raise ValueError('This streaming format cannot be imported. Try a direct media link.')
    if info.get('filesize', 0) and info['filesize'] > MAX_BYTES:
        raise ValueError('This recording exceeds the 128 MB import limit.')


def resolve(url):
    import requests
    parsed = urlsplit(url)
    if parsed.hostname in ('spotify.link', 'spoti.fi'):
        with requests.get(url, timeout=15, stream=True) as response:
            url = validate_url(response.url)
        if urlsplit(url).hostname != 'open.spotify.com':
            raise ValueError('This Spotify share link did not resolve to a track.')
    track_id = spotify_id(url)
    if track_id:
        track = spotify_metadata(track_id)
        emit(state='matching', message='finding the YouTube recording')
        matches = match_spotify(track)
        return {'state': 'choosing', 'source': 'spotify', 'track': track, 'candidates': matches,
                'message': 'choose a recording' if matches else 'No close match found. Paste a YouTube link instead.'}
    if urlsplit(url).path.rstrip('/') in ('/playlist', '/channel', '/albums'):
        raise ValueError('Paste a link to one recording; collections are not supported yet.')
    with downloader(skip_download=True, extract_flat=False) as ydl:
        info = ydl.extract_info(url, download=False)
    check_info(info)
    return {'state': 'choosing', 'source': info.get('extractor_key', 'media'),
            'track': {'title': info.get('title') or 'recording', 'duration': info.get('duration'),
                      'artists': [info.get('artist') or info.get('uploader') or '']},
            'candidates': [{'id': 'original', 'url': url, 'title': info.get('title') or 'recording',
                            'artist': info.get('artist') or info.get('uploader') or '',
                            'duration': info.get('duration'), 'kind': 'original'}],
            'message': 'ready to import'}


def probe(path):
    result = subprocess.run(['ffprobe', '-v', 'error', '-protocol_whitelist', 'file,pipe',
                             '-show_streams', '-show_format', '-of', 'json', str(path)],
                            capture_output=True, timeout=30, check=True)
    return json.loads(result.stdout)


def download(data):
    last = 0

    def progress(event):
        nonlocal last
        count = event.get('downloaded_bytes', 0)
        total = event.get('total_bytes') or event.get('total_bytes_estimate')
        if count > MAX_BYTES or (total and total > MAX_BYTES):
            raise ValueError('This recording exceeds the 128 MB import limit.')
        now = time.monotonic()
        if now - last > .5:
            emit(state='downloading', message='downloading media', progress=min(99, round(count / total * 100)) if total else None)
            last = now

    audio = data['mode'] == 'audio'
    selection = ('bestaudio[ext=m4a]/bestaudio/best' if audio else
                 'bestvideo[height<=720][vcodec^=avc1]+bestaudio[ext=m4a]/best[height<=720]/bestvideo[height<=720]+bestaudio')
    with downloader(format=selection, outtmpl='source.%(ext)s', merge_output_format='mp4',
                    progress_hooks=[progress], restrictfilenames=True,
                    match_filter=lambda info, **_: check_info(info)) as ydl:
        info = ydl.extract_info(validate_url(data['selected']['url']), download=True)
    check_info(info)
    files = [p for p in Path('.').glob('source.*') if p.suffix not in ('.part', '.ytdl') and not re.search(r'\.f\d+\.', p.name)]
    if len(files) != 1:
        raise ValueError('The source could not provide a complete recording.')
    source = files[0]
    details = probe(source)
    streams = details.get('streams', [])
    audio_stream = next((s for s in streams if s['codec_type'] == 'audio'), None)
    video_stream = next((s for s in streams if s['codec_type'] == 'video'), None)
    if not audio_stream:
        raise ValueError('This recording has no audio track.')
    duration = float(details.get('format', {}).get('duration', 0))
    if not 0 < duration <= MAX_SECONDS:
        raise ValueError('The recording must have a seekable duration of one hour or less.')
    emit(state='preparing', message='preparing media', progress=None)
    output = Path('media.m4a' if audio else 'media.mp4')
    args = ['ffmpeg', '-v', 'error', '-nostdin', '-y', '-threads', '1', '-protocol_whitelist', 'file,pipe', '-i', str(source)]
    if not audio:
        if not video_stream:
            raise ValueError('This source has no video. Import it as audio instead.')
        args += ['-map', '0:v:0', '-c:v', 'copy'] if video_stream['codec_name'] == 'h264' else [
            '-map', '0:v:0', '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
            '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-pix_fmt', 'yuv420p']
    args += ['-map', '0:a:0', '-c:a', 'copy'] if audio_stream['codec_name'] == 'aac' else ['-map', '0:a:0', '-c:a', 'aac', '-b:a', '192k']
    args += ['-threads', '1', '-map_metadata', '-1', '-movflags', '+faststart', '-fs', str(MAX_BYTES + 1), str(output)]
    subprocess.run(args, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, timeout=300, check=True)
    if not output.is_file() or not 0 < output.stat().st_size <= MAX_BYTES:
        raise ValueError('The prepared file exceeds the 128 MB import limit.')
    final_duration = float(probe(output)['format']['duration'])
    if abs(final_duration - duration) > 1:
        raise ValueError('The download was incomplete. Please retry.')
    title = data['track']['title']
    artist = ', '.join(data['track'].get('artists', []))
    filename = re.sub(r'[\x00-\x1f/\\:*?"<>|]', '_', f'{artist} - {title}' if artist else title)[:160] + output.suffix
    for path in Path('.').glob('source.*'):
        path.unlink(missing_ok=True)
    return {'state': 'ready', 'message': 'ready to save locally', 'filename': filename,
            'mime': 'audio/mp4' if audio else 'video/mp4', 'bytes': output.stat().st_size,
            'duration': final_duration, 'file': output.name,
            'provenance': {'inputUrl': data['url'], 'sourceUrl': data['selected']['url'],
                           'sourceId': info.get('id', ''), 'provider': data.get('source', 'media'),
                           'title': title, 'artist': artist, 'matchedTitle': data['selected']['title'],
                           'importedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}}


def main():
    # No ambient proxy, credentials, cookies, or yt-dlp configuration enters an import.
    for key in list(os.environ):
        if key.lower().endswith('_proxy'):
            os.environ.pop(key)
    install_guard()
    data = json.load(sys.stdin)
    try:
        result = resolve(validate_url(data['url'])) if data['action'] == 'resolve' else download(data)
        emit(**result)
    except Exception as error:
        # Keep upstream URLs, signed parameters and arbitrary extractor logs out of the API.
        message = str(error) if isinstance(error, ValueError) else 'The source could not be imported. It may be unavailable or temporarily blocking downloads. Try another link or a local file.'
        emit(state='failed', message=message[:300], progress=None)
        sys.exit(1)


if __name__ == '__main__':
    main()
