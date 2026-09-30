#!/usr/bin/env python3
"""Vendor original lossless instrument recordings and their SFZ metadata.

No resynthesis, normalization, truncation, or lossy encoding is performed.
Run from any directory. Sources and SHA-256 hashes are recorded in manifest.json.
"""
import concurrent.futures
import hashlib
import json
import pathlib
import re
import struct
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEST = ROOT / "audio" / "samples"
REVISIONS = {
    "sfzinstruments/SalamanderGrandPiano": "3382bf9496bba2486f5ab0de55a264d1dfc38404",
    "sfzinstruments/GregSullivan.E-Pianos": "8c3e581acda3594b553948ff0222d4f84a698376",
}


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": "velhoksi-sample-preparation"})
    with urllib.request.urlopen(request, timeout=90) as response:
        return response.read()


def source(repo):
    sha = REVISIONS[repo]
    return sha, f"https://raw.githubusercontent.com/{repo}/{sha}/"


def save(url, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        data = fetch(url)
        if path.suffix == ".flac" and not data.startswith(b"fLaC"):
            raise ValueError(f"Not FLAC: {url}")
        path.write_bytes(data)
    data = path.read_bytes()
    return {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def flac_loop(path):
    """Preserve the original WAV smpl loop embedded in a FLAC application block."""
    data = path.read_bytes()
    pos, rate = 4, None
    while pos < len(data):
        flag = data[pos]
        size = int.from_bytes(data[pos + 1:pos + 4], "big")
        block = data[pos + 4:pos + 4 + size]
        if flag & 127 == 0:
            rate = int.from_bytes(block[10:13], "big") >> 4
        if flag & 127 == 2 and block.startswith(b"riffsmpl") and len(block) >= 72:
            header = struct.unpack_from("<9I", block, 12)
            if header[7]:
                loop = struct.unpack_from("<6I", block, 48)
                if loop[1] == 0:
                    return {"loopStart": loop[2] / rate, "loopEnd": (loop[3] + 1) / rate}
        pos += size + 4
        if flag & 128:
            break
    return {}


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    manifest = {"version": 1, "instruments": {}}
    jobs = {}
    repo = "sfzinstruments/SalamanderGrandPiano"
    sha, base = source(repo)
    tuning_text = fetch(base + "Data/tune_ret.txt").decode()
    tuning = {int(k): int(v) for k, v in re.findall(r"\$TUNE(\d+)\s+(-?\d+)", tuning_text)}
    piano = {"name": "Salamander grand", "author": "Alexander Holm", "mapping": "kinwie; retuning by Markus Fiedler",
             "source": f"https://github.com/{repo}", "revision": sha, "license": "CC BY 3.0",
             "range": [36, 84], "release": 0.35, "gain": 0.85, "regions": []}
    # Four original timbral layers, with sample centers no further than a semitone away.
    for layer, low, high in [(3, 1, 43), (7, 44, 72), (11, 73, 104), (15, 105, 127)]:
        offsets_text = fetch(base + f"Data/vel_{layer:02d}.txt").decode()
        offsets = {int(k): int(v) for k, v in re.findall(r"\$OFF(\d+)\s+(\d+)", offsets_text)}
        for midi in range(36, 85, 3):
            note = ["C", "D#", "F#", "A"][(midi % 12) // 3] + str(midi // 12 - 1)
            name = f"{note}v{layer}.flac"
            filename = "salamander/" + name.replace("#", "s")
            index = (midi - 21) // 3 + 1
            piano["regions"].append({"file": filename, "root": midi, "low": max(36, midi - 1),
                                      "high": min(84, midi + 1), "velLow": low, "velHigh": high,
                                      "tune": tuning[index], "offset": offsets[index] / 48000})
            jobs[filename] = base + "Samples/" + urllib.parse.quote(name)
    save(base + "LICENSE", DEST / "salamander" / "LICENSE.txt")
    manifest["instruments"]["salamander"] = piano

    repo = "sfzinstruments/GregSullivan.E-Pianos"
    sha, base = source(repo)
    sfz_url = base + "Wurlitzer%20EP200/Wurlitzer%20EP200.sfz"
    sfz = fetch(sfz_url).decode()
    wurli = {"name": "Wurlitzer EP200", "author": "Greg Sullivan", "mapping": "kinwie",
             "source": f"https://github.com/{repo}", "revision": sha, "license": "CC BY 3.0",
             "range": [36, 84], "release": 0.2, "gain": 1.0, "regions": []}
    for group in sfz.split("<group>")[1:]:
        low = int(re.search(r"lovel=(\d+)", group)[1])
        high = int(re.search(r"hivel=(\d+)", group)[1])
        for line in group.splitlines():
            if not line.startswith("<region>"):
                continue
            values = dict(re.findall(r"(\w+)=([^\s]+)", line))
            if int(values["hikey"]) < 36 or int(values["lokey"]) > 84:
                continue
            name = values["sample"].replace("$EXT", "flac")
            filename = "wurlitzer/" + name
            wurli["regions"].append({"file": filename, "root": int(values["pitch_keycenter"]),
                "low": max(36, int(values["lokey"])), "high": min(84, int(values["hikey"])),
                "velLow": low, "velHigh": high, "tune": int(values.get("tune", 0)),
                "volume": float(values.get("volume", 0)), "offset": 0})
            jobs[filename] = base + "Wurlitzer%20EP200/Samples/" + name
    save(base + "LICENSE", DEST / "wurlitzer" / "LICENSE.txt")
    save(sfz_url, DEST / "wurlitzer" / "SOURCE.sfz")
    manifest["instruments"]["wurlitzer"] = wurli

    def download(item):
        name, url = item
        return name, {"source": url, **save(url, DEST / name)}

    manifest["files"] = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        for name, metadata in executor.map(download, jobs.items()):
            manifest["files"][name] = metadata
            print(name, metadata["bytes"], flush=True)
    for instrument in manifest["instruments"].values():
        for region in instrument["regions"]:
            region.update(flac_loop(DEST / region["file"]))
        instrument["bytes"] = sum(manifest["files"][name]["bytes"] for name in {r["file"] for r in instrument["regions"]})
    (DEST / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print("Total bytes:", sum(x["bytes"] for x in manifest["files"].values()))
    # Extend the base bank and regenerate the selector catalog from the same mappings.
    from prepare_extra_samples import extend_manifest
    extend_manifest()


if __name__ == "__main__":
    main()
