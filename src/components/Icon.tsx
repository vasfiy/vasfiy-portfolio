/* Line icons drawn on a 24px grid, 1.5px stroke, inheriting currentColor.
   These replace the emoji that used to stand in for section icons — emoji
   render differently on every platform and read as filler rather than design. */
const P: Record<string, React.ReactNode> = {
  market: <><path d="M3 6h18l-1.6 9.6a2 2 0 0 1-2 1.7H7.6a2 2 0 0 1-2-1.7L4 6Z" /><path d="M8 6V4.5A2.5 2.5 0 0 1 10.5 2h3A2.5 2.5 0 0 1 16 4.5V6" /><circle cx="9" cy="21" r="1" /><circle cx="17" cy="21" r="1" /></>,
  library: <><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v14a1.5 1.5 0 0 0-1.5-1.5h-5A1.5 1.5 0 0 1 4 17V5.5Z" /><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v14a1.5 1.5 0 0 1 1.5-1.5h5A1.5 1.5 0 0 0 20 17V5.5Z" /></>,
  learning: <><path d="M12 7 2.5 11.5 12 16l9.5-4.5L12 7Z" /><path d="M6 13.4V18c0 1.4 2.7 2.6 6 2.6s6-1.2 6-2.6v-4.6" /><path d="M21.5 11.5v5" /></>,
  lab: <><path d="M9 3h6" /><path d="M10 3v5.2a2 2 0 0 1-.3 1L4.9 17a2.4 2.4 0 0 0 2 3.6h10.2a2.4 2.4 0 0 0 2-3.6l-4.8-7.8a2 2 0 0 1-.3-1V3" /><path d="M7.4 14h9.2" /></>,
  tools: <><path d="M14.5 6.5a3.5 3.5 0 0 0 4.6 4.6l-7.8 7.8a2.3 2.3 0 0 1-3.2-3.2l7.8-7.8Z" /><path d="M16.8 2.6 14 5.4l4.6 4.6 2.8-2.8a1.4 1.4 0 0 0 0-2l-2.6-2.6a1.4 1.4 0 0 0-2 0Z" /></>,
  gallery: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.5" /><path d="m3.5 17 5-4.5 4 3.5 3-2.5 5 4" /></>,
  journal: <><path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5.5A1.5 1.5 0 0 1 4 19.5v-15Z" /><path d="M4 17.5h14" /><path d="M8 7.5h8M8 11h5" /></>,
  shield: <><path d="M12 2.8 20 6v6c0 4.4-3.2 7.8-8 9.2-4.8-1.4-8-4.8-8-9.2V6l8-3.2Z" /><path d="m8.8 12 2.2 2.2 4.2-4.4" /></>,
};

export default function Icon({ name, size = 22, className }: { name: string; size?: number; className?: string }) {
  const d = P[name];
  if (!d) return null;
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d}
    </svg>
  );
}
