/*
 * Lantern Maps service worker.
 *
 * Hand-written rather than generated, so there is no build step and nothing to
 * keep in sync: every rule below is a runtime decision based on the request.
 *
 * Three caches, each with its own strategy:
 *
 *   shell   the "/" document and the offline fallback. Network-first, so a
 *           deploy is picked up immediately and the cache only answers when the
 *           network cannot.
 *   static  /_next/static/** and other same-origin assets. Cache-first for the
 *           hashed ones (the hash changes when the bytes do, so a stale hit is
 *           impossible), stale-while-revalidate for the rest.
 *   tiles   basemap tiles. Cache-first with an LRU cap, which is what makes a
 *           previously-visited area still draw with no network.
 *
 * Bump VERSION to retire every cache at once on the next activation.
 */

// v2 dropped the v1 tile cache, which held CARTO's "API KEY REQUIRED"
// placeholders from before the basemap moved to OpenStreetMap. v3 drops v2's,
// which holds raster PNGs from before the basemap became vector — nothing reads
// them any more, and they are the largest thing in storage.
const VERSION = "v3";

const SHELL_CACHE = `lantern-maps-shell-${VERSION}`;
const STATIC_CACHE = `lantern-maps-static-${VERSION}`;
const TILE_CACHE = `lantern-maps-tiles-${VERSION}`;
const CURRENT_CACHES = [SHELL_CACHE, STATIC_CACHE, TILE_CACHE];

const START_URL = "/";
const OFFLINE_URL = "/offline.html";

/** Precached at install so a cold offline launch has something to show. */
const PRECACHE_URLS = [
  START_URL,
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

/*
 * Must match the tile provider in lib/basemap-style.ts — an exact hostname
 * rather than a suffix, so this cannot be widened by accident to anything else
 * served under the same domain. Changing provider there means changing this too,
 * or tiles quietly stop being cached and offline map coverage disappears.
 */
const BASEMAP_HOST = "tiles.openfreemap.org";

/*
 * The basemap host serves three very different things, and they want three
 * different strategies:
 *
 *   /planet      the TileJSON naming the current planet build. One small
 *                document, but the map cannot resolve a single tile URL without
 *                it, so a cold offline launch dies here if it is not cached.
 *                Stale-while-revalidate: a new build must be picked up, and
 *                yesterday's answer is still a working map.
 *   /planet/**   the vector tiles themselves. Unbounded in number, so
 *                LRU-capped below.
 *   /fonts/**    the glyph atlases every label is drawn from. A handful of
 *   /sprites/**  small files, shared by the whole map at every zoom — put them
 *                under the tile cap and a long pan would evict them, and the
 *                offline map would come back with no labels on it.
 */
const TILE_JSON_PATH = "/planet";
const TILE_PATH = "/planet/";
const IMMUTABLE_BASEMAP_PATHS = ["/fonts/", "/sprites/"];

/*
 * MapLibre fetches vector tiles with CORS, so unlike the raster tiles this
 * replaced their real size is visible to us and to the quota. ~400 of them is
 * several screens' worth of panning across a few zoom levels — each covers four
 * times the ground a 256px raster tile did — which is "the area I was just
 * looking at" without growing without bound.
 */
const TILE_CACHE_LIMIT = 400;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Each URL is added on its own: addAll() rejects the whole install if a
      // single request fails, and a failed precache is not worth failing over —
      // the runtime handlers will fill the gap on the next request.
      await Promise.allSettled(
        PRECACHE_URLS.map(async (url) => {
          // cache: "reload" so precaching never picks up a stale HTTP-cache hit.
          const response = await fetch(new Request(url, { cache: "reload" }));
          if (response.ok) await cache.put(url, response);
        }),
      );
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(
            (name) =>
              name.startsWith("lantern-maps-") && !CURRENT_CACHES.includes(name),
          )
          .map((name) => caches.delete(name)),
      );
      // Take over the pages that are already open, so the first load after an
      // install starts caching without needing a reload.
      await self.clients.claim();
    })(),
  );
});

/**
 * Cache assets the page has already loaded but that never passed through this
 * worker.
 *
 * On a first-ever visit the worker installs *during* the load, so every hashed
 * chunk, stylesheet and font was fetched before it could intercept anything.
 * Without this, going offline after one visit would serve the cached "/"
 * document and then fail every script it asks for — HTML with no app. The page
 * reports what it actually loaded (see ServiceWorkerRegistrar) once it is idle.
 */
async function warmCache(urls) {
  const cache = await caches.open(STATIC_CACHE);
  await Promise.allSettled(
    urls.map(async (url) => {
      // Already cached, so this is the common case on every visit but the first.
      if (await cache.match(url)) return;
      const response = await fetch(url);
      if (response.ok) await cache.put(url, response);
    }),
  );
}

self.addEventListener("message", (event) => {
  // The page asks for this when the user accepts an update. Nothing calls
  // skipWaiting() on its own: a worker that activates unannounced can swap the
  // JS chunks out from under a running page.
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (event.data?.type === "WARM_CACHE" && Array.isArray(event.data.urls)) {
    // Same-origin only, and only paths this worker would have cached anyway —
    // the list arrives from a page and is not trusted as-is.
    const urls = event.data.urls.filter((url) => {
      try {
        const parsed = new URL(url, self.location.origin);
        return (
          parsed.origin === self.location.origin &&
          (parsed.pathname.startsWith("/_next/static/") ||
            parsed.pathname.startsWith("/icons/") ||
            parsed.pathname.startsWith("/photos/"))
        );
      } catch {
        return false;
      }
    });
    if (urls.length) event.waitUntil(warmCache(urls));
  }
});

function isTileRequest(url) {
  return url.hostname === BASEMAP_HOST && url.pathname.startsWith(TILE_PATH);
}

/** The TileJSON. Note the exact match: `/planet/…` above is a tile, not this. */
function isTileJson(url) {
  return url.hostname === BASEMAP_HOST && url.pathname === TILE_JSON_PATH;
}

/** Glyphs and sprites: same host, but not subject to the tile cap. */
function isImmutableBasemapAsset(url) {
  return (
    url.hostname === BASEMAP_HOST &&
    IMMUTABLE_BASEMAP_PATHS.some((path) => url.pathname.startsWith(path))
  );
}

/**
 * The bytes behind the URL never change: `/_next/static/**` is content-hashed
 * by the build, and the basemap's glyph and sprite files are versioned in their
 * own paths by the tile host. The TileJSON is deliberately not in here — it is
 * the one basemap document that has to be allowed to change.
 */
function isImmutable(url) {
  return (
    url.pathname.startsWith("/_next/static/") || isImmutableBasemapAsset(url)
  );
}

/**
 * Trim the least-recently-added entries. cache.keys() resolves in insertion
 * order, so the oldest are at the front — and a cache-first handler never
 * re-inserts a hit, which makes this insertion order rather than true LRU. For
 * tiles that is the same thing in practice: the ones you are panning over are
 * the ones being added.
 */
async function trimCache(cacheName, limit) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= limit) return;
  await Promise.all(
    keys.slice(0, keys.length - limit).map((key) => cache.delete(key)),
  );
}

/** Cache-first. Tiles are effectively immutable, so a hit is never revalidated. */
async function handleTile(event) {
  const cache = await caches.open(TILE_CACHE);
  const cached = await cache.match(event.request);
  if (cached) return cached;

  const response = await fetch(event.request);
  // MapLibre requests tiles with CORS, so `ok` is meaningful and a 404 over
  // water is never cached. The opaque branch is kept for any future provider
  // fetched without it, where status is 0 and only `type` can be trusted.
  if (response.ok || response.type === "opaque") {
    await cache.put(event.request, response.clone());
    event.waitUntil(trimCache(TILE_CACHE, TILE_CACHE_LIMIT));
  }
  return response;
}

/**
 * Network-first, falling back through: this exact document, the "/" shell, then
 * the offline page. Network-first (not cache-first) because the shell carries
 * the hashed script URLs for a deploy — serving a stale one would ask for
 * chunks that no longer exist.
 */
async function handleNavigation(event) {
  const cache = await caches.open(SHELL_CACHE);
  const url = new URL(event.request.url);

  try {
    const response = await fetch(event.request);
    // Only the app's own entry point is cached. Anything else (a 404, a
    // redirect) would poison the fallback every other request depends on.
    if (response.ok && url.pathname === START_URL) {
      await cache.put(START_URL, response.clone());
    }
    return response;
  } catch {
    return (
      (await cache.match(event.request, { ignoreSearch: true })) ??
      (await cache.match(START_URL)) ??
      (await cache.match(OFFLINE_URL)) ??
      Response.error()
    );
  }
}

/** Cache-first for hashed assets, stale-while-revalidate for the rest. */
async function handleStatic(event) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(event.request);
  const url = new URL(event.request.url);

  if (cached && isImmutable(url)) return cached;

  const network = fetch(event.request)
    .then(async (response) => {
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) {
    // Refresh in the background; the page gets the cached copy now.
    event.waitUntil(network);
    return cached;
  }

  const response = await network;
  return response ?? Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Anything not a plain GET is left entirely alone. That deliberately includes
  // the HEAD probe next/offline uses to test connectivity — answering it from
  // cache would report "online" while the network is down.
  if (request.method !== "GET") return;

  // Range requests must reach the network: a 200 from cache is not a valid
  // answer to one, and partial content is not ours to assemble.
  if (request.headers.has("range")) return;

  const url = new URL(request.url);

  if (isTileRequest(url)) {
    event.respondWith(handleTile(event));
    return;
  }

  // The TileJSON, glyphs and sprites all go through the static handler: it is
  // stale-while-revalidate for the first and, via `isImmutable`, a straight
  // cache hit for the other two once they have been fetched once.
  if (isTileJson(url) || isImmutableBasemapAsset(url)) {
    event.respondWith(handleStatic(event));
    return;
  }

  // Cross-origin traffic other than the basemap is none of our business.
  if (url.origin !== self.location.origin) return;

  // RSC payloads vary by request header and are not interchangeable with the
  // HTML at the same URL, so they are never cached or served from cache.
  if (url.searchParams.has("_rsc") || request.headers.has("RSC")) return;

  // Dev-server plumbing (HMR, the error overlay) must never be intercepted.
  if (
    url.pathname.startsWith("/_next/webpack-hmr") ||
    url.pathname.startsWith("/__nextjs")
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event));
    return;
  }

  event.respondWith(handleStatic(event));
});
