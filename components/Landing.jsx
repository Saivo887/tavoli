'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TC, TEMI, dataProgrammata } from '@/lib/temi';
import { NOME } from '@/lib/sito';
import { Avatar, MiniTable } from './ui';

const ESEMPIO = ['giulia', 'marco', 'sara', 'luca', 'nadia'];

function TavoloAnimato() {
  const n = 6;
  return (
    <div className="tablewrap hero-tavolo" aria-hidden="true">
      <div className="wood" />
      <div className="placard"><strong>Lo smart working ci rende più felici?</strong><small>5/6 sedie occupate</small></div>
      {Array.from({ length: n }, (_, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        const x = 50 + 41 * Math.cos(a), y = 50 + 41 * Math.sin(a), deg = (a * 180) / Math.PI + 90;
        const nick = ESEMPIO[i];
        return (
          <span key={i} className={`seat ${nick ? 'arriva' : 'vuota'} ${i === 2 ? 'parla' : ''}`} style={{ left: `${x}%`, top: `${y}%`, '--d': `${i * 0.35}s` }}>
            <span className="chair" style={{ '--a': `${deg}deg` }} />
            {nick ? <Avatar nick={nick} /> : <span className="av">+</span>}
            <span className="nm">{nick || 'libera'}</span>
          </span>
        );
      })}
    </div>
  );
}

export default function Landing() {
  const [tavoli, setTavoli] = useState(null);

  useEffect(() => {
    supabase.rpc('lista_tavoli').then(({ data }) => setTavoli(data || []));
  }, []);

  const aperti = (tavoli || []).filter(t => t.stato === 'aperto');
  const prossimi = (tavoli || []).filter(t => t.stato === 'programmato').slice(0, 3);

  return (
    <div className="landing">
      <header className="l-top">
        <Link href="/" className="brand"><i />{NOME}</Link>
        <nav className="chips">
          <Link className="btn" href="/accedi">Accedi</Link>
          <Link className="btn primary" href="/accedi?modo=registrati">Iscriviti</Link>
        </nav>
      </header>

      <section className="l-hero">
        <div className="l-hero-testo">
          <h1>Siediti al tavolo.<br />Confrontati davvero.</h1>
          <p>Apri un tavolo su un tema, scegli quante sedie mettere e le regole. Chi è seduto parla o scrive, gli altri ascoltano dal pubblico e commentano in chat.</p>
          <div className="chips">
            <Link className="btn primary grande" href="/accedi?modo=registrati">Iscriviti gratis</Link>
            {aperti[0] && <Link className="btn grande chiaro" href={`/tavolo/${aperti[0].id}`}>Ascolta un tavolo</Link>}
          </div>
          <div className="temirow">{TEMI.slice(0, 5).map(t => <span key={t} style={{ background: TC[t] }}>{t}</span>)}</div>
        </div>
        <TavoloAnimato />
      </section>

      <section className="l-sezione">
        <div className="head"><div><h2>Al tavolo adesso</h2><p className="sub">Entra ad ascoltare senza account. Per sederti ti basta iscriverti.</p></div></div>
        {tavoli === null ? <p className="hint">Carico i tavoli…</p> : aperti.length ? (
          <div className="grid">
            {aperti.slice(0, 6).map(t => (
              <Link key={t.id} className="tcard" href={`/tavolo/${t.id}`} style={{ '--tc': TC[t.tema] }}>
                <MiniTable sedie={t.sedie} occupati={t.seduti.length} tema={t.tema} />
                <div className="trow" style={{ justifyContent: 'flex-start' }}><span className="tag tema">{t.tema}</span><span className="tag live">In corso</span></div>
                <h3>{t.titolo}</h3>
                <div className="trow">
                  <span className="stack">{t.seduti.slice(0, 5).map(s => <Avatar key={s.id} nick={s.nickname} url={s.avatar_url} size={24} />)}</span>
                  <div className="meta"><span><b>{t.seduti.length}/{t.sedie}</b> al tavolo</span><span><b>{t.pubblico}</b> pubblico</span></div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty">
            <h3>In questo momento nessun tavolo è aperto</h3>
            <p className="hint" style={{ margin: 0 }}>{prossimi.length ? 'Ecco i prossimi in programma.' : 'Iscriviti e apri il primo: chi ti segue riceverà un avviso.'}</p>
          </div>
        )}
        {prossimi.length > 0 && (
          <div className="l-prossimi">
            {prossimi.map(t => (
              <Link key={t.id} href={`/tavolo/${t.id}`} className="sched" style={{ '--tc': TC[t.tema] }}>
                <div><div className="when">{dataProgrammata(t.inizio_previsto)}</div><h3 style={{ fontSize: 17, marginTop: 4 }}>{t.titolo}</h3><div className="hint">{t.tema} · di {t.creatore}</div></div>
                <span className="btn sm">Dettagli</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="l-sezione">
        <h2>Come funziona</h2>
        <ol className="l-passi">
          <li><b>Apri un tavolo</b><span>Scegli il tema, il titolo e quante sedie mettere. Puoi aprirlo subito o programmarlo, anche ogni settimana.</span></li>
          <li><b>Decidi le regole</b><span>Parola libera o alzata di mano, ingresso libero o su richiesta. Puoi far sedere, silenziare ed espellere.</span></li>
          <li><b>Parla, scrivi o ascolta</b><span>Al tavolo si parla a voce o si scrive. Chi non trova posto ascolta dal pubblico, reagisce e commenta in chat.</span></li>
          <li><b>Rileggi com’è andata</b><span>A fine discussione trovi il verbale: chi ha partecipato, quanto è durata, le posizioni emerse.</span></li>
        </ol>
      </section>

      <section className="l-sezione l-regole">
        <div>
          <h2>Si discute dell’idea, non della persona</h2>
          <p>Su {NOME} ci si confronta anche duramente, ma con rispetto. Ogni tavolo ha chi lo gestisce e ogni persona può segnalare chi esagera.</p>
        </div>
        <Link className="btn" href="/regole">Leggi le regole della casa</Link>
      </section>

      <footer className="l-foot">
        <span className="brand"><i />{NOME}</span>
        <p className="legali"><Link href="/regole">Regole</Link> · <Link href="/termini">Termini</Link> · <Link href="/privacy">Privacy</Link> · <Link href="/cookie">Cookie</Link></p>
        <p className="hint">Riservato ai maggiori di 18 anni.</p>
      </footer>
    </div>
  );
}
