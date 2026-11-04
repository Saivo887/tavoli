'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/Providers';
import { TC, TEMI, messaggioErrore } from '@/lib/temi';

export default function Accedi() {
  const { session } = useAuth();
  const router = useRouter();
  const [modo, setModo] = useState('accedi');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [nome, setNome] = useState('');
  const [errore, setErrore] = useState('');
  const [info, setInfo] = useState('');
  const [attesa, setAttesa] = useState(false);

  useEffect(() => { if (session) router.replace('/'); }, [session, router]);

  async function invia(e) {
    e.preventDefault();
    setErrore(''); setInfo(''); setAttesa(true);
    try {
      if (modo === 'accedi') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const nick = nickname.trim();
        if (!/^[A-Za-z0-9._]{3,24}$/.test(nick)) throw new Error('Il nickname deve avere 3-24 caratteri: lettere, numeri, punto o trattino basso.');
        const { data: esiste } = await supabase.rpc('nickname_libero', { n: nick }).then(r => r, () => ({ data: true }));
        if (esiste === false) throw new Error('Questo nickname è già in uso.');
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { nickname: nick, nome_vero: nome.trim() }, emailRedirectTo: window.location.origin },
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
        <div className="brand"><i />Tavoli</div>
        <h1>Siediti al tavolo.<br />Confrontati davvero.</h1>
        <p>Apri un tavolo su un tema, scegli quante sedie mettere e decidi tu le regole. Chi non trova posto ascolta dal pubblico e partecipa in chat.</p>
        <div className="temirow">{TEMI.slice(0, 5).map(t => <span key={t} style={{ background: TC[t] }}>{t}</span>)}</div>
      </section>
      <section className="box">
        <form className="form" onSubmit={invia}>
          <div className="tabs" role="tablist">
            <button type="button" role="tab" aria-selected={modo === 'accedi'} onClick={() => { setModo('accedi'); setErrore(''); }}>Accedi</button>
            <button type="button" role="tab" aria-selected={modo === 'registrati'} onClick={() => { setModo('registrati'); setErrore(''); }}>Registrati</button>
          </div>
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
            </>
          )}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="pw">Password</label>
            <input id="pw" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
              autoComplete={modo === 'accedi' ? 'current-password' : 'new-password'} />
          </div>
          {errore && <p className="err" role="alert">{errore}</p>}
          {info && <p className="hint" role="status" style={{ color: 'var(--ok)', fontWeight: 600 }}>{info}</p>}
          <button className="btn primary" disabled={attesa}>{attesa ? 'Attendi…' : modo === 'accedi' ? 'Accedi' : 'Crea account'}</button>
        </form>
      </section>
    </div>
  );
}
