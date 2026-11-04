'use client';
import Link from 'next/link';
import { TC, quando } from '@/lib/temi';

export default function Statistiche({ s }) {
  if (!s) return null;
  const max = Math.max(1, ...(s.temi || []).map(t => t.n));
  return (
    <>
      <div className="stats">
        <div className="stat"><b>{s.follower}</b><span>follower</span></div>
        <div className="stat"><b>{s.seguiti}</b><span>seguiti</span></div>
        <div className="stat"><b>{s.amici}</b><span>amici</span></div>
        {s.visibile && <>
          <div className="stat"><b>{s.creati}</b><span>tavoli creati</span></div>
          <div className="stat"><b>{s.ospite}</b><span>da ospite</span></div>
          <div className="stat"><b>{s.pubblico}</b><span>dal pubblico</span></div>
        </>}
      </div>
      {s.visibile && s.temi?.length > 0 && (
        <div>
          <div className="label" style={{ marginBottom: 10 }}>Temi più frequentati</div>
          <div className="bars">{s.temi.map(t => (
            <div className="bar" key={t.tema}><span>{t.tema}</span><i><b style={{ width: `${(t.n / max) * 100}%`, background: TC[t.tema] }} /></i><em>{t.n}</em></div>
          ))}</div>
        </div>
      )}
      {s.visibile && s.recenti?.length > 0 && (
        <div>
          <div className="label">Tavoli recenti</div>
          <div className="list">{s.recenti.map(r => (
            <Link key={r.id} href={`/tavolo/${r.id}`}>
              <b>{r.titolo}</b>
              <div className="hint">{r.ruolo} · {r.tema} · {quando(r.quando)}{r.stato === 'aperto' ? ' · in corso' : ''}</div>
            </Link>
          ))}</div>
        </div>
      )}
      {!s.visibile && <p className="hint">Profilo privato: statistiche e tavoli li vedono solo i follower approvati.</p>}
    </>
  );
}
