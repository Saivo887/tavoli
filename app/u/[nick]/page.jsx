'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import Statistiche from '@/components/Statistiche';
import { useAuth, useToast } from '@/components/Providers';
import { Avatar, Ico, Caricamento } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { TC, messaggioErrore } from '@/lib/temi';

export default function Utente() {
  const { nick } = useParams();
  const nickname = decodeURIComponent(nick);
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [p, setP] = useState(undefined);
  const [nome, setNome] = useState(null);
  const [stat, setStat] = useState(null);
  const [mio, setMio] = useState(null);      // mia riga in seguiti verso di lui
  const [suo, setSuo] = useState(null);      // sua riga verso di me
  const [conferma, setConferma] = useState(false);

  const carica = useCallback(async () => {
    const { data } = await supabase.from('profili').select('*').eq('nickname', nickname).maybeSingle();
    setP(data || null);
    if (!data) return;
    if (data.id === user.id) { router.replace('/profilo'); return; }
    const [n, s, a, b] = await Promise.all([
      supabase.from('profili_privati').select('nome_vero').eq('id', data.id).maybeSingle(),
      supabase.rpc('statistiche', { u: data.id }),
      supabase.from('seguiti').select('stato, campanella').eq('follower_id', user.id).eq('seguito_id', data.id).maybeSingle(),
      supabase.from('seguiti').select('stato').eq('follower_id', data.id).eq('seguito_id', user.id).maybeSingle(),
    ]);
    setNome(n.data?.nome_vero || null); setStat(s.data); setMio(a.data || null); setSuo(b.data || null);
  }, [nickname, user, router]);

  useEffect(() => { if (user) carica(); }, [user, carica]);

  async function segui() {
    const { data, error } = await supabase.rpc('segui', { u: p.id });
    if (error) { toast(messaggioErrore(error)); return; }
    toast(data === 'richiesta' ? 'Richiesta inviata.' : suo?.stato === 'accettato' ? `Ora tu e ${p.nickname} siete amici.` : `Ora segui ${p.nickname}.`);
    carica();
  }
  async function smetti() {
    const { error } = await supabase.from('seguiti').delete().eq('follower_id', user.id).eq('seguito_id', p.id);
    if (error) toast(messaggioErrore(error)); else { toast(mio?.stato === 'richiesta' ? 'Richiesta annullata.' : 'Non lo segui più.'); carica(); }
  }
  async function campanella() {
    const v = !mio.campanella;
    const { error } = await supabase.from('seguiti').update({ campanella: v }).eq('follower_id', user.id).eq('seguito_id', p.id);
    if (error) toast(messaggioErrore(error)); else { toast(v ? `Ti avviseremo quando ${p.nickname} apre un tavolo.` : 'Avvisi disattivati.'); carica(); }
  }
  async function blocca() {
    const { error } = await supabase.rpc('blocca', { u: p.id });
    if (error) toast(messaggioErrore(error)); else { toast(`${p.nickname} è bloccato.`); setConferma(false); carica(); }
  }

  if (p === undefined || !user) return <Shell><Caricamento /></Shell>;
  if (!p) return <Shell><div className="empty"><h3>Nessun utente con il nickname “{nickname}”.</h3><Link className="btn" href="/persone">Cerca persone</Link></div></Shell>;

  const amici = mio?.stato === 'accettato' && suo?.stato === 'accettato';

  return (
    <Shell>
      <div className="prof">
        <div className="panel">
          <div className="idcard">
            <Avatar nick={p.nickname} url={p.avatar_url} />
            <div>
              <h1 style={{ fontSize: 26 }}>@{p.nickname}</h1>
              {nome && <div className="hint">{nome}</div>}
              <div className="chips" style={{ marginTop: 8 }}>
                {p.privato && <span className="tag"><Ico n="lock" />Profilo privato</span>}
                {amici && <span className="tag tema" style={{ '--tc': 'var(--ok)' }}>Amici</span>}
                {!amici && suo?.stato === 'accettato' && <span className="tag">Ti segue</span>}
              </div>
            </div>
          </div>
          {p.bio && <p style={{ margin: 0 }}>{p.bio}</p>}
          {p.interessi?.length > 0 && <div className="chips">{p.interessi.map(i => <span key={i} className="tag tema" style={{ '--tc': TC[i] }}>{i}</span>)}</div>}
          <div className="chips">
            {!mio && <button className="btn primary" onClick={segui}>{p.privato ? 'Chiedi di seguire' : suo?.stato === 'accettato' ? 'Segui anche tu' : 'Segui'}</button>}
            {mio?.stato === 'richiesta' && <button className="btn on" onClick={smetti}>Richiesta inviata · annulla</button>}
            {mio?.stato === 'accettato' && <>
              <button className="btn on" onClick={smetti}>Segui già · smetti</button>
              <button className={`btn ${mio.campanella ? 'primary' : ''}`} onClick={campanella}><Ico n="bell" />{mio.campanella ? 'Avvisi attivi' : 'Avvisami quando apre un tavolo'}</button>
            </>}
            {amici && <Link className="btn" href={`/chat?con=${p.nickname}`}><Ico n="chat" />Scrivi</Link>}
          </div>
        </div>
        <div className="panel">
          <Statistiche s={stat} />
          <div style={{ marginTop: 8 }}>
            {!conferma
              ? <button className="btn sm danger" onClick={() => setConferma(true)}>Blocca {p.nickname}</button>
              : <div className="req"><span className="hint">Bloccandolo smettete di seguirvi e non potrete scrivervi.</span>
                  <span className="chips"><button className="btn sm danger" onClick={blocca}>Blocca</button><button className="btn sm" onClick={() => setConferma(false)}>Annulla</button></span></div>}
          </div>
        </div>
      </div>
    </Shell>
  );
}
