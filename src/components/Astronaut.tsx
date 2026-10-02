/* Decorative floating astronaut for the Cosmos theme (shown via CSS only when
   [data-theme="cosmos"] is active). Pure inline SVG — no image request. */
export default function Astronaut({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 150 160" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="astroVisor" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b3a67" />
          <stop offset=".55" stopColor="#0d1330" />
          <stop offset="1" stopColor="#31427e" />
        </linearGradient>
        <linearGradient id="astroSuit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="1" stopColor="#c7d2fe" />
        </linearGradient>
      </defs>
      {/* tether drifting off-frame */}
      <path d="M126 138c28-8 32-56 8-84" stroke="rgba(148,170,220,.45)" strokeWidth="2" strokeDasharray="5 7" strokeLinecap="round" />
      {/* arms (behind torso) */}
      <path d="M40 70 22 46" stroke="url(#astroSuit)" strokeWidth="15" strokeLinecap="round" />
      <path d="M108 78l22 12" stroke="url(#astroSuit)" strokeWidth="15" strokeLinecap="round" />
      {/* legs */}
      <path d="M58 122l-8 26" stroke="#c7d2fe" strokeWidth="16" strokeLinecap="round" />
      <path d="M84 122l10 24" stroke="#c7d2fe" strokeWidth="16" strokeLinecap="round" />
      {/* backpack */}
      <rect x="30" y="64" width="90" height="52" rx="18" fill="#a5b4fc" />
      {/* torso */}
      <rect x="38" y="58" width="70" height="62" rx="20" fill="url(#astroSuit)" />
      {/* chest panel */}
      <rect x="60" y="86" width="26" height="17" rx="5" fill="#818cf8" />
      <circle cx="67" cy="94.5" r="2.6" fill="#e0e7ff" />
      <circle cx="77" cy="94.5" r="2.6" fill="#22d3ee" />
      {/* helmet + visor */}
      <circle cx="72" cy="42" r="28" fill="url(#astroSuit)" />
      <path d="M48 40a24 20 0 0 1 48 0 24 22 0 0 1-48 0Z" fill="url(#astroVisor)" />
      <ellipse cx="62" cy="33" rx="7" ry="3.6" fill="rgba(255,255,255,.5)" transform="rotate(-18 62 33)" />
      {/* gloves */}
      <circle cx="21" cy="45" r="8" fill="#eef2ff" />
      <circle cx="130" cy="90" r="8" fill="#eef2ff" />
    </svg>
  );
}
