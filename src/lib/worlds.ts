"use client";

/* Shared manifest loader — PhotoLayer and every WorldBreak band read the same
   /worlds/<theme>.json; one network request per theme per session, everyone
   else gets the cached promise. */
const cache = new Map<string, Promise<any>>();

export function loadManifest(theme: string): Promise<any> {
  if (!cache.has(theme)) {
    cache.set(
      theme,
      fetch(`/worlds/${theme}.json`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    );
  }
  return cache.get(theme)!;
}
