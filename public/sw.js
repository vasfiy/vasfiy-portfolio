/* Network-first service worker — always fresh when online, cache only as
   an offline fallback (no stale content). Same-origin GET requests only.

   Bumping CACHE drops everything the previous version stored. */
const CACHE = "kt-v2";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // let Supabase/fonts/etc. pass through

  // The admin panel is private and must always be live — never touch it.
  if (self.location.hostname.startsWith("admin.")) return;

  /* An HTML document names the exact JS chunks the app boots from, so a cached
     document keeps serving a build that no longer exists. Documents (and the
     JSON we prepare for the admin) therefore go straight to the network and are
     never written to the cache; only static assets are stored for offline use. */
  const isDocument = req.mode === "navigate" || req.destination === "document";
  const isFreshData = url.pathname.startsWith("/prepared/") || url.pathname.endsWith(".json");

  if (isDocument || isFreshData) {
    e.respondWith(
      fetch(req).catch(() => (isDocument ? caches.match("/offline-fallback") || caches.match("/") : Response.error())),
    );
    return;
  }

  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res && res.status === 200) {
        const c = await caches.open(CACHE);
        c.put(req, res.clone());
      }
      return res;
    } catch {
      const cached = await caches.match(req);
      return cached || Response.error();
    }
  })());
});
