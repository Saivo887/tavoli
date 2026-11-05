'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TC, dataProgrammata, quando } from '@/lib/temi';
import { NOME } from '@/lib/sito';
import { Avatar, Ico, Caricamento } from './ui';
import Verbale from './Verbale';

function posizione(i, n, r = 41) {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return [50 + r * Math.cos(a), 50 + r * Math.sin(a), (a * 180) / Math.PI + 90];
}

// Vista in sola lettura per chi non ha un account: legge il tavolo e invita a iscriversi.
export default function TavoloOspite({ id }) {
  const [t, setT] = useState(undefined);
  const [tab, setTab] = useState('tavolo');
  const feedRef = useRef(null);
  const dopo = encodeURIComponent(`/tavolo/${id}`);

  useEffect(() => {
    let vivo = true;
    const carica = async () => {
      const { data } = await supabase.rpc('anteprima_tavolo', { t: id });
      if (vivo) setT(data || null);
    };
    carica();
    const iv = setInterval(carica, 5000);
    return () => { vivo = false; clearInterval(iv); };
  }, [id]);

  useEffect(() => { const f = feedRef.current; if (f) f.scrollTop = f.scrollHeight; }, [t?.messaggi?.length, tab]);

  const barra = (
    <header className="l-top">
      <Link href="/" className="brand"><i />{NOME}</Link>
      <nav className="chips">
        <Link className="btn" href={`/accedi?dopo=${dopo}`}>Accedi</Link>
        <Link className="btn primary" href={`/accedi?modo=registrati&dopo=${dopo}`}>Iscriviti</Link>
      </nav>
    </header>
  );

  if (t === undefined) return <div className="landing">{barra}<Caricamento /></div>;
  if (t === null) return (
    <div className="landing">{barra}
      <div className="empty" style={{ margin: '40px 0' }}>
        <h3>Questo tavolo è privato o non esiste più</h3>
        <p className="hint" style={{ margin: 0 }}>Se hai ricevuto un invito, accedi per entrare.</p>
        <Link className="btn primary" href={`/accedi?dopo=${dopo}`}>Accedi</Link>
      </div>
    </div>
  );

  const seduti = t.seduti || [];
  const msgs = (t.messaggi || []).filter(m => tab === 'tavolo' ? m.canale !== 'pubblico' : m.canale === 'pubblico');

  return (
    <div className="landing">{barra}
      <section className="scene" data-tema={t.tema} style={{ '--tc': TC[t.tema] }}>
        <div className="head">
          <div>
            <div className="chips">
              <span className="tag tema">{t.tema}</span>
              {t.stato === 'aperto' ? <span className="tag live">In corso</span> : <span className="tag">{t.stato === 'chiuso' ? 'Concluso' : 'In programma'}</span>}
            </div>
            <h1 style={{ marginTop: 10 }}>{t.titolo}</h1>
            <p className="sub">Aperto da {t.creatore}{t.stato === 'aperto' ? ` · ${t.pubblico} nel pubblico` : ''}{t.stato === 'programmato' ? ` · ${dataProgrammata(t.inizio_previsto)}` : ''}</p>
          </div>
        </div>

        {t.stato === 'chiuso' ? (
          <div className="panel"><h3 style={{ fontSize: 18, color: '#fff7ee' }}>Verbale del tavolo</h3><Verbale v={t.verbale} /></div>
        ) : (
          <div className="room">
            <div className="panel stage">
              <div className="tablewrap">
                <div className="wood" />
                <div className="placard"><strong>{t.titolo}</strong><small>{seduti.length}/{t.sedie} sedie occupate</small></div>
                {Array.from({ length: t.sedie }, (_, i) => {
                  const p = seduti[i]; const [x, y, deg] = posizione(i, t.sedie);
                  return (
                    <Link key={i} href={`/accedi?modo=registrati&dopo=${dopo}`} className={`seat ${p ? '' : 'vuota'}`} style={{ left: `${x}%`, top: `${y}%` }} aria-label={p ? p.nickname : 'Sedia libera: iscriviti per sederti'}>
                      <span className="chair" style={{ '--a': `${deg}deg` }} />
                      {p ? <Avatar nick={p.nickname} url={p.avatar_url} /> : <span className="av">+</span>}
                      {p?.ruolo === 'creatore' && <span className="crown">CREATORE</span>}
                      <span className="nm">{p ? p.nickname : 'libera'}</span>
                    </Link>
                  );
                })}
              </div>
              <div className="cta-ospite">
                <b>{t.stato === 'aperto' ? 'Vuoi sederti, parlare o ascoltare la voce?' : 'Vuoi essere avvisato quando inizia?'}</b>
                <span>Iscriviti in un minuto: è gratis.</span>
                <div className="chips" style={{ justifyContent: 'center' }}>
                  <Link className="btn primary" href={`/accedi?modo=registrati&dopo=${dopo}`}>Iscriviti e siediti</Link>
                  <Link className="btn" href={`/accedi?dopo=${dopo}`}>Ho già un account</Link>
                </div>
              </div>
            </div>
            <div className="panel">
              <div className="tabs" role="tablist">
                <button role="tab" aria-selected={tab === 'tavolo'} onClick={() => setTab('tavolo')}>Al tavolo</button>
                <button role="tab" aria-selected={tab === 'pubblico'} onClick={() => setTab('pubblico')}>Chat del pubblico</button>
              </div>
              <div className="feed" ref={feedRef}>
                {msgs.map(m => m.canale === 'sistema'
                  ? <div key={m.id} className="msg sys"><p>{m.testo}</p></div>
                  : <div key={m.id} className="msg"><Avatar nick={m.profili?.nickname} url={m.profili?.avatar_url} />
                      <div style={{ minWidth: 0 }}><div className="who">{m.profili?.nickname || '…'}<time>{quando(m.creato_il)}</time></div><p>{m.testo}</p></div></div>)}
                {!msgs.length && <p className="hint">Ancora nessun messaggio.</p>}
              </div>
              <p className="hint" style={{ margin: 0 }}><Ico n="lock" size={13} /> Stai guardando senza account: si aggiorna da solo ogni pochi secondi.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
