// Disegno condiviso per le immagini di anteprima (link e storie). Solo stili inline: lo usa next/og.
import { TC } from '@/lib/temi';

export function TavoloSvg({ sedie = 6, occupati = 0, tema = 'Altro', size = 360 }) {
  const c = size / 2, R = size * 0.42, r = size * 0.24, s = size * 0.075;
  const sedi = Array.from({ length: sedie }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / sedie;
    return { x: c + R * Math.cos(a), y: c + R * Math.sin(a), on: i < occupati };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={c} cy={c + 10} r={r + 12} fill="rgba(0,0,0,0.35)" />
      <circle cx={c} cy={c} r={r + 8} fill="#4a2c17" />
      <circle cx={c} cy={c} r={r} fill="#a8703f" />
      <circle cx={c - r * 0.3} cy={c - r * 0.35} r={r * 0.45} fill="rgba(255,232,196,0.28)" />
      {sedi.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={s} fill={p.on ? TC[tema] : 'rgba(255,240,225,0.12)'} stroke={p.on ? '#2a1912' : 'rgba(255,236,214,0.55)'} strokeWidth="4" />
      ))}
    </svg>
  );
}

export function sfondoStanza(tema) {
  return `radial-gradient(ellipse 60% 50% at 30% 35%, rgba(255,190,110,0.40), transparent 70%), radial-gradient(ellipse 90% 60% at 50% 115%, ${TC[tema]}66, transparent 70%), linear-gradient(180deg, #42291f 0%, #2a1912 60%, #1e120c 100%)`;
}
