const CACHE_NAME = "velhoksi-v89";
const ASSETS = [
  "/index.html",
  "/styles.css",
  "/app.js",
  "/global-panels.mjs",
  "/preferences.mjs",
  "/ear-training/ear.css",
  "/ear-training/ui.mjs",
  "/ear-training/analysis.mjs",
  "/ear-training/audio.mjs",
  "/ear-training/quality.mjs",
  "/ear-training/theory.mjs",
  "/ear-training/instruments.mjs",
  "/ear-training/challenges.mjs",
  "/ear-training/shortcuts.mjs",
  "/ear-training/drone.mjs",
  "/audio/samples/manifest.json",
  "/audio/samples/qualities.json",
  "/audio/samples/salamander/LICENSE.txt",
  "/audio/samples/wurlitzer/LICENSE.txt",
  "/audio/samples/shinyguitar/LICENSE.txt",
  "/audio/samples/vcsl/LICENSE.txt",
  "/audio/samples/rhodes/LICENSE.txt",
  "/vendor/dattorro/dattorroReverb.js",
  "/vendor/dattorro/LICENSE",
  "/vendor/dattorro/SOURCE.txt",
  "/data/word-lists.json",
  "/vendor/abcjs-basic-min.js",
  "/vendor/abcjs-LICENSE.txt",
  "/vendor/abcjs-SOURCE.txt",
  "/velhoksi.png",
  "/icon-192.png",
  "/icon-512.png",
  "/og-image.png",
  "/site.webmanifest",
];

async function fetchUnredirected(request) {
  const response = await fetch(request);
  if (response && response.redirected && response.url) {
    try {
      return await fetch(response.url);
    } catch {
      return response;
    }
  }
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        ASSETS.map(async (url) => {
          try {
            const response = await fetchUnredirected(new Request(url, { cache: "reload" }));
            if (response && response.ok) {
              await cache.put(url, response.clone());
            }
          } catch {
            // ignore
          }
        })
      );
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => /^velhoksi-v\d+$/.test(key) && key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // Recordings have their own on-demand storage policy, across all qualities.
  // The sampler owns this cache, avoiding duplicated banks and update eviction.
  if (url.pathname.startsWith("/audio/samples/") && /\.(flac|opus)$/.test(url.pathname)) return;

  // Linked credits/license files must stay files, including when opened in a tab.
  const isAssetDocument = ASSETS.includes(url.pathname) && url.pathname !== "/index.html";
  const isNavigation = !isAssetDocument && (
    event.request.mode === "navigate" ||
    (event.request.headers.get("accept") || "").includes("text/html"));

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      if (isNavigation) {
        const cached = await cache.match("/index.html");
        if (cached) return cached;

        try {
          const fresh = await fetchUnredirected(new Request("/index.html", { cache: "reload" }));
          if (fresh && fresh.ok && !fresh.redirected) {
            await cache.put("/index.html", fresh.clone());
          }
          return fresh;
        } catch {
          return cached || fetch(event.request);
        }
      }

      const assetPath = url.pathname === "/" ? "/index.html" : url.pathname;
      const isPrecached = ASSETS.includes(assetPath);

      if (isPrecached) {
        const cached = await cache.match(assetPath);
        if (cached) return cached;

        try {
          const fresh = await fetchUnredirected(new Request(assetPath, { cache: "reload" }));
          if (fresh && fresh.ok && !fresh.redirected) {
            await cache.put(assetPath, fresh.clone());
          }
          return fresh;
        } catch {
          return fetch(event.request);
        }
      }

      const cached = await cache.match(event.request);
      if (cached) {
        event.waitUntil(
          (async () => {
            try {
              const fresh = await fetch(event.request);
              if (fresh && fresh.ok && !fresh.redirected) await cache.put(event.request, fresh.clone());
            } catch {
              // Ignore network failures.
            }
          })()
        );
        return cached;
      }

      const fresh = await fetch(event.request);
      if (fresh && fresh.ok && !fresh.redirected) cache.put(event.request, fresh.clone());
      return fresh;
    })()
  );
});
