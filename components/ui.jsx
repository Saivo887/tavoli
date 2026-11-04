'use client';
import { TC } from '@/lib/temi';

const IC = {
  home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  bell: <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.3-5.5 6.5-5.5s5.7 2 6.5 5.5" /><circle cx="17" cy="9" r="2.8" /><path d="M16.5 14.5c2.6.2 4.4 2 5 5" /></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
  micoff: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M3 3l18 18" /></>,
  kb: <><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" /></>,
  hand: <path d="M8 13V5a1.5 1.5 0 0 1 3 0v6M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11V5.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7 6 6 0 0 1-5-3l-2.5-4.5a1.5 1.5 0 0 1 2.5-1.6L8 14" />,
  back: <path d="M15 6l-6 6 6 6" />,
  exit: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />,
  send: <path d="M4 12l16-8-6 16-2-7z" />,
  ear: <path d="M7 9a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-6 0" />,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  out: <path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9" />,
};

export function Ico({ n, size }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      width={size} height={size} aria-hidden="true">{IC[n]}</svg>
  );
}

function hue(n = '') { let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }

export function Avatar({ nick = '?', url, size }) {
  const style = size ? { '--s': `${size}px` } : {};
  if (url) return <span className="av" style={style}><img src={url} alt="" /></span>;
  const ini = String(nick).replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase() || '?';
  return <span className="av" style={{ ...style, background: `hsl(${hue(String(nick))} 55% 46%)` }}>{ini}</span>;
}

export function MiniTable({ sedie, occupati, tema }) {
  const dots = Array.from({ length: sedie }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / sedie;
    return <circle key={i} cx={(31 + 24 * Math.cos(a)).toFixed(1)} cy={(31 + 24 * Math.sin(a)).toFixed(1)} r="5"
      fill={i < occupati ? TC[tema] : '#ffffff'} stroke="#5a3820" strokeWidth="1.5" />;
  });
  return (
    <svg className="mini" viewBox="0 0 62 62" aria-hidden="true">
      <circle cx="31" cy="31" r="15" fill="#a8703f" stroke="#5a3820" strokeWidth="3" />
      <circle cx="27" cy="27" r="6" fill="rgba(255,232,196,.4)" />
      {dots}
    </svg>
  );
}

export function Seg({ value, onChange, options }) {
  return (
    <span className="seg">
      {options.map(([v, l]) => (
        <button type="button" key={v} aria-pressed={value === v} onClick={() => onChange(v)}>{l}</button>
      ))}
    </span>
  );
}

export function Caricamento({ testo = 'Caricamento…' }) {
  return <div className="loading"><span className="spinner" />{testo}</div>;
}
