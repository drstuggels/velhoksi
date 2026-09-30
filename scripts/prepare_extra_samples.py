#!/usr/bin/env python3
"""Import the additional instruments from pinned SFZ mappings and original recordings.

WAV files are losslessly packed as FLAC, preserving PCM, rate, channels and metadata.
No resampling, normalization, denoising or trimming. Requires the `flac` encoder.
Run on its own to extend the existing bank, or via prepare_ear_samples.py.
"""
import concurrent.futures
import hashlib
import json
import pathlib
import re
import shutil
import struct
import subprocess
import tempfile
import urllib.parse
from prepare_ear_samples import DEST, ROOT, fetch, flac_loop

SOURCES = {
    'vcsl': ('sgossner/VCSL', 'b6e6ac82d22248edee98a0bde185eb9ef6d439ad'),
    'shinyguitar': ('sfzinstruments/karoryfer.shinyguitar', '57243cca85277dbcc120ce17c6178032f93c80f3'),
    'rhodes': ('sfzinstruments/jlearman.jRhodes3d', 'aea5b8d3e11e2f7102593789a4e0a0e41b30271a'),
}
# id, display name, family, SFZ path. Each variant keeps its own authored mapping.
VCSL = [
    ('vibraphone', 'vibraphone · soft mallets', 'mallets', 'Idiophones/Struck Idiophones/Vibraphone - Soft Mallets.sfz'),
    ('vibraphone-hard', 'vibraphone · hard mallets', 'mallets', 'Idiophones/Struck Idiophones/Vibraphone - Hard Mallets.sfz'),
    ('bowed-vibraphone', 'bowed vibraphone', 'mallets', 'Idiophones/Struck Idiophones/Vibraphone - Bowed.sfz'),
    ('marimba', 'marimba', 'mallets', 'Idiophones/Struck Idiophones/Marimba.sfz'),
    ('renaissance-organ', 'Renaissance organ · 8′', 'organs', "Aerophones/Edge-blown Aerophones/Renaissance Organ - 8'.sfz"),
    ('renaissance-organ-full', 'Renaissance organ · full', 'organs', 'Aerophones/Edge-blown Aerophones/Renaissance Organ - Full.sfz'),
    ('pipe-organ', 'pipe organ · quiet', 'organs', 'Aerophones/Edge-blown Aerophones/Pipe Organ - Quiet.sfz'),
    ('pipe-organ-full', 'pipe organ · full', 'organs', 'Aerophones/Edge-blown Aerophones/Pipe Organ - Loud.sfz'),
    ('tx81z', 'TX81Z · FM piano', 'synths', 'Electrophones/TX81Z - FM Piano.sfz'),
    ('tx81z-clavi', 'TX81Z · clavisynth', 'synths', 'Electrophones/TX81Z - Clavisynth.sfz'),
    ('tx81z-piano', 'TX81Z · piano', 'synths', 'Electrophones/TX81Z - Piano 1.sfz'),
    ('concert-harp', 'concert harp', 'plucked strings', 'Chordophones/Composite Chordophones/Concert Harp.sfz'),
    ('kalimba', 'kalimba · Kenya', 'plucked strings', 'Idiophones/Plucked Idiophones/Kalimba, Kenya.sfz'),
    ('kalimba-tanzania', 'kalimba · Tanzania', 'plucked strings', 'Idiophones/Plucked Idiophones/Kalimba, Tanzania.sfz'),
]


def url(bank, path):
    repo, revision = SOURCES[bank]
    # The release declares CC0 in its README; the full license was added later.
    if bank == 'vcsl' and path == 'LICENSE':
        revision = 'c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e'
    return f'https://raw.githubusercontent.com/{repo}/{revision}/' + urllib.parse.quote(path)


def document(bank, path, local_name=None):
    data = fetch(url(bank, path))
    dest = DEST / bank / (local_name or pathlib.PurePosixPath(path).name)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return data.decode('utf-8-sig')


def pitch(value):
    if re.fullmatch(r'-?\d+', value):
        return int(value)
    note, accidental, octave = re.fullmatch(r'([A-Ga-g])([#b]?)(-?\d+)', value).groups()
    return (int(octave) + 1) * 12 + {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}[note.upper()] + {'': 0, '#': 1, 'b': -1}[accidental]


def sfz_regions(text):
    # Preserve the SFZ's numeric pitch roots, including its octave corrections.
    text = re.sub(r'//[^\n]*', '', text)
    global_values, master, group = {}, {}, {}
    for section, contents in re.findall(r'<(\w+)>([^<]*)', text):
        values = {k: v.strip() for k, v in re.findall(r'(\w+)\s*=\s*(.*?)(?=\s+\w+\s*=|\Z)', contents, re.S)}
        if section == 'global':
            global_values = values
        elif section == 'master':
            master = values
        elif section == 'group':
            group = values
        elif section == 'region':
            yield {**global_values, **master, **group, **values}


def flac_info(path):
    data = path.read_bytes()
    if data[:4] != b'fLaC':
        raise ValueError(f'Invalid FLAC source: {path}')
    block = data[8:42]
    packed = int.from_bytes(block[10:18], 'big')
    rate = packed >> 44
    frames = packed & ((1 << 36) - 1)
    return {'sampleRate': rate, 'channels': ((packed >> 41) & 7) + 1,
            'bitDepth': ((packed >> 36) & 31) + 1, 'duration': frames / rate,
            'pcmMD5': block[18:34].hex()}


def repair_wav_container(data):
    """Repackage valid PCM chunks when an upstream WAV has malformed trailing tags."""
    if data[:4] != b'RIFF' or data[8:12] != b'WAVE':
        raise ValueError('Expected a RIFF WAV recording')
    chunks = {}
    pos = 12
    while pos + 8 <= len(data):
        tag, size = struct.unpack_from('<4sI', data, pos)
        payload = data[pos + 8:pos + 8 + size]
        if len(payload) != size:
            break
        if tag in (b'fmt ', b'smpl', b'data'):
            chunks[tag] = payload
        pos += 8 + size + size % 2
    if b'fmt ' not in chunks or b'data' not in chunks:
        raise ValueError('WAV has no complete PCM payload')
    body = b'WAVE'
    for tag, payload in chunks.items():
        body += tag + struct.pack('<I', len(payload)) + payload + (b'\0' if len(payload) % 2 else b'')
    return b'RIFF' + struct.pack('<I', len(body)) + body


def extend_manifest():
    encoder = shutil.which('flac')
    if not encoder:
        raise RuntimeError('Install the FLAC encoder to preserve the original PCM losslessly.')
    manifest = json.loads((DEST / 'manifest.json').read_text())
    # Retain the existing piano recordings and their provenance unchanged.
    instruments = {k: v for k, v in manifest['instruments'].items() if k in ('salamander', 'wurlitzer')}
    files = {k: v for k, v in manifest['files'].items() if k.split('/')[0] in ('salamander', 'wurlitzer')}
    instruments['salamander']['family'] = 'keys'
    instruments['wurlitzer'].update(family='keys', drone=True)
    jobs = {}
    for bank in SOURCES:
        document(bank, 'LICENSE', 'LICENSE.txt')
    document('rhodes', 'README.md', 'UPSTREAM-README.md')
    document('shinyguitar', 'readme.txt', 'UPSTREAM-README.txt')
    document('vcsl', 'README.md', 'UPSTREAM-README.md')
    document('vcsl', 'Aerophones/Edge-blown Aerophones/Pipe Organ/Info.txt', 'PIPE-ORGAN-CREDITS.txt')
    document('vcsl', 'Electrophones/TX81Z/Origin.txt', 'TX81Z-ORIGIN.txt')

    def add(bank, id, name, family, sfz_path, sample_base=None, release_sfz=None):
        repo, revision = SOURCES[bank]
        source_text = document(bank, sfz_path, id + '.SOURCE.sfz')
        instrument = {
            'name': name, 'family': family,
            'author': {'vcsl': 'Versilian Studios LLC; pipe organ recorded by Simon Dalzell / Ivy Audio',
                       'shinyguitar': 'D. Smolken / Karoryfer Samples', 'rhodes': 'Jeffrey Learman'}[bank],
            'source': f'https://github.com/{repo}', 'revision': revision,
            'license': 'CC BY-NC 4.0' if bank == 'rhodes' else 'CC0 1.0',
            'licenseFile': bank + '/LICENSE.txt', 'licenseSource': url(bank, 'LICENSE'),
            'mapping': 'Adapted from the original SFZ; original pitch roots, tuning, gain, offsets and velocity layers retained.',
            'release': .3, 'gain': .7 if bank == 'shinyguitar' else .5,
            'regions': [],
        }
        if family == 'organs':
            instrument.update(drone=True, sustainLoop='crossfade')
        base = pathlib.PurePosixPath(sample_base or str(pathlib.PurePosixPath(sfz_path).parent))

        def convert_region(values):
            low = max(36, pitch(values.get('lokey', values.get('key', '0'))))
            high = min(84, pitch(values.get('hikey', values.get('key', '127'))))
            if low > high:
                return None
            sample_path = str(base / values['sample'].replace('\\', '/'))
            stem = re.sub(r'[^a-zA-Z0-9_.-]', '_', pathlib.PurePosixPath(sample_path).stem)
            filename = f"{bank}/{hashlib.sha256(sample_path.encode()).hexdigest()[:12]}-{stem}.flac"
            jobs[filename] = {'source': url(bank, sample_path), 'path': sample_path}
            region = {'file': filename, 'root': pitch(values.get('pitch_keycenter', values.get('key', '60'))),
                      'low': low, 'high': high, 'velLow': max(1, int(values.get('lovel', 1))),
                      'velHigh': int(values.get('hivel', 127)), 'tune': float(values.get('tune', 0)),
                      'volume': float(values.get('volume', 0)), 'offsetFrames': int(values.get('offset', 0)),
                      'attack': float(values.get('ampeg_attack', .003)),
                      'release': float(values.get('ampeg_release', .3)),
                      'velocityTracking': float(values.get('amp_veltrack', 100))}
            for key, dest in [('xfin_lovel', 'fadeInLow'), ('xfin_hivel', 'fadeInHigh'),
                              ('xfout_lovel', 'fadeOutLow'), ('xfout_hivel', 'fadeOutHigh')]:
                if key in values:
                    region[dest] = int(values[key])
            # Entries with the same key/velocity mapping are alternate recorded takes.
            region['variantGroup'] = ':'.join(str(region.get(k, '')) for k in
                ['root', 'low', 'high', 'velLow', 'velHigh', 'fadeInLow', 'fadeInHigh', 'fadeOutLow', 'fadeOutHigh'])
            return region

        for values in sfz_regions(source_text):
            region = convert_region(values)
            if region:
                instrument['regions'].append(region)
        if release_sfz:
            text = document(bank, release_sfz, id + '.RELEASE-SOURCE.sfz')
            instrument['releaseRegions'] = [r for v in sfz_regions(text) if (r := convert_region(v))]
            instrument['releaseNoiseGain'] = .12
        instrument['range'] = [min(r['low'] for r in instrument['regions']), max(r['high'] for r in instrument['regions'])]
        instruments[id] = instrument

    for signal, name in [('electric', 'guitar · clean electric'), ('acoustic', 'guitar · acoustic')]:
        add('shinyguitar', 'guitar-' + signal, name, 'guitars', f'Programs/{signal}_one.sfz',
            'Samples', f'Programs/{signal}_release.sfz')
    for id, name, family, sfz in VCSL:
        add('vcsl', id, name, family, sfz)
    add('rhodes', 'rhodes', 'Rhodes Mark I', 'keys', 'jRhodes3d-mono/_jRhodes3d-mono-no-xfade-flac.sfz')

    checkpoint = ROOT / '.cache' / 'ear-samples.json'
    checkpoint.parent.mkdir(parents=True, exist_ok=True)
    previous = {**manifest['files'], **(json.loads(checkpoint.read_text()) if checkpoint.exists() else {})}
    def download(item):
        name, info = item
        dest = DEST / name
        old = previous.get(name)
        if dest.exists() and old and old.get('source') == info['source']:
            return name, old
        if dest.exists() and dest.stat().st_size > 42:
            encoded = dest.read_bytes()
            return name, {'source': info['source'], 'encoding': 'original FLAC' if info['path'].endswith('.flac') else 'lossless WAV to FLAC',
                          'bytes': len(encoded), 'sha256': hashlib.sha256(encoded).hexdigest(), **flac_info(dest)}
        data = fetch(info['source'])
        source_hash = hashlib.sha256(data).hexdigest()
        dest.parent.mkdir(parents=True, exist_ok=True)
        if info['path'].endswith('.flac'):
            dest.write_bytes(data)
            encoding = 'original FLAC'
        else:
            with tempfile.TemporaryDirectory(prefix='velhoksi-sample-') as folder:
                wav = pathlib.Path(folder) / 'original.wav'
                wav.write_bytes(data)
                command = [encoder, '--silent', '--best', '--keep-foreign-metadata', '--force', '--output-name=' + str(dest), str(wav)]
                result = subprocess.run(command, capture_output=True)
                encoding = 'lossless WAV to FLAC; original PCM and RIFF metadata preserved'
                if result.returncode:
                    # A few TX81Z WAVs omit a pad byte before their trailing INFO tag.
                    # Repair the container only, retaining every PCM sample unchanged.
                    wav.write_bytes(repair_wav_container(data))
                    subprocess.run(command, check=True, capture_output=True)
                    encoding = 'lossless WAV to FLAC; WAV container repaired, original PCM preserved'
        encoded = dest.read_bytes()
        return name, {'source': info['source'], 'sourceSha256': source_hash, 'encoding': encoding,
                      'bytes': len(encoded), 'sha256': hashlib.sha256(encoded).hexdigest(), **flac_info(dest)}

    print(f'Importing {len(jobs)} additional recordings across {len(instruments) - 2} presets…', flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        for i, (name, metadata) in enumerate(executor.map(download, jobs.items()), 1):
            files[name] = metadata
            if i % 40 == 0 or i == len(jobs):
                checkpoint.write_text(json.dumps(files))
                print(f'{i}/{len(jobs)} recordings prepared', flush=True)
    for id, instrument in instruments.items():
        for region in instrument['regions'] + instrument.get('releaseRegions', []):
            if 'offsetFrames' in region:
                region['offset'] = region.pop('offsetFrames') / files[region['file']]['sampleRate']
            if id not in ('salamander', 'wurlitzer'):
                region.update(flac_loop(DEST / region['file']))
                # Organ recordings have no authored loop. A crossfaded section of the
                # held note is built in memory at playback; the stored PCM is untouched.
                if instrument.get('sustainLoop') and 'loopEnd' not in region:
                    duration = files[region['file']]['duration']
                    offset = region.get('offset', 0)
                    region.update(loopStart=offset + (duration - offset) * .25,
                                  loopEnd=offset + (duration - offset) * .65,
                                  loopCrossfade=.06)
        names = {r['file'] for r in instrument['regions'] + instrument.get('releaseRegions', [])}
        instrument['bytes'] = sum(files[n]['bytes'] for n in names)
    manifest.update(version=2, instruments=instruments, files=files)
    (DEST / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    catalog = [{'id': id, **{k: instrument[k] for k in ['name', 'family', 'range', 'license']},
                'drone': instrument.get('drone', False)} for id, instrument in instruments.items()]
    (ROOT / 'ear-training' / 'instruments.mjs').write_text(
        '// Generated by scripts/prepare_extra_samples.py from the pinned sample mappings.\n'
        + 'export const INSTRUMENTS = ' + json.dumps(catalog, indent=2, ensure_ascii=False) + ';\n'
        + 'export const instrumentById = id => INSTRUMENTS.find(instrument => instrument.id === id) || INSTRUMENTS[0];\n')
    print(f'Prepared {len(files)} recordings, {sum(f["bytes"] for f in files.values()) / 1048576:.1f} MiB total.', flush=True)


if __name__ == '__main__':
    extend_manifest()
