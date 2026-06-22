/* Service worker removed — it caused stale content on this live, real-time
   site. This unregisters any previously-installed worker and clears its
   caches so visitors always get fresh content. No new worker is registered. */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister()))
    .catch(() => {});
}
if (window.caches && caches.keys) {
  caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
}
