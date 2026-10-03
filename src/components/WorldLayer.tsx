"use client";
import PhotoLayer from "./PhotoLayer";

/* The global background is now a cinematic photo layer (PhotoLayer): real
   photographs crossfading behind the page under a --bg veil. The old canvas
   worlds (./worlds/<theme>.tsx) are no longer mounted. This thin wrapper
   keeps the SiteFrame contract — default export, no props — so nothing else
   in the frame had to change. */
export default function WorldLayer() {
  return <PhotoLayer />;
}
