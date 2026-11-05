'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { messaggioErrore } from '@/lib/temi';
import { NOME } from '@/lib/sito';

export default function NuovaPassword() {
  const router = useRouter();
  const [pronto, setPronto] = useState(false);
  const [scaduto, setScaduto] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [errore, setErrore] = useState('');
  const [attesa, setAttesa] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((evento, s) => {
      if (s && (evento === 'PASSWORD_RECOVERY' || evento === 'SIGNED_IN' || evento === 'INITIAL_SESSION')) setPronto(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setPronto(true); });
    const t = setTimeout(() => setScaduto(true), 6000);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  async function salva(e) {
    e.preventDefault();
    setErrore('');
    if (pw.length < 6) { setErrore('La password deve avere almeno 6 caratteri.'); return; }
    if (pw !== pw2) { setErrore('Le due password non coincidono.'); return; }
    setAttesa(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setAttesa(false);
    if (error) { setErrore(messaggioErrore(error)); return; }
    router.replace('/');
  }

  return (
    <div className="solo">
      <form className="form" onSubmit={salva}>
        <div className="brand"><i />{NOME}</div>
        <h1 style={{ fontSize: 26 }}>Scegli una nuova password</h1>
        {!pronto && !scaduto && <p className="hint">Sto verificando il link…</p>}
        {!pronto && scaduto && (
          <>
            <p className="err">Il link non è valido o è scaduto. Chiedine uno nuovo dalla pagina di accesso.</p>
            <Link className="btn primary" href="/accedi">Vai all’accesso</Link>
          </>
        )}
        {pronto && (
          <>
            <div className="field"><label htmlFor="pw">Nuova password</label>
              <input id="pw" type="password" value={pw} minLength={6} onChange={e => setPw(e.target.value)} autoComplete="new-password" required /></div>
            <div className="field"><label htmlFor="pw2">Ripeti la password</label>
              <input id="pw2" type="password" value={pw2} minLength={6} onChange={e => setPw2(e.target.value)} autoComplete="new-password" required /></div>
            {errore && <p className="err" role="alert">{errore}</p>}
            <button className="btn primary" disabled={attesa}>{attesa ? 'Salvataggio…' : 'Salva e entra'}</button>
          </>
        )}
      </form>
    </div>
  );
}
