'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import Shell from './Shell';
import { useAuth, useToast } from './Providers';
import { Avatar, Ico, MiniTable, Caricamento } from './ui';
import { supabase } from '@/lib/supabase';
import { TC, TEMI, dataProgrammata, messaggioErrore, quando } from '@/lib/temi';

function traQuanto(iso) {
  const s = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  if (s <= 0) return 'sta per iniziare';
  const g = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (g > 0) return `tra ${g} ${g === 1 ? 'giorno' : 'giorni'} e ${h} h`;
  if (h > 0) return `tra ${h} h e ${m} min`;
  return `tra ${Math.max(1, m)} min`;
}

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
        <div className="meta"><span><b>{t.seduti.length}/{t.sedie}</b> al tavolo</span><span><b>{t.pubblico}</b> pubblico</span></div>
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

export default function HomeLoggato() {
  const { user } = useAuth();
  const toast = useToast();
  const [tavoli, setTavoli] = useState(null);
  const [finiti, setFiniti] = useState([]);
  const [seguiti, setSeguiti] = useState(new Set());
  const [filtro, setFiltro] = useState('Tutti');
  const [, setTick] = useState(0);

  const carica = useCallback(async () => {
    const { data, error } = await supabase.rpc('lista_tavoli');
    if (error) { toast(messaggioErrore(error)); setTavoli([]); return; }
    setTavoli(data || []);
  }, [toast]);

  useEffect(() => {
    if (!user) return;
    carica();
    supabase.rpc('tavoli_finiti').then(({ data }) => setFiniti(data || []));
    supabase.from('seguiti').select('seguito_id').eq('follower_id', user.id).eq('stato', 'accettato')
      .then(({ data }) => setSeguiti(new Set((data || []).map(r => r.seguito_id))));
    const iv = setInterval(carica, 15000);
    const tk = setInterval(() => setTick(x => x + 1), 30000);
    const ch = supabase.channel('home').on('postgres_changes', { event: '*', schema: 'public', table: 'tavoli' }, carica).subscribe();
    return () => { clearInterval(iv); clearInterval(tk); supabase.removeChannel(ch); };
  }, [user, carica]);

  async function apri(id) {
    const { error } = await supabase.rpc('apri_tavolo', { t: id });
    if (error) toast(messaggioErrore(error)); else window.location.href = `/tavolo/${id}`;
  }
  async function prenota(t) {
    const { error } = await supabase.rpc('prenota', { t: t.id, v: !t.prenotato });
    if (error) { toast(messaggioErrore(error)); return; }
    toast(t.prenotato ? 'Avviso tolto.' : 'Ti avviseremo appena il tavolo si apre.');
    carica();
  }

  if (!tavoli) return <Shell><Caricamento /></Shell>;

  const filtrati = tavoli.filter(t => filtro === 'Tutti' || t.tema === filtro);
  const aperti = filtrati.filter(t => t.stato === 'aperto');
  const programmati = filtrati.filter(t => t.stato === 'programmato');
  const tuttiAperti = tavoli.filter(t => t.stato === 'aperto');
  const tuttiProg = tavoli.filter(t => t.stato === 'programmato');
  const giorno = tavoli.find(t => t.in_evidenza)
    || [...tuttiAperti].sort((a, b) => (b.seduti.length + b.pubblico) - (a.seduti.length + a.pubblico))[0]
    || tuttiProg[0];
  const conAmici = aperti.filter(t => t.seduti.some(s => seguiti.has(s.id)) && t.id !== giorno?.id);
  const altri = aperti.filter(t => !conAmici.includes(t) && t.id !== giorno?.id);
  const finitiF = finiti.filter(t => filtro === 'Tutti' || t.tema === filtro);

  function pulsanteProg(t) {
    if (t.creatore_id === user.id) return <button className="btn primary" onClick={e => { e.preventDefault(); apri(t.id); }}>Apri ora</button>;
    return <button className={`btn ${t.prenotato ? 'on' : ''}`} onClick={e => { e.preventDefault(); prenota(t); }}><Ico n="bell" />{t.prenotato ? 'Ti avviseremo' : 'Avvisami'}</button>;
  }

  return (
    <Shell>
      <div className="head">
        <div><h1>Tavoli aperti ora</h1><p className="sub">Siediti a parlare o ascolta dal pubblico.</p></div>
        <div className="chips">
          <Link className="btn" href="/persone"><Ico n="search" />Trova persone</Link>
          <Link className="btn primary" href="/crea"><Ico n="plus" />Apri un tavolo</Link>
        </div>
      </div>

      {giorno && filtro === 'Tutti' && (
        <Link href={`/tavolo/${giorno.id}`} className="giorno" style={{ '--tc': TC[giorno.tema] }}>
          <div className="giorno-testo">
            <span className="label">{giorno.in_evidenza ? 'Tavolo del giorno' : giorno.stato === 'aperto' ? 'Il tavolo più animato adesso' : 'Il prossimo tavolo'}</span>
            <h2>{giorno.titolo}</h2>
            <div className="chips">
              <span className="tag tema">{giorno.tema}</span>
              {giorno.stato === 'aperto'
                ? <><span className="tag live">In corso</span><span className="tag">{giorno.seduti.length}/{giorno.sedie} al tavolo · {giorno.pubblico} pubblico</span></>
                : <><span className="tag">{dataProgrammata(giorno.inizio_previsto)}</span><span className="tag conto">Inizia {traQuanto(giorno.inizio_previsto)}</span></>}
              {giorno.ricorrente && <span className="tag">Ogni settimana</span>}
            </div>
            <div className="chips">
              {giorno.stato === 'aperto' ? <span className="btn primary">Entra al tavolo</span> : pulsanteProg(giorno)}
              {giorno.stato === 'programmato' && giorno.prenotati > 0 && <span className="hint">{giorno.prenotati} {giorno.prenotati === 1 ? 'persona aspetta' : 'persone aspettano'}</span>}
            </div>
          </div>
          <MiniTable sedie={giorno.sedie} occupati={giorno.seduti.length} tema={giorno.tema} />
        </Link>
      )}

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
        <div className="label">{conAmici.length ? 'Altri tavoli' : 'Tavoli aperti'}</div>
        <div className="grid">{altri.map(t => <Scheda key={t.id} t={t} seguiti={seguiti} mio={t.creatore_id === user.id} />)}</div>
      </>}
      {aperti.length === 0 && (
        <div className="empty">
          <MiniTable sedie={6} occupati={0} tema={filtro === 'Tutti' ? 'Altro' : filtro} />
          <h3>Nessun tavolo aperto{filtro !== 'Tutti' ? ` su ${filtro}` : ''} in questo momento</h3>
          <p className="hint" style={{ margin: 0 }}>{programmati.length ? 'Qui sotto trovi i prossimi: fatti avvisare quando iniziano.' : 'Apri il primo tavolo: chi ti segue con la campanella riceverà un avviso.'}</p>
          <Link className="btn primary" href="/crea"><Ico n="plus" />Apri un tavolo</Link>
        </div>
      )}

      {programmati.filter(t => t.id !== giorno?.id || filtro !== 'Tutti').length > 0 && <>
        <div className="label">In programma</div>
        {programmati.filter(t => t.id !== giorno?.id || filtro !== 'Tutti').map(t => (
          <Link key={t.id} href={`/tavolo/${t.id}`} className="sched" style={{ '--tc': TC[t.tema] }}>
            <div>
              <div className="when">{dataProgrammata(t.inizio_previsto)} · {traQuanto(t.inizio_previsto)}</div>
              <h3 style={{ fontSize: 17, marginTop: 4 }}>{t.titolo}</h3>
              <div className="hint">{t.tema} · di {t.creatore}{t.ricorrente ? ' · ogni settimana' : ''}{t.prenotati ? ` · ${t.prenotati} in attesa` : ''}</div>
            </div>
            {pulsanteProg(t)}
          </Link>
        ))}
      </>}

      {finitiF.length > 0 && <>
        <div className="label">Appena finiti</div>
        <div className="grid">
          {finitiF.map(t => (
            <Link key={t.id} href={`/tavolo/${t.id}`} className="tcard finito" style={{ '--tc': TC[t.tema] }}>
              <div className="trow" style={{ justifyContent: 'flex-start' }}><span className="tag tema">{t.tema}</span><span className="tag">Finito {quando(t.chiuso_il)}</span></div>
              <h3>{t.titolo}</h3>
              <p className="hint" style={{ margin: 0 }}>{t.verbale?.sintesi || (t.verbale ? `${t.verbale.durata_minuti} minuti · ${t.verbale.al_tavolo} al tavolo · ${t.verbale.pubblico} nel pubblico` : `Aperto da ${t.creatore}`)}</p>
              <span className="hint" style={{ fontWeight: 700, color: 'var(--accent)' }}>Leggi il verbale</span>
            </Link>
          ))}
        </div>
      </>}
    </Shell>
  );
}
