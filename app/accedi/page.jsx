'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/Providers';
import { TC, TEMI, messaggioErrore } from '@/lib/temi';
import { NOME } from '@/lib/sito';

function dataLimite() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().slice(0, 10);
}
function maggiorenne(iso) {
  if (!iso) return false;
  return iso <= dataLimite();
}

export default function Accedi() {
  const { session } = useAuth();
  const router = useRouter();
  const [modo, setModo] = useState('accedi'); // accedi | registrati | recupero
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [nome, setNome] = useState('');
  const [nascita, setNascita] = useState('');
  const [accetto, setAccetto] = useState(false);
  const [errore, setErrore] = useState('');
  const [info, setInfo] = useState('');
  const [attesa, setAttesa] = useState(false);

  const [dopo, setDopo] = useState('/');
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('eliminato')) setInfo('Il tuo account è stato eliminato. Ci dispiace vederti andare.');
    if (p.get('modo') === 'registrati') setModo('registrati');
    const d = p.get('dopo');
    if (d && d.startsWith('/') && !d.startsWith('//')) setDopo(d);
  }, []);
  useEffect(() => { if (session) router.replace(dopo); }, [session, router, dopo]);

  function cambia(m) { setModo(m); setErrore(''); setInfo(''); }

  async function invia(e) {
    e.preventDefault();
    setErrore(''); setInfo(''); setAttesa(true);
    try {
      if (modo === 'accedi') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (modo === 'recupero') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/nuova-password` });
        if (error) throw error;
        setInfo('Se esiste un account con questa email, ti abbiamo mandato un link per scegliere una nuova password. Controlla anche lo spam.');
      } else {
        const nick = nickname.trim();
        if (!/^[A-Za-z0-9._]{3,24}$/.test(nick)) throw new Error('Il nickname deve avere 3-24 caratteri: lettere, numeri, punto o trattino basso.');
        if (!maggiorenne(nascita)) throw new Error('eta_minima');
        if (!accetto) throw new Error('termini_non_accettati');
        const { data: libero } = await supabase.rpc('nickname_libero', { n: nick });
        if (libero === false) throw new Error('Questo nickname è già in uso.');
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: { nickname: nick, nome_vero: nome.trim(), data_nascita: nascita, termini: true },
            emailRedirectTo: window.location.origin + dopo,
          },
        });
        if (error) throw error;
        if (!data.session) setInfo('Ti abbiamo mandato un’email: apri il link per confermare l’account, poi accedi.');
      }
    } catch (err) {
      setErrore(messaggioErrore(err));
    } finally {
      setAttesa(false);
    }
  }

  return (
    <div className="auth">
      <section className="hero">
        <Link href="/" className="brand"><i />{NOME}</Link>
        <h1>Siediti al tavolo.<br />Confrontati davvero.</h1>
        <p>Apri un tavolo su un tema, scegli quante sedie mettere e decidi tu le regole. Chi non trova posto ascolta dal pubblico e partecipa in chat.</p>
        <div className="temirow">{TEMI.slice(0, 5).map(t => <span key={t} style={{ background: TC[t] }}>{t}</span>)}</div>
      </section>
      <section className="box">
        <form className="form" onSubmit={invia}>
          {modo === 'recupero' ? (
            <div>
              <h2 style={{ fontSize: 22 }}>Password dimenticata</h2>
              <p className="hint" style={{ margin: '4px 0 0' }}>Scrivi la tua email: ti mandiamo un link per sceglierne una nuova.</p>
            </div>
          ) : (
            <div className="tabs" role="tablist">
              <button type="button" role="tab" aria-selected={modo === 'accedi'} onClick={() => cambia('accedi')}>Accedi</button>
              <button type="button" role="tab" aria-selected={modo === 'registrati'} onClick={() => cambia('registrati')}>Registrati</button>
            </div>
          )}

          {modo === 'registrati' && (
            <>
              <div className="field">
                <label htmlFor="nick">Nickname</label>
                <input id="nick" value={nickname} onChange={e => setNickname(e.target.value)} required maxLength={24} autoComplete="username" placeholder="es. marta.b" />
                <span className="hint">È il nome con cui ti vedono ai tavoli.</span>
              </div>
              <div className="field">
                <label htmlFor="nome">Nome vero (facoltativo)</label>
                <input id="nome" value={nome} onChange={e => setNome(e.target.value)} maxLength={60} autoComplete="name" />
                <span className="hint">Lo vedono solo i tuoi follower.</span>
              </div>
              <div className="field">
                <label htmlFor="nascita">Data di nascita</label>
                <input id="nascita" type="date" value={nascita} max={dataLimite()} min="1900-01-01" onChange={e => setNascita(e.target.value)} required autoComplete="bday" />
                <span className="hint">Serve solo a verificare che tu abbia almeno 18 anni: non la conserviamo.</span>
              </div>
            </>
          )}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          {modo !== 'recupero' && (
            <div className="field">
              <label htmlFor="pw">Password</label>
              <input id="pw" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                autoComplete={modo === 'accedi' ? 'current-password' : 'new-password'} />
              {modo === 'accedi' && <button type="button" className="link" onClick={() => cambia('recupero')}>Password dimenticata?</button>}
            </div>
          )}

          {modo === 'registrati' && (
            <label className="check">
              <input type="checkbox" checked={accetto} onChange={e => setAccetto(e.target.checked)} />
              <span>Dichiaro di avere almeno 18 anni e accetto i <Link href="/termini" target="_blank">Termini d’uso</Link> e l’<Link href="/privacy" target="_blank">Informativa privacy</Link>.</span>
            </label>
          )}

          {errore && <p className="err" role="alert">{errore}</p>}
          {info && <p className="ok" role="status">{info}</p>}
          <button className="btn primary" disabled={attesa}>
            {attesa ? 'Attendi…' : modo === 'accedi' ? 'Accedi' : modo === 'registrati' ? 'Crea account' : 'Mandami il link'}
          </button>
          {modo === 'recupero' && <button type="button" className="link" onClick={() => cambia('accedi')}>Torna all’accesso</button>}
          <p className="legali"><Link href="/termini">Termini</Link> · <Link href="/privacy">Privacy</Link> · <Link href="/cookie">Cookie</Link></p>
        </form>
      </section>
    </div>
  );
}
