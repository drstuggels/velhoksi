# Wait media imports

`open link` turns a public media URL into a local Wait file. The browser talks only to the same-origin Worker; a temporary Python container resolves and downloads the recording. No user accounts, Spotify credentials, browser cookies, or shared download cache are needed.

Supported inputs are individual public recordings supported by yt-dlp, direct HTTP(S) media, and Spotify track/share links. Availability depends on the source, location, and downloader support. Private/login-only media, DRM, live streams, bulk playlists/albums, and Spotify podcasts are outside this implementation. A YouTube watch link containing a playlist parameter imports only that recording.

## Local development

Prerequisites: Node 22.18+ (or a newer supported Node), pnpm, Python 3.12, `uv`, FFmpeg/ffprobe, and Chrome for the optional browser acceptance run.

```sh
pnpm install
uv venv media-import/.venv --python 3.12
uv pip install --python media-import/.venv/bin/python -r media-import/requirements.txt
pnpm dev
```

Open `http://127.0.0.1:8087/?mode=wait`. The dev server runs the real Worker gateway against the local Python service on port 8091. `VELHOKSI_PORT` and `VELHOKSI_IMPORT_PORT` override these ports. Local job files live in ignored `media-import/.data/`. Source edits in `wait-player/` require `pnpm build` or `pnpm build:watch`; restart the dev server after Python changes.

If the old `python3 -m http.server` process is still running on port 8087, stop it and restart with `pnpm dev`. A static server can display the updated interface but cannot handle import POST requests (HTTP 501). Reload the page and choose **find media** again after replacing it.

`pnpm dev:cloudflare` runs the Worker and Containers through Wrangler and Docker. A standalone container can also be checked with:

```sh
docker build -t velhoksi-import-local media-import
docker run --rm -p 127.0.0.1:8091:8091 velhoksi-import-local
```

The container port is private in production. Do not expose the Python server directly to the internet. Standalone hosting can require `IMPORT_GATEWAY_TOKEN` (forward it as `X-Gateway-Token` from a trusted proxy). The provided Worker uses its private container binding instead.

## Request lifecycle

1. The browser generates a random job ID and a separate bearer capability, saved in sessionStorage for reconnection after reload. The capability is sent in `X-Import-Token`, never in URLs. Only its SHA-256 hash is stored by the service.
2. `POST /api/imports` with `{id, url}` starts metadata extraction. `GET /api/imports/:id` polls progress. Spotify uses public embed metadata and spotDL's YouTube Music matching; Spotify audio and previews are never downloaded.
3. The user chooses a candidate. `POST /api/imports/:id/download` accepts `{candidateId, mode: "audio" | "video"}`. Candidate URLs come from server state; the client cannot replace them. Spotify matches allow audio only.
4. The container downloads and prepares M4A/AAC or MP4/H.264/AAC. It copies compatible streams where possible, otherwise converts without normalization, silence trimming, or speed changes. The output duration is checked against the downloaded source.
5. `GET /api/imports/:id/file` streams the completed file into the browser. It becomes a normal Wait tab, with provenance and existing local persistence, markers, looping, pitch-preserving speed, and video controls. Completion never autoplays or takes over another active recording.
6. `DELETE /api/imports/:id` cancels a job or acknowledges receipt and removes temporary files. Reset cancels pending work. Cleanup also expires abandoned jobs. Browser storage failures are reported by Wait; an in-memory file can remain playable without surviving reload.

Every job endpoint requires the capability. IP addresses limit job creation but are not authentication, so a network change does not invalidate a download. API responses use `no-store`; the service worker excludes `/api/imports` from caching. A container restart can lose pending jobs; the UI reports expiry/interruption and asks for a new import. The capability is not kept after completion and cannot recover a job from a different browser tab or device.

## Matching

Spotify metadata is isolated in `worker.py:spotify_metadata`. It currently reads the public embed's `__NEXT_DATA__` JSON without using an unofficial Spotify login API. This markup is an upstream dependency and may change.

spotDL ranks YouTube Music song/video results by its existing metadata matcher. Candidates must have score ≥65 and duration difference ≤max(12 seconds, 8%). Eligible song results rank ahead of videos; up to five candidates show title, artist, duration, and source link. Scores are ranking signals, not probabilities, and are not shown as confidence percentages. Alternate takes, remasters, live versions, and mislabeled uploads still require listening. No close match means an explicit fallback to a user-supplied YouTube link.

## Limits and isolation

- One recording per import, at most one hour and 128 MiB final media. Video selection prefers H.264 at ≤720p; a single-file direct source can retain its original dimensions.
- Two fixed container shards, two extraction processes and six retained jobs per shard. Busy requests return 429 rather than creating an unbounded queue.
- Six POST requests per IP/minute at the Worker, and twelve new jobs per IP/hour/shard in the service. These are abuse controls, not billing guarantees or account quotas.
- Ten-minute process deadline per resolve/download operation, 768 MiB temporary-disk ceiling per job, thirty-minute job lifetime, thirty-five-minute idle container sleep. Cleanup runs every three seconds. No R2 or persistent server library.
- Each operation runs as a separate killable process group under a nonroot container user. Fixed argument arrays are used; callers cannot supply commands, extractor options, cookies, credentials, proxy URLs, or local file paths. Failed/cancelled jobs remove partial media.
- HTTP(S), ports 80/443, public IPs only. Socket-level validation covers extractor URLs and redirects and connects to the validated address to resist DNS rebinding. Native curl networking is disabled. FFmpeg reads local files with a `file,pipe` protocol whitelist. This is application-level egress enforcement, not a replacement for keeping downloader/runtime dependencies updated.
- Worker requests are limited to 4 KiB, cross-origin browser requests are rejected, and incoming owner/auth headers are replaced before forwarding. Signed source URLs are retained as provenance when supplied; use links appropriate to retain in this browser.

## Deployment

`pnpm deploy` builds the browser assets and deploys the Worker, Durable Object binding/migration, and Docker image from `wrangler.jsonc`. The account must have Cloudflare Containers enabled, an appropriate plan, and credentials authorized for Containers. The build environment must support Docker. Keep the existing SQLite Durable Object migration after initial deployment.

Run `pnpm exec wrangler deploy --dry-run` before release, then run browser acceptance against a separate deployment. YouTube can treat datacenter egress differently from a home network; successful local downloading does not prove that Cloudflare's IPs can download the same recording. A blocked source produces a retry/local-file error; no proxy, cookie sharing, or circumvention fallback is configured.

On 2026-10-27, the Docker build and Wrangler deployment dry run passed. A separate staging Worker uploaded, but container registration returned **HTTP 401 from `/containers/me`**. A subsequent `wrangler containers list` identified the cause explicitly: this account needs the **Workers Paid plan** to access Containers. The temporary Worker was deleted. Production was not changed, and hosted egress acceptance remains outstanding. Enable the required account plan and repeat staging acceptance before production deployment. Local Wrangler emulation also hit an `esbuild spawn EBADF` error on the development host; the packaged container and Node gateway are tested independently.

## Validation

```sh
pnpm test
pnpm check
pnpm test:imports
WAIT_URL=http://127.0.0.1:8087 pnpm test:imports:live
```

The first three commands are offline checks. The last makes real Spotify/YouTube requests and downloads both requested acceptance recordings in an isolated Chrome profile. It checks candidate artist, full duration, paused completion, 75% playback with pitch preservation, range creation, IndexedDB restoration, offline playback, and a 390px dialog. Screenshots go to `/tmp/velhoksi-acceptance` (override with `WAIT_ACCEPTANCE_DIR`). It does not add recordings to this repository.

### Manual acceptance recordings

| Input | Expected identity | Observed local result, 2026-10-27 |
| --- | --- | --- |
| [Remember — Hank Mobley](https://open.spotify.com/track/2BhU0Hl5OatWiCW93pE2b8) | Hank Mobley, approximately 5:42 | Suggested [Remember (1999/ Remastered)](https://www.youtube.com/watch?v=sbmKLZ_opuQ); 342.342s, 5,537,904-byte M4A; full decode and browser playback passed. |
| [Confirmation — Charlie Parker](https://open.spotify.com/track/0rQubvtPfInTgElCq1fhBr) | Charlie Parker, approximately 2:58 | Suggested [Confirmation](https://www.youtube.com/watch?v=7D3pImSljDs); 177.991s, 2,879,955-byte M4A; full decode and browser playback passed. |

Additional local checks passed on the same date: the Docker image imported Confirmation directly from YouTube as a 4,565,107-byte, 178.028s MP4 (720×720 H.264, AAC); full FFmpeg decoding and browser frame stepping/zoom passed. Reload during Spotify resolution reconnected to the existing job, and cancel removed it without adding a late tab. Importing the site's public `audio/samples/salamander/C4v7.flac` converted it to M4A while a different tab kept playing. Both requested songs passed reload restoration, offline playback, and the mobile dialog checks. These are automated browser observations, not a subjective listening sign-off.

For each recording, manually listen to the source and imported beginning, middle, and ending to confirm the performance/version and absence of truncation. Loop a phrase at 50%, 75%, and 100%; check pitch, marker timing, and the loop boundary. Automated duration and metadata checks do not establish that two releases contain the identical take.

Also verify before release:

- Direct YouTube audio/video and direct MP3/MP4 links; video seeking, frame stepping, fullscreen, and aspect ratio.
- Close/reopen the dialog, reload while matching/downloading, then finish exactly one tab. Leave Wait or play another tab while downloading; completion must not interrupt it.
- Cancel during resolution, download, and browser transfer; reset during pending work; check no late tab appears and server files disappear.
- A playlist-only URL, Spotify album, live stream, missing/private video, oversized file, and recording over one hour should fail clearly.
- Offline interruption followed by retry; expired/restarted job; browser storage denied/full; narrow screen and keyboard-only operation.
- Private IPs, metadata IPs, DNS rebinding/redirects, malformed/oversized requests, wrong capabilities, forged candidate IDs, and rate/capacity limits. Unit tests cover core rejection paths; production network behavior needs staging verification.

## Dependencies

`requirements.in` pins the downloader/matcher releases; `requirements.txt` locks their transitive dependencies. Update deliberately and rerun live acceptance because extractor and matching behavior changes upstream. Node executes yt-dlp's installed JavaScript challenge solver; remote solver downloads are disabled.

Upstream projects: [yt-dlp](https://github.com/yt-dlp/yt-dlp) (Unlicense), [spotDL](https://github.com/spotDL/spotify-downloader) (MIT), [ytmusicapi](https://github.com/sigma67/ytmusicapi) (MIT), and [FFmpeg](https://ffmpeg.org/legal.html) (LGPL/GPL depending on build; this image uses Debian's FFmpeg package). The public credits also link these projects. Existing local-file playback does not require this service.
