#!/usr/bin/env python3
"""Build smaller Opus alternatives from the checked-in FLAC bank (requires ffmpeg).

Run after preparing the original samples. Preserves channels, duration, gain and
all mappings; originals remain untouched. Only smaller alternatives are shipped.
"""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'audio/samples'
TIERS = {'saver': 64, 'balanced': 128, 'high': 192}
RECIPE = ['-c:a', 'libopus', '-application', 'audio', '-vbr', 'on',
          '-compression_level', '10', '-frame_duration', '20', '-map_metadata', '-1']


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate_timing(source, encoded):
    """Check decoded duration/channel metadata, including Opus encoder pre-skip."""
    packed = int.from_bytes(source.read_bytes()[18:26], 'big')
    rate, frames = packed >> 44, packed & ((1 << 36) - 1)
    channels = ((packed >> 41) & 7) + 1
    data = encoded.read_bytes()
    offset, granule, head = 0, 0, None
    while offset < len(data):
        assert data[offset:offset + 4] == b'OggS', encoded
        segments = data[offset + 26]
        start = offset + 27 + segments
        end = start + sum(data[offset + 27:start])
        if head is None:
            head = data[start:end]
            assert head[:8] == b'OpusHead' and head[9] == channels, encoded
        granule = int.from_bytes(data[offset + 6:offset + 14], 'little')
        offset = end
    preskip = int.from_bytes(head[10:12], 'little')
    assert abs((granule - preskip) / 48000 - frames / rate) <= 1 / rate + 1 / 48000, encoded


def main():
    manifest = json.loads((BASE / 'manifest.json').read_text())
    catalog_path = BASE / 'qualities.json'
    old = json.loads(catalog_path.read_text()) if catalog_path.exists() else {}
    encoder = subprocess.check_output(['ffmpeg', '-version'], text=True).splitlines()[0]
    recipe = {'encoder': encoder, 'options': RECIPE, 'bitrates': TIERS}
    reusable = old.get('recipe') == recipe

    def encode(item):
        name, meta = item
        source = BASE / name
        source_hash = sha(source)
        previous = old.get('files', {}).get(name, {}) if reusable else {}
        variants = {}
        for tier, bitrate in TIERS.items():
            relative = (Path('opus') / tier / Path(name).with_suffix('.opus')).as_posix()
            target = BASE / relative
            prior = previous.get('variants', {}).get(tier)
            if previous.get('sourceSha256') == source_hash:
                if prior is None:
                    continue  # The previous encode was larger than FLAC.
                if target.exists() and sha(target) == prior['sha256']:
                    validate_timing(source, target)
                    variants[tier] = prior
                    continue
            target.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(suffix='.opus', dir=target.parent) as tmp:
                subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', str(source),
                                *RECIPE, '-b:a', f'{bitrate}k', tmp.name], check=True)
                encoded = Path(tmp.name)
                if encoded.stat().st_size < meta['bytes']:
                    validate_timing(source, encoded)
                    data = encoded.read_bytes()
                    target.write_bytes(data)
                    variants[tier] = {'file': relative, 'bytes': len(data),
                                      'sha256': hashlib.sha256(data).hexdigest()}
                else:
                    target.unlink(missing_ok=True)
        return name, {'sourceSha256': source_hash, 'variants': variants}

    files = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for index, (name, entry) in enumerate(pool.map(encode, manifest['files'].items()), 1):
            files[name] = entry
            if index % 100 == 0:
                print(f'{index} / {len(manifest["files"])} recordings', flush=True)
    result = {'version': 1, 'recipe': recipe, 'files': files}
    catalog_path.write_text(json.dumps(result, indent=2) + '\n')
    for tier in [*TIERS, 'original']:
        total = sum(files[name]['variants'].get(tier, meta)['bytes'] for name, meta in manifest['files'].items())
        print(f'{tier}: {total / 1048576:.1f} MiB', flush=True)


if __name__ == '__main__':
    main()
