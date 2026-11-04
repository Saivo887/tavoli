'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { useAuth, useToast } from '@/components/Providers';
import { Avatar, Ico, MiniTable, Caricamento } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { TC, TEMI, dataProgrammata, messaggioErrore } from '@/lib/temi';

function Scheda({ t, seguiti, mio }) {
  const amici = t.seduti.filter(s => seguiti.has(s.id)).map(s => s.nickname);
  return (
    <Link className="tcard" href={`/tavolo/${t.id}`} style={{ '--tc': TC[t.tema] }}>
      <MiniTable sedie={t.sedie} occupati={t.seduti.length} tema={t.tema} />
      <div className="trow" style={{ justifyContent: 'flex-start' }}>
        <span className="tag tema">{t.tema}</span>
        <span className="tag live">In corso</span>
        {t.visibilita === 'privato' && <span className="tag"><Ico n="lock" />Privato</span>}
      </div>
      <h3>{t.titolo}</h3>
      <div className="trow">
        <div className="seatsbar" aria-label={`${t.seduti.length} sedie occupate su ${t.sedie}`}>
          {Array.from({ length: t.sedie }, (_, i) => <span key={i} className={i < t.seduti.length ? 'on' : ''} />)}
        </div>
        <div className="meta">
          <span><b>{t.seduti.length}/{t.sedie}</b> al tavolo</span>
          <span><b>{t.pubblico}</b> pubblico</span>
        </div>
      </div>
      <div className="trow">
        <div className="friends">
          <span className="stack">{t.seduti.slice(0, 4).map(s => <Avatar key={s.id} nick={s.nickname} url={s.avatar_url} size={24} />)}</span>
          {amici.length
            ? <span><b style={{ color: 'var(--fg)' }}>{amici.join(', ')}</b> {amici.length > 1 ? 'sono seduti' : 'è al tavolo'}</span>
            : <span>{mio ? 'Il tuo tavolo' : `di ${t.creatore}`}</span>}
        </div>
        <span className="hint">{t.parola === 'mano' ? 'Alzata di mano' : 'Parola libera'} · {t.ingresso === 'libero' ? 'Ingresso libero' : 'Ingresso a scelta'}</span>
      </div>
    </Link>
  );
}

export default function Home() {
  const { user } = useAuth();
  const toast = useToast();
  const [tavoli, setTavoli] = useState(null);
  const [seguiti, setSeguiti] = useState(new Set());
  const [filtro, setFiltro] = useState('Tutti');

  const carica = useCallback(async () => {
    const { data, error } = await supabase.rpc('lista_tavoli');
    if (error) { toast(messaggioErrore(error)); setTavoli([]); return; }
    setTavoli(data || []);
  }, [toast]);

  useEffect(() => {
    if (!user) return;
    carica();
    supabase.from('seguiti').select('seguito_id').eq('follower_id', user.id).eq('stato', 'accettato')
      .then(({ data }) => setSeguiti(new Set((data || []).map(r => r.seguito_id))));
    const iv = setInterval(carica, 15000);
    const ch = supabase.channel('home').on('postgres_changes', { event: '*', schema: 'public', table: 'tavoli' }, carica).subscribe();
    return () => { clearInterval(iv); supabase.removeChannel(ch); };
  }, [user, carica]);

  async function apri(id) {
    const { error } = await supabase.rpc('apri_tavolo', { t: id });
    if (error) toast(messaggioErrore(error)); else window.location.href = `/tavolo/${id}`;
  }

  if (!tavoli) return <Shell><Caricamento /></Shell>;

  const filtrati = tavoli.filter(t => filtro === 'Tutti' || t.tema === filtro);
  const aperti = filtrati.filter(t => t.stato === 'aperto');
  const conAmici = aperti.filter(t => t.seduti.some(s => seguiti.has(s.id)));
  const altri = aperti.filter(t => !conAmici.includes(t));
  const programmati = filtrati.filter(t => t.stato === 'programmato');

  return (
    <Shell>
      <div className="head">
        <div><h1>Tavoli aperti ora</h1><p className="sub">Siediti a parlare o ascolta dal pubblico.</p></div>
        <div className="chips">
          <Link className="btn" href="/persone"><Ico n="search" />Trova persone</Link>
          <Link className="btn primary" href="/crea"><Ico n="plus" />Apri un tavolo</Link>
        </div>
      </div>
      <div className="chips">
        {['Tutti', ...TEMI].map(t => (
          <button key={t} className="chip" style={{ '--tc': TC[t] }} aria-pressed={filtro === t} onClick={() => setFiltro(t)}>
            {t !== 'Tutti' && <i />}{t}
          </button>
        ))}
      </div>

      {conAmici.length > 0 && <>
        <div className="label">Dove sono le persone che segui</div>
        <div className="grid">{conAmici.map(t => <Scheda key={t.id} t={t} seguiti={seguiti} mio={t.creatore_id === user.id} />)}</div>
      </>}
      {altri.length > 0 && <>
        <div className="label">{conAmici.length ? 'Altri tavoli' : 'Tutti i tavoli'}</div>
        <div className="grid">{altri.map(t => <Scheda key={t.id} t={t} seguiti={seguiti} mio={t.creatore_id === user.id} />)}</div>
      </>}
      {aperti.length === 0 && (
        <div className="empty">
          <MiniTable sedie={6} occupati={0} tema={filtro === 'Tutti' ? 'Altro' : filtro} />
          <h3>Nessun tavolo aperto{filtro !== 'Tutti' ? ` su ${filtro}` : ''}</h3>
          <p className="hint" style={{ margin: 0 }}>Apri il primo tavolo e invita chi ti segue.</p>
          <Link className="btn primary" href="/crea"><Ico n="plus" />Apri un tavolo</Link>
        </div>
      )}

      {programmati.length > 0 && <>
        <div className="label">In programma</div>
        {programmati.map(t => (
          <div key={t.id} className="sched" style={{ '--tc': TC[t.tema] }}>
            <div>
              <div className="when">{dataProgrammata(t.inizio_previsto)}</div>
              <h3 style={{ fontSize: 17, marginTop: 4 }}>{t.titolo}</h3>
              <div className="hint">{t.tema} · di <Link href={`/u/${t.creatore}`}>{t.creatore}</Link></div>
            </div>
            {t.creatore_id === user.id
              ? <button className="btn primary" onClick={() => apri(t.id)}>Apri ora</button>
              : <Link className="btn" href={`/u/${t.creatore}`}><Ico n="bell" />Avvisami</Link>}
          </div>
        ))}
      </>}
    </Shell>
  );
}
