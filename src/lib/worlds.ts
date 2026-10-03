"use client";

/* Shared manifest loader — PhotoLayer reads /worlds/<theme>.json through this;
   one network request per theme per session, everyone else gets the cached
   promise. A failed fetch is NOT memoized, so a transient failure retries. */
const cache = new Map<string, Promise<any>>();

export function loadManifest(theme: string): Promise<any> {
  if (!cache.has(theme)) {
    cache.set(
      theme,
      fetch(`/worlds/${theme}.json`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
        .then((data) => { if (!data) cache.delete(theme); return data; }),
    );
  }
  return cache.get(theme)!;
}
