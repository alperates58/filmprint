const CACHE_NAME = "filmprint-static-v1";
const TMDB_IMAGE_CACHE = "filmprint-images-v1";
const MAX_TMDB_IMAGES = 50;

const STATIC_SHELL = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-192-maskable.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png",
  "/apple-touch-icon.png",
];

// Helper: Trim TMDB image cache to prevent unbounded storage bloat
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    await trimCache(cacheName, maxItems);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_SHELL);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key.startsWith("filmprint-") && key !== CACHE_NAME && key !== TMDB_IMAGE_CACHE) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clientsClaim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. CRITICAL SECURITY RULE: ALL API requests (/api/**) MUST BE NetworkOnly
  if (url.pathname.startsWith("/api/")) {
    return; // Default browser fetch, no SW interception/caching
  }

  // 2. CRITICAL SECURITY RULE: Navigation requests (HTML Pages) MUST BE NetworkOnly with Offline Fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match("/offline.html");
      })
    );
    return;
  }

  // 3. TMDB Remote Images (image.tmdb.org/t/p/**) -> StaleWhileRevalidate with size limit
  if (url.hostname === "image.tmdb.org" && url.pathname.startsWith("/t/p/")) {
    event.respondWith(
      caches.open(TMDB_IMAGE_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
              trimCache(TMDB_IMAGE_CACHE, MAX_TMDB_IMAGES);
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 4. Hashed Next.js Static Assets (/_next/static/**) -> CacheFirst
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        });
      })
    );
    return;
  }

  // 5. Local Static Assets (manifest, icons, fonts, static shell) -> StaleWhileRevalidate
  if (
    url.origin === location.origin &&
    (STATIC_SHELL.includes(url.pathname) || url.pathname.startsWith("/icons/") || url.pathname.endsWith(".png") || url.pathname.endsWith(".ico"))
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }
});
