const CACHE_NAME = "velhoksi-v8";
const ASSETS = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/data/word-lists.json",
  "/vendor/abcjs-basic-min.js",
  "/velhoksi.png",
  "/icon-192.png",
  "/icon-512.png",
  "/og-image.png",
  "/site.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ASSETS.map((url) => new Request(url, { cache: "reload" })));
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
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

  const isNavigation =
    event.request.mode === "navigate" ||
    (event.request.headers.get("accept") || "").includes("text/html");

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      if (isNavigation) {
        return (await cache.match("/index.html")) || fetch(event.request);
      }

      const assetPath = url.pathname === "/" ? "/index.html" : url.pathname;
      const isPrecached = ASSETS.includes(assetPath);

      if (isPrecached) {
        const cached = await cache.match(assetPath);
        return cached || fetch(event.request);
      }

      const cached = await cache.match(event.request);
      if (cached) {
        event.waitUntil(
          (async () => {
            try {
              const fresh = await fetch(event.request);
              if (fresh && fresh.ok) await cache.put(event.request, fresh.clone());
            } catch {
              // Ignore network failures.
            }
          })()
        );
        return cached;
      }

      const fresh = await fetch(event.request);
      if (fresh && fresh.ok) cache.put(event.request, fresh.clone());
      return fresh;
    })()
  );
});
