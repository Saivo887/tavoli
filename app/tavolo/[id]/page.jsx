'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import Shell from '@/components/Shell';
import { useAuth, useToast } from '@/components/Providers';
import { Avatar, Ico, Seg, Caricamento } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { TC, dataProgrammata, messaggioErrore, quando } from '@/lib/temi';

const SEL_P = 'utente_id, ruolo, mezzo, mano_alzata, ha_parola, silenziato, presente, seduto_il, profili(nickname, avatar_url)';
const SEL_M = 'id, utente_id, canale, testo, creato_il, profili(nickname, avatar_url)';

function posizione(i, n, r = 41) {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return [50 + r * Math.cos(a), 50 + r * Math.sin(a), (a * 180) / Math.PI + 90];
}

export default function Tavolo() {
  const { id } = useParams();
  const tid = Number(id);
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [tav, setTav] = useState(null);
  const [parts, setParts] = useState([]);
  const [msgs, setMsgs] = useState([]);
  const [richieste, setRichieste] = useState([]);
  const [stato, setStato] = useState('carico'); // carico | dentro | errore
  const [errore, setErrore] = useState('');
  const [tab, setTab] = useState('tavolo');
  const [testo, setTesto] = useState('');
  const [pop, setPop] = useState(null);
  const [seguo, setSeguo] = useState({});
  const [, setTick] = useState(0);
  const feedRef = useRef(null);
  const cache = useRef({});

  const caricaTavolo = useCallback(async () => {
    const { data } = await supabase.from('tavoli').select('*').eq('id', tid).maybeSingle();
    setTav(data);
    return data;
  }, [tid]);

  const caricaParts = useCallback(async () => {
    const { data } = await supabase.from('partecipanti').select(SEL_P).eq('tavolo_id', tid).eq('presente', true);
    (data || []).forEach(p => { cache.current[p.utente_id] = p.profili; });
    setParts(data || []);
  }, [tid]);

  const caricaMsgs = useCallback(async () => {
    const { data } = await supabase.from('messaggi').select(SEL_M).eq('tavolo_id', tid).order('id', { ascending: false }).limit(150);
    (data || []).forEach(m => { if (m.utente_id && m.profili) cache.current[m.utente_id] = m.profili; });
    setMsgs((data || []).reverse());
  }, [tid]);

  const caricaRichieste = useCallback(async () => {
    const { data } = await supabase.from('richieste_sedia').select('utente_id, creato_il').eq('tavolo_id', tid).order('creato_il');
    setRichieste(data || []);
  }, [tid]);

  // ingresso
  useEffect(() => {
    if (!user || !tid) return;
    let vivo = true;
    (async () => {
      const t = await caricaTavolo();
      if (!vivo) return;
      if (!t) { setErrore('Questo tavolo non esiste o non puoi vederlo.'); setStato('errore'); return; }
      if (t.stato !== 'aperto') { setStato('dentro'); await caricaMsgs(); return; }
      const { error } = await supabase.rpc('entra_tavolo', { t: tid });
      if (!vivo) return;
      if (error) { setErrore(messaggioErrore(error)); setStato('errore'); return; }
      await Promise.all([caricaParts(), caricaMsgs(), caricaRichieste()]);
      setStato('dentro');
    })();
    return () => { vivo = false; };
  }, [user, tid, caricaTavolo, caricaParts, caricaMsgs, caricaRichieste]);

  // tempo reale + presenza
  useEffect(() => {
    if (stato !== 'dentro' || !tav || tav.stato !== 'aperto') return;
    const ch = supabase.channel(`tavolo-${tid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partecipanti', filter: `tavolo_id=eq.${tid}` }, caricaParts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'richieste_sedia', filter: `tavolo_id=eq.${tid}` }, caricaRichieste)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tavoli', filter: `id=eq.${tid}` }, p => setTav(p.new))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messaggi', filter: `tavolo_id=eq.${tid}` }, async p => {
        const m = p.new;
        if (m.utente_id && !cache.current[m.utente_id]) {
          const { data } = await supabase.from('profili').select('nickname, avatar_url').eq('id', m.utente_id).maybeSingle();
          cache.current[m.utente_id] = data;
        }
        setMsgs(prev => prev.some(x => x.id === m.id) ? prev : [...prev, { ...m, profili: cache.current[m.utente_id] }].slice(-300));
      })
      .subscribe();
    const ping = setInterval(() => supabase.rpc('ping', { t: tid }), 25000);
    const tick = setInterval(() => setTick(x => x + 1), 4000);
    const esci = () => { supabase.rpc('esci_tavolo', { t: tid }); };
    window.addEventListener('pagehide', esci);
    return () => {
      supabase.removeChannel(ch); clearInterval(ping); clearInterval(tick);
      window.removeEventListener('pagehide', esci);
      esci();
    };
  }, [stato, tav?.stato, tid, caricaParts, caricaRichieste]); // eslint-disable-line

  // scroll in fondo
  useEffect(() => { const f = feedRef.current; if (f) f.scrollTop = f.scrollHeight; }, [msgs, tab]);

  // espulso?
  const io = parts.find(p => p.utente_id === user?.id);
  useEffect(() => {
    if (stato === 'dentro' && tav?.stato === 'aperto' && parts.length && !io) {
      supabase.from('espulsioni').select('utente_id').eq('tavolo_id', tid).eq('utente_id', user.id).maybeSingle()
        .then(({ data }) => { if (data) { setErrore('Sei stato espulso da questo tavolo.'); setStato('errore'); } });
    }
  }, [parts, io, stato, tav, tid, user]);

  useEffect(() => {
    const chiudi = () => setPop(null);
    window.addEventListener('scroll', chiudi, { passive: true });
    return () => window.removeEventListener('scroll', chiudi);
  }, []);

  async function rpc(nome, args, ok) {
    const { error } = await supabase.rpc(nome, { t: tid, ...args });
    if (error) { toast(messaggioErrore(error)); return false; }
    if (ok) toast(ok);
    caricaParts(); caricaRichieste();
    return true;
  }

  async function invia(e) {
    e.preventDefault();
    const v = testo.trim(); if (!v) return;
    const canale = tab === 'tavolo' ? 'tavolo' : 'pubblico';
    setTesto('');
    const { error } = await supabase.from('messaggi').insert({ tavolo_id: tid, utente_id: user.id, canale, testo: v });
    if (error) { toast(messaggioErrore(error)); setTesto(v); }
  }

  async function apriPop(p, el) {
    const r = el.getBoundingClientRect();
    const w = 250;
    const x = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), window.innerWidth - w - 12);
    const y = r.bottom + 8 + 260 > window.innerHeight ? Math.max(12, r.top - 268) : r.bottom + 8;
    setPop({ p, x, y });
    if (p.utente_id !== user.id && seguo[p.utente_id] === undefined) {
      const { data } = await supabase.from('seguiti').select('stato').eq('follower_id', user.id).eq('seguito_id', p.utente_id).maybeSingle();
      setSeguo(s => ({ ...s, [p.utente_id]: data?.stato || null }));
    }
  }

  async function segui(uid) {
    const { data, error } = await supabase.rpc('segui', { u: uid });
    if (error) { toast(messaggioErrore(error)); return; }
    setSeguo(s => ({ ...s, [uid]: data }));
    toast(data === 'richiesta' ? 'Richiesta inviata: ha il profilo privato.' : 'Ora lo segui.');
  }

  if (stato === 'carico' || !user) return <Shell wide><Caricamento testo="Ti stai sedendo…" /></Shell>;
  if (stato === 'errore') return (
    <Shell wide>
      <div className="empty"><h3>{errore}</h3><Link className="btn primary" href="/">Torna ai tavoli</Link></div>
    </Shell>
  );

  const creatore = tav.creatore_id === user.id;
  const tc = TC[tav.tema];

  if (tav.stato !== 'aperto') {
    return (
      <Shell wide>
        <section className="scene" style={{ '--tc': tc }}>
          <Link className="back" href="/"><Ico n="back" />Tutti i tavoli</Link>
          <div className="chips"><span className="tag tema">{tav.tema}</span><span className="tag">{tav.stato === 'chiuso' ? 'Chiuso' : 'In programma'}</span></div>
          <h1>{tav.titolo}</h1>
          {tav.stato === 'programmato'
            ? <p className="sub">Si apre {dataProgrammata(tav.inizio_previsto).toLowerCase()}.</p>
            : <p className="sub">Questa discussione è finita. Ecco cosa si è scritto al tavolo.</p>}
          {tav.stato === 'programmato' && creatore && (
            <div><button className="btn primary" onClick={async () => { if (await rpc('apri_tavolo', {})) window.location.reload(); }}>Apri il tavolo ora</button></div>
          )}
          {tav.stato === 'chiuso' && (
            <div className="panel"><div className="feed">{msgs.filter(m => m.canale !== 'pubblico').map(m => <Msg key={m.id} m={m} io={user.id} />)}
              {!msgs.length && <p className="hint">Nessun messaggio.</p>}</div></div>
          )}
        </section>
      </Shell>
    );
  }

  const seduti = parts.filter(p => p.ruolo !== 'pubblico')
    .sort((a, b) => (a.ruolo === 'creatore' ? -1 : b.ruolo === 'creatore' ? 1 : new Date(a.seduto_il) - new Date(b.seduto_il)));
  const pubblico = parts.filter(p => p.ruolo === 'pubblico');
  const pieno = seduti.length >= tav.sedie;
  const sonoSeduto = io && io.ruolo !== 'pubblico';
  const hoChiesto = richieste.some(r => r.utente_id === user.id);
  const mani = seduti.filter(p => p.mano_alzata);
  const ultimiTavolo = msgs.filter(m => m.canale === 'tavolo');
  const ultimo = ultimiTavolo[ultimiTavolo.length - 1];
  const parlaId = ultimo && Date.now() - new Date(ultimo.creato_il).getTime() < 12000 ? ultimo.utente_id : null;
  const puoScrivereTavolo = sonoSeduto && !io.silenziato && (tav.parola === 'libera' || creatore || io.ha_parola);
  const nickDi = uid => cache.current[uid]?.nickname || '…';

  async function sediaVuota() {
    if (sonoSeduto) { toast('Sei già seduto al tavolo.'); return; }
    if (tav.ingresso === 'libero' || creatore) await rpc('siediti', {}, 'Ti sei seduto.');
    else await rpc('chiedi_sedia', { attiva: !hoChiesto }, hoChiesto ? 'Richiesta annullata.' : 'Richiesta inviata al creatore.');
  }

  const sedie = Array.from({ length: tav.sedie }, (_, i) => {
    const p = seduti[i];
    const [x, y, deg] = posizione(i, tav.sedie);
    const sedia = <span className="chair" style={{ '--a': `${deg}deg` }} />;
    if (!p) return (
      <button key={'v' + i} className="seat vuota" style={{ left: `${x}%`, top: `${y}%` }} onClick={sediaVuota} aria-label="Sedia libera">
        {sedia}<span className="av">+</span><span className="nm" style={{ opacity: .75 }}>libera</span>
      </button>
    );
    const icona = p.mano_alzata ? <span className="ic mano"><Ico n="hand" /></span>
      : p.silenziato ? <span className="ic muto"><Ico n="micoff" /></span>
      : p.ha_parola ? <span className="ic"><Ico n="mic" /></span> : null;
    return (
      <button key={p.utente_id} className={`seat ${parlaId === p.utente_id ? 'parla' : ''}`} style={{ left: `${x}%`, top: `${y}%` }}
        onClick={e => { e.stopPropagation(); apriPop(p, e.currentTarget); }} aria-label={p.profili?.nickname}>
        {sedia}<Avatar nick={p.profili?.nickname} url={p.profili?.avatar_url} />
        {p.ruolo === 'creatore' && <span className="crown">CREATORE</span>}
        {icona}
        <span className="nm">{p.utente_id === user.id ? 'tu' : p.profili?.nickname}</span>
      </button>
    );
  });
  const tazze = seduti.map((p, i) => { const [x, y] = posizione(i, tav.sedie, 25); return <span key={'c' + p.utente_id} className="cup" style={{ left: `${x}%`, top: `${y}%` }} />; });

  const feed = tab === 'tavolo' ? msgs.filter(m => m.canale !== 'pubblico') : msgs.filter(m => m.canale === 'pubblico');

  return (
    <Shell wide>
      <section className="scene" style={{ '--tc': tc }} onClick={() => setPop(null)}>
        <Link className="back" href="/"><Ico n="back" />Tutti i tavoli</Link>
        <div className="head">
          <div>
            <div className="chips">
              <span className="tag tema">{tav.tema}</span><span className="tag live">In corso</span>
              <span className="tag">{tav.parola === 'mano' ? 'Alzata di mano' : 'Parola libera'}</span>
              <span className="tag">{tav.ingresso === 'libero' ? 'Ingresso libero' : 'Ingresso a scelta'}</span>
              {tav.visibilita === 'privato' && <span className="tag"><Ico n="lock" />Privato</span>}
            </div>
            <h1 style={{ marginTop: 10 }}>{tav.titolo}</h1>
            <p className="sub">Creato da {creatore ? 'te' : <Link href={`/u/${nickDi(tav.creatore_id)}`} style={{ textDecoration: 'underline' }}>{nickDi(tav.creatore_id)}</Link>} · <b style={{ fontFamily: 'var(--f-mono)', fontWeight: 500 }}>{pubblico.length}</b> nel pubblico</p>
          </div>
        </div>

        <div className="room">
          <div className="panel stage">
            <div className="tablewrap">
              <div className="wood" />{tazze}
              <div className="placard"><strong>{tav.titolo}</strong><small>{seduti.length}/{tav.sedie} sedie occupate</small></div>
              {sedie}
            </div>

            {sonoSeduto ? (
              <>
                <div className="controls">
                  <button className="btn" disabled title="La voce arriverà presto"><Ico n="mic" />Voce (presto)</button>
                  <button className="btn on" onClick={() => { setTab('tavolo'); document.getElementById('in-msg')?.focus(); }}><Ico n="kb" />Scrivi</button>
                  {tav.parola === 'mano' && !creatore && (
                    <button className={`btn ${io.mano_alzata ? 'on' : ''}`} onClick={() => rpc('alza_mano', { v: !io.mano_alzata }, io.mano_alzata ? 'Mano abbassata.' : 'Mano alzata: aspetta che il creatore ti dia la parola.')}>
                      <Ico n="hand" />{io.mano_alzata ? 'Mano alzata' : 'Alza la mano'}
                    </button>
                  )}
                  {!creatore && <button className="btn" onClick={() => rpc('alzati', {})}><Ico n="ear" />Torna al pubblico</button>}
                  {creatore
                    ? <button className="btn danger" onClick={async () => { if (await rpc('chiudi_tavolo', {}, 'Tavolo chiuso.')) router.push('/'); }}><Ico n="exit" />Chiudi tavolo</button>
                    : <button className="btn danger" onClick={() => router.push('/')}><Ico n="exit" />Esci</button>}
                </div>
                <p className="status">
                  {io.silenziato ? 'Il creatore ti ha silenziato.'
                    : puoScrivereTavolo ? 'Sei seduto: scrivi al tavolo nel pannello a destra. La voce arriverà presto.'
                    : 'Si parla su alzata di mano: alza la mano e aspetta il tuo turno.'}
                </p>
              </>
            ) : (
              <>
                <div className="controls">
                  {tav.ingresso === 'libero'
                    ? <button className="btn primary" disabled={pieno} onClick={() => rpc('siediti', {}, 'Ti sei seduto.')}><Ico n="plus" />{pieno ? 'Tavolo pieno' : 'Siediti al tavolo'}</button>
                    : <button className={`btn ${hoChiesto ? 'on' : 'primary'}`} onClick={() => rpc('chiedi_sedia', { attiva: !hoChiesto }, hoChiesto ? 'Richiesta annullata.' : 'Richiesta inviata al creatore.')}>
                        <Ico n="hand" />{hoChiesto ? 'Richiesta inviata' : 'Chiedi di sederti'}
                      </button>}
                  <button className="btn" onClick={() => router.push('/')}><Ico n="exit" />Esci</button>
                </div>
                <p className="status">Sei nel pubblico: leggi il tavolo e scrivi nella chat del pubblico.
                  {tav.ingresso === 'libero' ? ' Quando si libera una sedia, il primo che la tocca si siede.' : ' Il creatore sceglie chi far sedere.'}</p>
              </>
            )}

            {creatore && (
              <div className="mod">
                <h3>Pannello del creatore</h3>
                <div className="switch"><span>Parola</span>
                  <Seg value={tav.parola} onChange={v => rpc('imposta_regole', { p_parola: v, p_ingresso: tav.ingresso })} options={[['libera', 'Libera'], ['mano', 'Alzata di mano']]} />
                </div>
                <div className="switch"><span>Ingresso</span>
                  <Seg value={tav.ingresso} onChange={v => rpc('imposta_regole', { p_parola: tav.parola, p_ingresso: v })} options={[['libero', 'Libero'], ['scelta', 'A scelta']]} />
                </div>
                {tav.parola === 'mano' && (
                  <div><div className="label" style={{ marginBottom: 8 }}>Mani alzate</div>
                    <div className="reqs">{mani.length ? mani.map(p => (
                      <div className="req" key={p.utente_id}><span className="l"><Avatar nick={p.profili?.nickname} url={p.profili?.avatar_url} size={26} />{p.profili?.nickname}</span>
                        <button className="btn sm primary" onClick={() => rpc('modera', { u: p.utente_id, azione: 'parola' })}>Dai la parola</button></div>
                    )) : <span className="hint">Nessuna mano alzata.</span>}</div>
                  </div>
                )}
                {tav.ingresso === 'scelta' && (
                  <div><div className="label" style={{ marginBottom: 8 }}>Chiedono di sedersi</div>
                    <div className="reqs">{richieste.length ? richieste.map(r => (
                      <div className="req" key={r.utente_id}><span className="l"><Avatar nick={nickDi(r.utente_id)} url={cache.current[r.utente_id]?.avatar_url} size={26} />{nickDi(r.utente_id)}</span>
                        <span className="chips">
                          <button className="btn sm primary" disabled={pieno} onClick={() => rpc('gestisci_richiesta', { u: r.utente_id, accetta: true })}>Fai sedere</button>
                          <button className="btn sm" onClick={() => rpc('gestisci_richiesta', { u: r.utente_id, accetta: false })}>No</button>
                        </span></div>
                    )) : <span className="hint">Nessuna richiesta.</span>}</div>
                  </div>
                )}
                <button className="btn sm" disabled={pieno || !pubblico.length} onClick={() => rpc('siedi_a_caso', {})}>Fai sedere qualcuno a caso dal pubblico</button>
                <p className="hint" style={{ margin: 0 }}>Tocca un ospite al tavolo per silenziarlo, rimandarlo tra il pubblico o espellerlo.</p>
              </div>
            )}
          </div>

          <div className="panel">
            <div className="tabs" role="tablist">
              <button role="tab" aria-selected={tab === 'tavolo'} onClick={() => setTab('tavolo')}>Al tavolo</button>
              <button role="tab" aria-selected={tab === 'pubblico'} onClick={() => setTab('pubblico')}>Chat del pubblico</button>
            </div>
            <div className="feed" ref={feedRef}>
              {feed.map(m => <Msg key={m.id} m={m} io={user.id} />)}
              {!feed.length && <p className="hint">{tab === 'tavolo' ? 'Ancora nessun intervento al tavolo.' : 'Ancora nessun messaggio dal pubblico. Rompi il ghiaccio.'}</p>}
            </div>
            {tab === 'tavolo' && !puoScrivereTavolo
              ? <p className="hint" style={{ margin: 0 }}>{sonoSeduto ? (io.silenziato ? 'Sei stato silenziato dal creatore.' : 'Aspetta che il creatore ti dia la parola.') : 'Solo chi è seduto scrive qui. Tu puoi usare la chat del pubblico.'}</p>
              : (
                <form className="composer" onSubmit={invia}>
                  <input id="in-msg" value={testo} onChange={e => setTesto(e.target.value)} maxLength={1000} autoComplete="off"
                    placeholder={tab === 'tavolo' ? 'Scrivi al tavolo…' : 'Scrivi nella chat del pubblico…'} />
                  <button className="btn primary" aria-label="Invia"><Ico n="send" /></button>
                </form>
              )}
            <p className="hint" style={{ margin: 0 }}>{tab === 'tavolo' ? 'Gli interventi di chi è seduto al tavolo.' : 'Visibile a tutti: creatore, ospiti e pubblico.'}</p>
          </div>
        </div>
      </section>

      {pop && (
        <div className="pop" style={{ left: pop.x, top: pop.y }} onClick={e => e.stopPropagation()}>
          <div className="top"><Avatar nick={pop.p.profili?.nickname} url={pop.p.profili?.avatar_url} size={44} />
            <div><b>{pop.p.utente_id === user.id ? 'tu' : pop.p.profili?.nickname}</b><div className="hint">{pop.p.ruolo === 'creatore' ? 'Creatore' : 'Ospite'}</div></div></div>
          <div className="acts">
            <Link className="btn sm" href={`/u/${pop.p.profili?.nickname}`}>Vedi profilo</Link>
            {pop.p.utente_id !== user.id && (
              <button className={`btn sm ${seguo[pop.p.utente_id] ? 'on' : 'primary'}`} disabled={!!seguo[pop.p.utente_id]} onClick={() => segui(pop.p.utente_id)}>
                {seguo[pop.p.utente_id] === 'accettato' ? 'Lo segui già' : seguo[pop.p.utente_id] === 'richiesta' ? 'Richiesta inviata' : 'Segui'}
              </button>
            )}
            {creatore && pop.p.ruolo === 'ospite' && <>
              <div className="label" style={{ marginTop: 6 }}>Da creatore</div>
              {tav.parola === 'mano' && <button className="btn sm" onClick={() => { rpc('modera', { u: pop.p.utente_id, azione: 'parola' }); setPop(null); }}>Dai la parola</button>}
              <button className="btn sm" onClick={() => { rpc('modera', { u: pop.p.utente_id, azione: pop.p.silenziato ? 'riattiva' : 'silenzia' }); setPop(null); }}>{pop.p.silenziato ? 'Riattiva' : 'Silenzia'}</button>
              <button className="btn sm" onClick={() => { rpc('modera', { u: pop.p.utente_id, azione: 'rimanda' }); setPop(null); }}>Rimanda tra il pubblico</button>
              <button className="btn sm danger" onClick={() => { rpc('modera', { u: pop.p.utente_id, azione: 'espelli' }, 'Espulso: non potrà rientrare in questo tavolo.'); setPop(null); }}>Espelli dal tavolo</button>
            </>}
          </div>
        </div>
      )}
    </Shell>
  );
}

function Msg({ m, io }) {
  if (m.canale === 'sistema') return <div className="msg sys"><p>{m.testo}</p></div>;
  const nick = m.profili?.nickname || '…';
  return (
    <div className="msg">
      <Avatar nick={nick} url={m.profili?.avatar_url} />
      <div style={{ minWidth: 0 }}>
        <div className="who">{m.utente_id === io ? 'tu' : <Link href={`/u/${nick}`}>{nick}</Link>}<time>{quando(m.creato_il)}</time></div>
        <p>{m.testo}</p>
      </div>
    </div>
  );
}
