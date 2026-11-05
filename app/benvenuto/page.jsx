'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth, useToast } from '@/components/Providers';
import { Avatar, MiniTable, Caricamento } from '@/components/ui';
import { TC, TEMI, messaggioErrore } from '@/lib/temi';
import { NOME } from '@/lib/sito';

export default function Benvenuto() {
  const { session, user, profilo, ricaricaProfilo } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [passo, setPasso] = useState(1);
  const [temi, setTemi] = useState([]);
  const [persone, setPersone] = useState(null);
  const [seguo, setSeguo] = useState({});
  const [tavoli, setTavoli] = useState(null);

  useEffect(() => { if (session === null) router.replace('/accedi'); }, [session, router]);
  useEffect(() => { if (profilo) setTemi(profilo.interessi || []); }, [profilo]);

  async function fine(dove = '/') {
    await supabase.from('profili').update({ onboarding_fatto: true }).eq('id', user.id);
    await ricaricaProfilo();
    router.replace(dove);
  }

  async function avanti() {
    if (passo === 1) {
      const { error } = await supabase.from('profili').update({ interessi: temi }).eq('id', user.id);
      if (error) { toast(messaggioErrore(error)); return; }
      setPasso(2);
      const { data } = await supabase.rpc('persone_consigliate');
      setPersone(data || []);
    } else if (passo === 2) {
      setPasso(3);
      const { data } = await supabase.rpc('lista_tavoli');
      const aperti = (data || []).filter(t => t.stato === 'aperto');
      aperti.sort((a, b) => (temi.includes(b.tema) ? 1 : 0) - (temi.includes(a.tema) ? 1 : 0));
      setTavoli(aperti.slice(0, 4));
    } else fine('/');
  }

  async function segui(p) {
    const { data, error } = await supabase.rpc('segui', { u: p.id });
    if (error) { toast(messaggioErrore(error)); return; }
    setSeguo(s => ({ ...s, [p.id]: data }));
  }

  if (!profilo) return <Caricamento />;

  return (
    <div className="solo">
      <div className="form benvenuto">
        <div className="brand"><i />{NOME}</div>
        <div className="passi" aria-label={`Passo ${passo} di 3`}>{[1, 2, 3].map(n => <span key={n} className={n <= passo ? 'on' : ''} />)}</div>

        {passo === 1 && <>
          <h1>Ciao {profilo.nickname}, di cosa ti piace discutere?</h1>
          <p className="sub">Scegli uno o più temi: ti mostriamo prima i tavoli e le persone che ti interessano.</p>
          <div className="chips">{TEMI.map(t => (
            <button key={t} type="button" className="chip grande" style={{ '--tc': TC[t] }} aria-pressed={temi.includes(t)}
              onClick={() => setTemi(v => v.includes(t) ? v.filter(x => x !== t) : [...v, t])}><i />{t}</button>
          ))}</div>
        </>}

        {passo === 2 && <>
          <h1>Segui qualcuno</h1>
          <p className="sub">Saprai quando apre un tavolo. Se vi seguite a vicenda diventate amici e potete scrivervi.</p>
          {persone === null ? <p className="hint">Carico…</p> : persone.length ? (
            <div className="list">{persone.map(p => (
              <div className="prow" key={p.id}>
                <span className="l"><Avatar nick={p.nickname} url={p.avatar_url} size={40} />
                  <span style={{ minWidth: 0 }}><b>{p.nickname}</b><span className="hint">{p.frase || (p.interessi?.length ? p.interessi.join(' · ') : `${p.follower} follower`)}</span></span></span>
                <button type="button" className={`btn sm ${seguo[p.id] ? 'on' : 'primary'}`} disabled={!!seguo[p.id]} onClick={() => segui(p)}>
                  {seguo[p.id] === 'richiesta' ? 'Richiesta inviata' : seguo[p.id] ? 'Lo segui' : 'Segui'}</button>
              </div>
            ))}</div>
          ) : <p className="hint">Sei tra i primi iscritti: presto qui troverai persone da seguire.</p>}
        </>}

        {passo === 3 && <>
          <h1>Siediti a un tavolo</h1>
          <p className="sub">Entra ad ascoltare e, quando ti va, prendi una sedia.</p>
          {tavoli === null ? <p className="hint">Carico…</p> : tavoli.length ? (
            <div className="list">{tavoli.map(t => (
              <button type="button" key={t.id} className="prow riga-bottone" onClick={() => fine(`/tavolo/${t.id}`)}>
                <span className="l" style={{ '--tc': TC[t.tema] }}><MiniTable sedie={t.sedie} occupati={t.seduti.length} tema={t.tema} />
                  <span><b>{t.titolo}</b><span className="hint">{t.tema} · {t.seduti.length}/{t.sedie} al tavolo · {t.pubblico} pubblico</span></span></span>
                <span className="btn sm primary">Entra</span>
              </button>
            ))}</div>
          ) : (
            <div className="empty"><p style={{ margin: 0 }}>Nessun tavolo aperto in questo momento.</p>
              <button type="button" className="btn primary" onClick={() => fine('/crea')}>Apri tu il primo</button></div>
          )}
        </>}

        <div className="trow">
          <button type="button" className="link" onClick={() => fine()}>Salta</button>
          <button type="button" className="btn primary" disabled={passo === 1 && !temi.length} onClick={avanti}>{passo < 3 ? 'Avanti' : 'Vai alla home'}</button>
        </div>
      </div>
    </div>
  );
}
