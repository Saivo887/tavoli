'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import Shell from '@/components/Shell';
import Segnala from '@/components/Segnala';
import Verbale from '@/components/Verbale';
import TavoloOspite from '@/components/TavoloOspite';
import { useAuth, useToast } from '@/components/Providers';
import { Avatar, Ico, Seg, Modale, Caricamento } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useVoce } from '@/lib/voce';
import { TC, dataProgrammata, messaggioErrore, quando } from '@/lib/temi';

const SEL_P = 'utente_id, ruolo, mezzo, mano_alzata, ha_parola, silenziato, presente, seduto_il, cogestore, profili(nickname, avatar_url)';
const SEL_M = 'id, utente_id, canale, testo, creato_il, profili(nickname, avatar_url)';

function posizione(i, n, r = 41) {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return [50 + r * Math.cos(a), 50 + r * Math.sin(a), (a * 180) / Math.PI + 90];
}

async function copia(testo) {
  try { await navigator.clipboard.writeText(testo); return true; } catch { return false; }
}

const REAZIONI = [['👏', 'Applausi'], ['👍', 'D’accordo'], ['👎', 'Non d’accordo'], ['🤔', 'Ci penso'], ['😂', 'Che ridere'], ['❤️', 'Bello']];

function leggiSuoni() { try { return localStorage.getItem('tavoli-suoni') !== 'no'; } catch { return true; } }
function salvaSuoni(v) { try { localStorage.setItem('tavoli-suoni', v ? 'si' : 'no'); } catch {} }
let audioCtx = null;
function suono(tipo) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    const t0 = audioCtx.currentTime;
    o.type = 'sine';
    o.frequency.setValueAtTime(tipo === 'siede' ? 520 : 760, t0);
    o.frequency.exponentialRampToValueAtTime(tipo === 'siede' ? 780 : 980, t0 + 0.12);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.08, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
    o.connect(g).connect(audioCtx.destination);
    o.start(t0); o.stop(t0 + 0.4);
  } catch {}
}

async function condividi(t, toast) {
  const url = `${window.location.origin}/tavolo/${t.id}`;
  const testo = t.stato === 'chiuso' ? `Com’è andata la discussione “${t.titolo}” su Tavoli` : `Vieni al tavolo “${t.titolo}” su Tavoli`;
  if (navigator.share) { try { await navigator.share({ title: t.titolo, text: testo, url }); return; } catch { return; } }
  if (await copia(url)) toast('Link copiato: incollalo dove vuoi.');
  else toast(url);
}

export default function Tavolo() {
  const { id } = useParams();
  const { session } = useAuth();
  if (session === undefined) return <Caricamento />;
  if (!session) return <TavoloOspite id={Number(id)} />;
  return <TavoloMembro />;
}

function TavoloMembro() {
  const { id } = useParams();
  const tid = Number(id);
  const { user, admin } = useAuth();
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
  const [segnala, setSegnala] = useState(null);
  const [invito, setInvito] = useState(null); // { link, amici, invitati }
  const [, setTick] = useState(0);
  const [reazioni, setReazioni] = useState([]);
  const [suoni, setSuoni] = useState(true);
  const [prenotato, setPrenotato] = useState(false);
  const [dati, setDati] = useState({}); // riconoscimenti già dati: { 'uid:tipo': true }
  const feedRef = useRef(null);
  const cache = useRef({});
  const ultimoPubblico = useRef(0);
  const chRef = useRef(null);
  const ultimaReazione = useRef(0);
  const sedutiPrima = useRef(null);
  const suoniRef = useRef(true);
  suoniRef.current = suoni;

  useEffect(() => { setSuoni(leggiSuoni()); }, []);

  const mostraReazione = useCallback((e) => {
    const r = { id: Math.random().toString(36).slice(2), e, x: 15 + Math.random() * 70, d: (Math.random() * 0.6).toFixed(2) };
    setReazioni(prev => [...prev.slice(-24), r]);
    setTimeout(() => setReazioni(prev => prev.filter(x => x.id !== r.id)), 2800);
  }, []);

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
    const mancanti = (data || []).map(r => r.utente_id).filter(u => !cache.current[u]);
    if (mancanti.length) {
      const { data: pr } = await supabase.from('profili').select('id, nickname, avatar_url').in('id', mancanti);
      (pr || []).forEach(p => { cache.current[p.id] = { nickname: p.nickname, avatar_url: p.avatar_url }; });
      setTick(x => x + 1);
    }
  }, [tid]);

  // ingresso (con eventuale link di invito)
  useEffect(() => {
    if (!user || !tid) return;
    let vivo = true;
    (async () => {
      const codice = new URLSearchParams(window.location.search).get('invito');
      if (codice) {
        const { error } = await supabase.rpc('usa_invito', { t: tid, c: codice });
        if (error && vivo) { setErrore(messaggioErrore(error)); setStato('errore'); return; }
      }
      const t = await caricaTavolo();
      if (!vivo) return;
      if (!t) { setErrore('Questo tavolo non esiste o non puoi vederlo.'); setStato('errore'); return; }
      if (t.stato !== 'aperto') {
        if (t.stato === 'programmato') {
          const { data: pr } = await supabase.from('prenotazioni').select('tavolo_id').eq('tavolo_id', tid).eq('utente_id', user.id).maybeSingle();
          if (vivo) setPrenotato(!!pr);
        }
        setStato('dentro'); await caricaMsgs(); return;
      }
      const { error } = await supabase.rpc('entra_tavolo', { t: tid });
      if (!vivo) return;
      if (error) { setErrore(messaggioErrore(error)); setStato('errore'); return; }
      await Promise.all([caricaParts(), caricaMsgs(), caricaRichieste()]);
      if (vivo) setStato('dentro');
    })();
    return () => { vivo = false; };
  }, [user, tid, caricaTavolo, caricaParts, caricaMsgs, caricaRichieste]);

  const aperto = stato === 'dentro' && tav?.stato === 'aperto';

  // tempo reale + presenza
  useEffect(() => {
    if (!aperto) return;
    const ch = supabase.channel(`tavolo-${tid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partecipanti', filter: `tavolo_id=eq.${tid}` }, caricaParts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'richieste_sedia', filter: `tavolo_id=eq.${tid}` }, caricaRichieste)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tavoli', filter: `id=eq.${tid}` }, p => setTav(p.new))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messaggi' }, p => setMsgs(prev => prev.filter(x => x.id !== p.old.id)))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messaggi', filter: `tavolo_id=eq.${tid}` }, async p => {
        const m = p.new;
        if (m.utente_id && !cache.current[m.utente_id]) {
          const { data } = await supabase.from('profili').select('nickname, avatar_url').eq('id', m.utente_id).maybeSingle();
          cache.current[m.utente_id] = data;
        }
        setMsgs(prev => prev.some(x => x.id === m.id) ? prev : [...prev, { ...m, profili: cache.current[m.utente_id] }].slice(-300));
      })
      .on('broadcast', { event: 'reazione' }, ({ payload }) => { if (payload?.e) mostraReazione(payload.e); })
      .subscribe();
    chRef.current = ch;
    const ping = setInterval(() => supabase.rpc('ping', { t: tid }), 25000);
    const tick = setInterval(() => setTick(x => x + 1), 4000);
    const esci = () => { supabase.rpc('esci_tavolo', { t: tid }); };
    window.addEventListener('pagehide', esci);
    return () => {
      chRef.current = null;
      supabase.removeChannel(ch); clearInterval(ping); clearInterval(tick);
      window.removeEventListener('pagehide', esci);
      esci();
    };
  }, [aperto, tid, caricaParts, caricaRichieste, mostraReazione]);

  // suono quando qualcuno si siede
  useEffect(() => {
    const n = parts.filter(p => p.ruolo !== 'pubblico').length;
    if (sedutiPrima.current !== null && n > sedutiPrima.current && suoniRef.current) suono('siede');
    sedutiPrima.current = n;
  }, [parts]);

  function reagisci(e) {
    if (Date.now() - ultimaReazione.current < 700) return;
    ultimaReazione.current = Date.now();
    mostraReazione(e);
    chRef.current?.send({ type: 'broadcast', event: 'reazione', payload: { e } });
  }

  async function riconosci(u, tipo) {
    const { error } = await supabase.rpc('riconosci', { t: tid, u, p_tipo: tipo });
    if (error) { toast(messaggioErrore(error)); return; }
    setDati(d => ({ ...d, [`${u}:${tipo}`]: true }));
    toast(tipo === 'argomento' ? 'Riconoscimento inviato: buon argomento.' : 'Gli hai detto che ti ha fatto cambiare idea.');
  }

  useEffect(() => { const f = feedRef.current; if (f) f.scrollTop = f.scrollHeight; }, [msgs, tab]);

  const io = parts.find(p => p.utente_id === user?.id);
  const creatore = !!tav && !!user && tav.creatore_id === user.id;
  const gestore = creatore || !!io?.cogestore;
  const sonoSeduto = !!io && io.ruolo !== 'pubblico';
  const puoParlare = !!(aperto && sonoSeduto && !io.silenziato && (tav.parola === 'libera' || creatore || io.ha_parola));
  const voce = useVoce({ tavoloId: tid, attivo: aperto && !!io, puoParlare });

  // espulso?
  useEffect(() => {
    if (aperto && parts.length && !io) {
      supabase.from('espulsioni').select('utente_id').eq('tavolo_id', tid).eq('utente_id', user.id).maybeSingle()
        .then(({ data }) => { if (data) { setErrore('Sei stato espulso da questo tavolo.'); setStato('errore'); } });
    }
  }, [parts, io, aperto, tid, user]);

  // il verbale arriva qualche secondo dopo la chiusura
  useEffect(() => {
    if (stato !== 'dentro' || tav?.stato !== 'chiuso' || tav?.verbale) return;
    let n = 0;
    const iv = setInterval(() => { n++; caricaTavolo(); if (n > 8) clearInterval(iv); }, 4000);
    return () => clearInterval(iv);
  }, [stato, tav?.stato, tav?.verbale, caricaTavolo]);

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
    if (canale === 'pubblico' && tav.lenta_secondi > 0 && !gestore) {
      const attesa = Math.ceil(tav.lenta_secondi - (Date.now() - ultimoPubblico.current) / 1000);
      if (attesa > 0) { toast(`Chat lenta: puoi scrivere di nuovo tra ${attesa} secondi.`); return; }
    }
    setTesto('');
    const { error } = await supabase.from('messaggi').insert({ tavolo_id: tid, utente_id: user.id, canale, testo: v });
    if (error) {
      setTesto(v);
      if (String(error.message).includes('row-level')) {
        toast(io?.silenziato ? 'Sei stato silenziato.' : canale === 'pubblico' && tav.lenta_secondi ? 'Chat lenta: aspetta qualche secondo.' : 'Non puoi scrivere qui adesso.');
      } else toast(messaggioErrore(error));
      return;
    }
    if (canale === 'pubblico') ultimoPubblico.current = Date.now();
  }

  async function apriPop(p, el) {
    const r = el.getBoundingClientRect();
    const w = 260;
    const x = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), window.innerWidth - w - 12);
    const y = r.bottom + 8 + 330 > window.innerHeight ? Math.max(12, r.top - 338) : r.bottom + 8;
    setPop({ p, x, y });
    if (p.utente_id !== user.id && seguo[p.utente_id] === undefined) {
      const { data } = await supabase.from('seguiti').select('stato').eq('follower_id', user.id).eq('seguito_id', p.utente_id).maybeSingle();
      setSeguo(s => ({ ...s, [p.utente_id]: data?.stato || null }));
    }
  }

  function apriAutore(m, el) {
    if (!m.utente_id) return;
    const p = parts.find(x => x.utente_id === m.utente_id) || { utente_id: m.utente_id, profili: m.profili, ruolo: 'fuori' };
    apriPop({ ...p, messaggio: m }, el);
  }

  async function segui(uid) {
    const { data, error } = await supabase.rpc('segui', { u: uid });
    if (error) { toast(messaggioErrore(error)); return; }
    setSeguo(s => ({ ...s, [uid]: data }));
    toast(data === 'richiesta' ? 'Richiesta inviata: ha il profilo privato.' : 'Ora lo segui.');
  }

  async function apriInvito() {
    let link = `${window.location.origin}/tavolo/${tid}`;
    if (tav.visibilita === 'privato') {
      const { data, error } = await supabase.rpc('link_invito', { t: tid });
      if (error) { toast(messaggioErrore(error)); return; }
      link += `?invito=${data}`;
    }
    setInvito({ link, amici: null, invitati: new Set() });
    const [{ data: a }, { data: b }] = await Promise.all([
      supabase.from('seguiti').select('seguito_id').eq('follower_id', user.id).eq('stato', 'accettato'),
      supabase.from('seguiti').select('follower_id').eq('seguito_id', user.id).eq('stato', 'accettato'),
    ]);
    const mi = new Set((b || []).map(r => r.follower_id));
    const presenti = new Set(parts.map(p => p.utente_id));
    const ids = (a || []).map(r => r.seguito_id).filter(x => mi.has(x) && !presenti.has(x));
    const { data: prof } = ids.length ? await supabase.from('profili').select('id, nickname, avatar_url').in('id', ids) : { data: [] };
    setInvito(v => v && { ...v, amici: prof || [] });
  }

  async function invitaAmico(u) {
    const { error } = await supabase.rpc('invita', { t: tid, u });
    if (error) { toast(messaggioErrore(error)); return; }
    setInvito(v => v && { ...v, invitati: new Set([...v.invitati, u]) });
  }

  if (stato === 'carico' || !user) return <Shell wide><Caricamento testo="Ti stai sedendo…" /></Shell>;
  if (stato === 'errore') return (
    <Shell wide>
      <div className="empty"><h3>{errore}</h3><Link className="btn primary" href="/">Torna ai tavoli</Link></div>
    </Shell>
  );

  const tc = TC[tav.tema];

  if (tav.stato !== 'aperto') {
    return (
      <Shell wide>
        <section className="scene" data-tema={tav.tema} style={{ '--tc': tc }}>
          <Link className="back" href="/"><Ico n="back" />Tutti i tavoli</Link>
          <div className="head">
            <div>
              <div className="chips"><span className="tag tema">{tav.tema}</span><span className="tag">{tav.stato === 'chiuso' ? 'Concluso' : 'In programma'}</span>{tav.palinsesto_id && <span className="tag">Ogni settimana</span>}</div>
              <h1 style={{ marginTop: 10 }}>{tav.titolo}</h1>
              {tav.stato === 'programmato'
                ? <p className="sub">Si apre {dataProgrammata(tav.inizio_previsto).toLowerCase()}.</p>
                : <p className="sub">Questa discussione è finita. Ecco com’è andata.</p>}
            </div>
            <div className="chips">
              <button className="btn" onClick={() => condividi(tav, toast)}><Ico n="link" />Condividi</button>
              {tav.visibilita === 'pubblico' && <a className="btn" href={`/card/${tav.id}`} target="_blank" rel="noreferrer">Card per le storie</a>}
            </div>
          </div>
          {tav.stato === 'programmato' && (
            <div className="chips">
              {creatore
                ? <button className="btn primary" onClick={async () => { if (await rpc('apri_tavolo', {})) window.location.reload(); }}>Apri il tavolo ora</button>
                : <button className={`btn ${prenotato ? 'on' : 'primary'}`} onClick={async () => {
                    const { error } = await supabase.rpc('prenota', { t: tid, v: !prenotato });
                    if (error) toast(messaggioErrore(error)); else { setPrenotato(!prenotato); toast(prenotato ? 'Avviso tolto.' : 'Ti avviseremo appena il tavolo si apre.'); }
                  }}><Ico n="bell" />{prenotato ? 'Ti avviseremo' : 'Avvisami quando inizia'}</button>}
            </div>
          )}
          {tav.stato === 'chiuso' && (
            <div className="room">
              <div className="panel"><h3 style={{ fontSize: 18, color: '#fff7ee' }}>Verbale</h3><Verbale v={tav.verbale} /></div>
              <div className="panel"><div className="label">Interventi scritti al tavolo</div>
                <div className="feed">{msgs.filter(m => m.canale !== 'pubblico').map(m => <Msg key={m.id} m={m} io={user.id} />)}
                  {!msgs.length && <p className="hint">Nessun messaggio.</p>}</div></div>
            </div>
          )}
        </section>
      </Shell>
    );
  }

  const seduti = parts.filter(p => p.ruolo !== 'pubblico')
    .sort((a, b) => (a.ruolo === 'creatore' ? -1 : b.ruolo === 'creatore' ? 1 : new Date(a.seduto_il) - new Date(b.seduto_il)));
  const pubblico = parts.filter(p => p.ruolo === 'pubblico');
  const pieno = seduti.length >= tav.sedie;
  const hoChiesto = richieste.some(r => r.utente_id === user.id);
  const mani = seduti.filter(p => p.mano_alzata);
  const ultimiTavolo = msgs.filter(m => m.canale === 'tavolo');
  const ultimo = ultimiTavolo[ultimiTavolo.length - 1];
  const parla = new Set(voce.parlanti);
  if (ultimo && Date.now() - new Date(ultimo.creato_il).getTime() < 12000) parla.add(ultimo.utente_id);
  const puoScrivereTavolo = puoParlare;
  const nickDi = uid => cache.current[uid]?.nickname || '…';
  const puoInvitare = tav.visibilita === 'pubblico' || gestore;

  async function sediaVuota() {
    if (sonoSeduto) { toast('Sei già seduto al tavolo.'); return; }
    if (tav.ingresso === 'libero' || creatore) await rpc('siediti', {}, 'Ti sei seduto.');
    else await rpc('chiedi_sedia', { attiva: !hoChiesto }, hoChiesto ? 'Richiesta annullata.' : 'Richiesta inviata.');
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
      <button key={p.utente_id} className={`seat ${parla.has(p.utente_id) && !p.silenziato ? 'parla' : ''}`} style={{ left: `${x}%`, top: `${y}%` }}
        onClick={e => { e.stopPropagation(); apriPop(p, e.currentTarget); }} aria-label={p.profili?.nickname}>
        {sedia}<Avatar nick={p.profili?.nickname} url={p.profili?.avatar_url} />
        {p.ruolo === 'creatore' ? <span className="crown">CREATORE</span> : p.cogestore ? <span className="crown gest">GESTORE</span> : null}
        {icona}
        <span className="nm">{p.utente_id === user.id ? 'tu' : p.profili?.nickname}</span>
      </button>
    );
  });
  const tazze = seduti.map((p, i) => { const [x, y] = posizione(i, tav.sedie, 25); return <span key={'c' + p.utente_id} className="cup" style={{ left: `${x}%`, top: `${y}%` }} />; });

  const feed = tab === 'tavolo' ? msgs.filter(m => m.canale !== 'pubblico') : msgs.filter(m => m.canale === 'pubblico');

  // stato voce
  let pulsanteVoce = null;
  if (sonoSeduto) {
    if (voce.stato === 'connesso' && puoParlare) {
      pulsanteVoce = <button className={`btn ${voce.micOn ? 'on' : 'primary'}`} onClick={async () => { if (!(await voce.cambiaMic())) toast('Non riesco ad accedere al microfono: controlla i permessi del browser.'); }}>
        <Ico n={voce.micOn ? 'mic' : 'micoff'} />{voce.micOn ? 'Microfono acceso' : 'Accendi il microfono'}</button>;
    } else if (voce.stato === 'connesso') {
      pulsanteVoce = <button className="btn" disabled><Ico n="micoff" />{io.silenziato ? 'Silenziato' : 'Aspetta la parola'}</button>;
    } else if (voce.stato === 'collego') {
      pulsanteVoce = <button className="btn" disabled><Ico n="mic" />Collego l’audio…</button>;
    } else {
      pulsanteVoce = <button className="btn" disabled title="La voce non è ancora attiva su questo sito"><Ico n="mic" />Voce non attiva</button>;
    }
  }

  let statoTesto;
  if (sonoSeduto) {
    if (io.silenziato) statoTesto = 'Chi gestisce il tavolo ti ha silenziato.';
    else if (!puoParlare) statoTesto = 'Si parla su alzata di mano: alza la mano e aspetta il tuo turno.';
    else if (voce.stato === 'connesso') statoTesto = voce.micOn ? 'Ti stanno ascoltando. Puoi anche scrivere nel pannello a destra.' : 'Accendi il microfono per parlare, oppure scrivi nel pannello a destra.';
    else statoTesto = 'Scrivi al tavolo nel pannello a destra.';
  } else {
    statoTesto = `Sei nel pubblico: ${voce.stato === 'connesso' ? 'ascolti il tavolo' : 'leggi il tavolo'} e scrivi nella chat del pubblico.`
      + (tav.ingresso === 'libero' ? ' Quando si libera una sedia, il primo che la tocca si siede.' : ' Chi gestisce il tavolo sceglie chi far sedere.');
  }

  const pp = pop?.p;
  const ppMe = pp && pp.utente_id === user.id;
  const ppCreatore = pp && pp.utente_id === tav.creatore_id;
  const ppModerabile = pp && gestore && !ppMe && !ppCreatore && pp.ruolo !== 'fuori' && (creatore || !pp.cogestore);

  return (
    <Shell wide>
      <section className="scene" data-tema={tav.tema} style={{ '--tc': tc }} onClick={() => setPop(null)}>
        <Link className="back" href="/"><Ico n="back" />Tutti i tavoli</Link>
        <div className="head">
          <div>
            <div className="chips">
              <span className="tag tema">{tav.tema}</span><span className="tag live">In corso</span>
              <span className="tag">{tav.parola === 'mano' ? 'Alzata di mano' : 'Parola libera'}</span>
              <span className="tag">{tav.ingresso === 'libero' ? 'Ingresso libero' : 'Ingresso a scelta'}</span>
              {tav.visibilita === 'privato' && <span className="tag"><Ico n="lock" />Privato</span>}
              {tav.lenta_secondi > 0 && <span className="tag">Chat lenta {tav.lenta_secondi}s</span>}
              {voce.stato === 'connesso' && <span className="tag"><Ico n="volume" />Audio attivo</span>}
            </div>
            <h1 style={{ marginTop: 10 }}>{tav.titolo}</h1>
            <p className="sub">Creato da {creatore ? 'te' : <Link href={`/u/${nickDi(tav.creatore_id)}`} style={{ textDecoration: 'underline' }}>{nickDi(tav.creatore_id)}</Link>} · <b style={{ fontFamily: 'var(--f-mono)', fontWeight: 500 }}>{pubblico.length}</b> nel pubblico</p>
          </div>
          <div className="chips">
            {voce.audioBloccato && <button className="btn primary" onClick={voce.attivaAudio}><Ico n="volume" />Attiva l’audio</button>}
            {puoInvitare && <button className="btn" onClick={apriInvito}><Ico n="link" />Invita</button>}
            {tav.visibilita === 'pubblico' && <button className="btn" onClick={() => condividi(tav, toast)}>Condividi</button>}
            <button className="btn" aria-pressed={suoni} onClick={() => { const v = !suoni; setSuoni(v); salvaSuoni(v); if (v) suono('siede'); }}>{suoni ? 'Suoni sì' : 'Suoni no'}</button>
            {admin && <button className="btn" onClick={async () => {
              const { error } = await supabase.rpc('admin_evidenza', { t: tid, v: !tav.in_evidenza });
              if (error) toast(messaggioErrore(error)); else { toast(tav.in_evidenza ? 'Tolto dall’evidenza.' : 'Ora è il tavolo del giorno.'); caricaTavolo(); }
            }}>{tav.in_evidenza ? 'Togli dall’evidenza' : 'Tavolo del giorno'}</button>}
            {!creatore && <button className="btn" onClick={() => setSegnala({ tavolo: tid, descrizione: 'questo tavolo' })}><Ico n="flag" />Segnala</button>}
          </div>
        </div>

        <div className="room">
          <div className="panel stage">
            <div className="tablewrap">
              <div className="wood" />{tazze}
              <div className="placard"><strong>{tav.titolo}</strong><small>{seduti.length}/{tav.sedie} sedie occupate</small></div>
              {sedie}
              <div className="reazioni-volo" aria-hidden="true">
                {reazioni.map(r => <span key={r.id} style={{ left: `${r.x}%`, animationDelay: `${r.d}s` }}>{r.e}</span>)}
              </div>
            </div>

            <div className="reazioni-barra" role="group" aria-label="Reagisci">
              {REAZIONI.map(([e, l]) => <button key={e} onClick={e2 => { e2.stopPropagation(); reagisci(e); }} title={l} aria-label={l}>{e}</button>)}
            </div>

            <div className="controls">
              {sonoSeduto ? (
                <>
                  {pulsanteVoce}
                  <button className="btn" onClick={() => { setTab('tavolo'); setTimeout(() => document.getElementById('in-msg')?.focus(), 0); }}><Ico n="kb" />Scrivi</button>
                  {tav.parola === 'mano' && !creatore && (
                    <button className={`btn ${io.mano_alzata ? 'on' : ''}`} onClick={() => rpc('alza_mano', { v: !io.mano_alzata }, io.mano_alzata ? 'Mano abbassata.' : 'Mano alzata: aspetta il tuo turno.')}>
                      <Ico n="hand" />{io.mano_alzata ? 'Mano alzata' : 'Alza la mano'}
                    </button>
                  )}
                  {!creatore && <button className="btn" onClick={() => rpc('alzati', {})}><Ico n="ear" />Torna al pubblico</button>}
                  {creatore
                    ? <button className="btn danger" onClick={async () => { if (await rpc('chiudi_tavolo', {}, 'Tavolo chiuso.')) router.push('/'); }}><Ico n="exit" />Chiudi tavolo</button>
                    : <button className="btn danger" onClick={() => router.push('/')}><Ico n="exit" />Esci</button>}
                </>
              ) : (
                <>
                  {tav.ingresso === 'libero'
                    ? <button className="btn primary" disabled={pieno} onClick={() => rpc('siediti', {}, 'Ti sei seduto.')}><Ico n="plus" />{pieno ? 'Tavolo pieno' : 'Siediti al tavolo'}</button>
                    : <button className={`btn ${hoChiesto ? 'on' : 'primary'}`} onClick={() => rpc('chiedi_sedia', { attiva: !hoChiesto }, hoChiesto ? 'Richiesta annullata.' : 'Richiesta inviata.')}>
                        <Ico n="hand" />{hoChiesto ? 'Richiesta inviata' : 'Chiedi di sederti'}
                      </button>}
                  <button className="btn" onClick={() => router.push('/')}><Ico n="exit" />Esci</button>
                </>
              )}
            </div>
            <p className="status">{statoTesto}</p>

            {gestore && (
              <div className="mod">
                <h3>{creatore ? 'Pannello del creatore' : 'Gestione del tavolo'}</h3>
                <div className="switch"><span>Parola</span>
                  <Seg value={tav.parola} onChange={v => rpc('imposta_regole', { p_parola: v, p_ingresso: tav.ingresso })} options={[['libera', 'Libera'], ['mano', 'Alzata di mano']]} />
                </div>
                <div className="switch"><span>Ingresso</span>
                  <Seg value={tav.ingresso} onChange={v => rpc('imposta_regole', { p_parola: tav.parola, p_ingresso: v })} options={[['libero', 'Libero'], ['scelta', 'A scelta']]} />
                </div>
                <div className="switch"><span>Chat del pubblico</span>
                  <Seg value={String(tav.lenta_secondi)} onChange={v => rpc('imposta_opzioni', { p_lenta: Number(v), p_inattivi: tav.inattivi_minuti })}
                    options={[['0', 'Libera'], ['10', '10 s'], ['30', '30 s'], ['60', '1 min']]} />
                </div>
                <div className="switch"><span>Libera la sedia di chi tace</span>
                  <Seg value={tav.inattivi_minuti ? String(tav.inattivi_minuti) : 'no'} onChange={v => rpc('imposta_opzioni', { p_lenta: tav.lenta_secondi, p_inattivi: v === 'no' ? null : Number(v) })}
                    options={[['no', 'Mai'], ['5', '5 min'], ['10', '10 min'], ['15', '15 min']]} />
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
                <div>
                  <div className="label" style={{ marginBottom: 8 }}>Pubblico ({pubblico.length})</div>
                  <div className="pubblico">{pubblico.length ? pubblico.map(p => (
                    <button key={p.utente_id} className="pchip" onClick={e => { e.stopPropagation(); apriPop(p, e.currentTarget); }}>
                      <Avatar nick={p.profili?.nickname} url={p.profili?.avatar_url} size={22} />{p.profili?.nickname}{p.silenziato && <Ico n="micoff" />}{p.cogestore && <Ico n="shield" />}
                    </button>
                  )) : <span className="hint">Nessuno nel pubblico.</span>}</div>
                </div>
                <p className="hint" style={{ margin: 0 }}>Tocca una persona al tavolo, nel pubblico o accanto a un messaggio per silenziarla, rimandarla tra il pubblico o espellerla.{creatore ? ' Puoi anche nominare fino a 3 co-gestori.' : ''}</p>
              </div>
            )}
          </div>

          <div className="panel">
            <div className="tabs" role="tablist">
              <button role="tab" aria-selected={tab === 'tavolo'} onClick={() => setTab('tavolo')}>Al tavolo</button>
              <button role="tab" aria-selected={tab === 'pubblico'} onClick={() => setTab('pubblico')}>Chat del pubblico</button>
            </div>
            <div className="feed" ref={feedRef}>
              {feed.map(m => <Msg key={m.id} m={m} io={user.id} onAutore={(e) => { e.stopPropagation(); apriAutore(m, e.currentTarget); }} />)}
              {!feed.length && <p className="hint">{tab === 'tavolo' ? 'Ancora nessun intervento scritto al tavolo.' : 'Ancora nessun messaggio dal pubblico. Rompi il ghiaccio.'}</p>}
            </div>
            {tab === 'tavolo' && !puoScrivereTavolo
              ? <p className="hint" style={{ margin: 0 }}>{sonoSeduto ? (io.silenziato ? 'Sei stato silenziato.' : 'Aspetta che ti diano la parola.') : 'Solo chi è seduto scrive qui. Tu puoi usare la chat del pubblico.'}</p>
              : (
                <form className="composer" onSubmit={invia}>
                  <input id="in-msg" value={testo} onChange={e => setTesto(e.target.value)} maxLength={1000} autoComplete="off"
                    placeholder={tab === 'tavolo' ? 'Scrivi al tavolo…' : 'Scrivi nella chat del pubblico…'} />
                  <button className="btn primary" aria-label="Invia"><Ico n="send" /></button>
                </form>
              )}
            <p className="hint" style={{ margin: 0 }}>{tab === 'tavolo' ? 'Gli interventi scritti di chi è seduto al tavolo.' : 'Visibile a tutti: chi è seduto e il pubblico.'}</p>
          </div>
        </div>
      </section>

      {pop && (
        <div className="pop" style={{ left: pop.x, top: pop.y }} onClick={e => e.stopPropagation()}>
          <div className="top"><Avatar nick={pp.profili?.nickname} url={pp.profili?.avatar_url} size={44} />
            <div><b>{ppMe ? 'tu' : pp.profili?.nickname}</b>
              <div className="hint">{ppCreatore ? 'Creatore' : pp.cogestore ? 'Co-gestore' : pp.ruolo === 'ospite' ? 'Al tavolo' : pp.ruolo === 'pubblico' ? 'Nel pubblico' : 'Non più presente'}</div></div></div>
          <div className="acts">
            <Link className="btn sm" href={`/u/${pp.profili?.nickname}`}>Vedi profilo</Link>
            {!ppMe && (
              <button className={`btn sm ${seguo[pp.utente_id] ? 'on' : 'primary'}`} disabled={!!seguo[pp.utente_id]} onClick={() => segui(pp.utente_id)}>
                {seguo[pp.utente_id] === 'accettato' ? 'Lo segui già' : seguo[pp.utente_id] === 'richiesta' ? 'Richiesta inviata' : 'Segui'}
              </button>
            )}
            {!ppMe && pp.ruolo !== 'fuori' && <>
              <div className="label" style={{ marginTop: 6 }}>Riconoscimento</div>
              <button className="btn sm" disabled={dati[`${pp.utente_id}:argomento`]} onClick={() => riconosci(pp.utente_id, 'argomento')}>{dati[`${pp.utente_id}:argomento`] ? 'Buon argomento: inviato' : 'Buon argomento'}</button>
              <button className="btn sm" disabled={dati[`${pp.utente_id}:cambiare_idea`]} onClick={() => riconosci(pp.utente_id, 'cambiare_idea')}>{dati[`${pp.utente_id}:cambiare_idea`] ? 'Inviato' : 'Mi hai fatto cambiare idea'}</button>
            </>}
            {ppModerabile && <>
              <div className="label" style={{ marginTop: 6 }}>Gestione</div>
              {tav.parola === 'mano' && pp.ruolo === 'ospite' && <button className="btn sm" onClick={() => { rpc('modera', { u: pp.utente_id, azione: 'parola' }); setPop(null); }}>Dai la parola</button>}
              <button className="btn sm" onClick={() => { rpc('modera', { u: pp.utente_id, azione: pp.silenziato ? 'riattiva' : 'silenzia' }); setPop(null); }}>{pp.silenziato ? 'Riattiva' : 'Silenzia'}</button>
              {pp.ruolo === 'ospite' && <button className="btn sm" onClick={() => { rpc('modera', { u: pp.utente_id, azione: 'rimanda' }); setPop(null); }}>Rimanda tra il pubblico</button>}
              {creatore && <button className="btn sm" onClick={() => { rpc('modera', { u: pp.utente_id, azione: pp.cogestore ? 'cogestore_no' : 'cogestore_si' }, pp.cogestore ? 'Non è più co-gestore.' : 'Ora è co-gestore del tavolo.'); setPop(null); }}>
                <Ico n="shield" />{pp.cogestore ? 'Togli co-gestore' : 'Nomina co-gestore'}</button>}
              <button className="btn sm danger" onClick={() => { rpc('modera', { u: pp.utente_id, azione: 'espelli' }, 'Espulso: non potrà rientrare in questo tavolo.'); setPop(null); }}>Espelli dal tavolo</button>
            </>}
            {!ppMe && (
              <button className="btn sm" onClick={() => {
                setSegnala(pp.messaggio
                  ? { messaggio: pp.messaggio.id, utente: pp.utente_id, tavolo: tid, descrizione: 'questo messaggio' }
                  : { utente: pp.utente_id, tavolo: tid, descrizione: pp.profili?.nickname || 'utente' });
                setPop(null);
              }}><Ico n="flag" />{pp.messaggio ? 'Segnala il messaggio' : 'Segnala'}</button>
            )}
          </div>
        </div>
      )}

      {segnala && <Segnala cosa={segnala} onClose={() => setSegnala(null)} />}

      {invito && (
        <Modale titolo="Invita al tavolo" onClose={() => setInvito(null)}>
          <div className="stackform">
            <div className="field">
              <span className="lb">{tav.visibilita === 'privato' ? 'Link di invito (chi lo apre può entrare)' : 'Link del tavolo'}</span>
              <div className="composer">
                <input readOnly value={invito.link} onFocus={e => e.target.select()} id="link-invito" />
                <button type="button" className="btn primary" onClick={async () => {
                  if (await copia(invito.link)) toast('Link copiato.');
                  else { document.getElementById('link-invito')?.select(); toast('Seleziona il link e copialo.'); }
                }}>Copia</button>
              </div>
            </div>
            <div>
              <div className="label" style={{ marginBottom: 6 }}>Invita i tuoi amici</div>
              {invito.amici === null ? <p className="hint">Caricamento…</p> : invito.amici.length ? (
                <div className="list">{invito.amici.map(a => (
                  <div className="prow" key={a.id}>
                    <span className="l"><Avatar nick={a.nickname} url={a.avatar_url} size={30} /><b>{a.nickname}</b></span>
                    <button className={`btn sm ${invito.invitati.has(a.id) ? 'on' : 'primary'}`} disabled={invito.invitati.has(a.id)} onClick={() => invitaAmico(a.id)}>
                      {invito.invitati.has(a.id) ? 'Invitato' : 'Invita'}</button>
                  </div>
                ))}</div>
              ) : <p className="hint">Nessun amico da invitare. Gli amici sono le persone che vi seguite a vicenda.</p>}
            </div>
          </div>
        </Modale>
      )}
    </Shell>
  );
}

function Msg({ m, io, onAutore }) {
  if (m.canale === 'sistema') return <div className="msg sys"><p>{m.testo}</p></div>;
  const nick = m.profili?.nickname || '…';
  const mio = m.utente_id === io;
  return (
    <div className="msg">
      {onAutore && !mio ? <button className="autore" onClick={onAutore} aria-label={`Opzioni per ${nick}`}><Avatar nick={nick} url={m.profili?.avatar_url} /></button>
        : <Avatar nick={nick} url={m.profili?.avatar_url} />}
      <div style={{ minWidth: 0 }}>
        <div className="who">{mio ? 'tu' : onAutore ? <button className="autore nome" onClick={onAutore}>{nick}</button> : <Link href={`/u/${nick}`}>{nick}</Link>}<time>{quando(m.creato_il)}</time></div>
        <p>{m.testo}</p>
      </div>
    </div>
  );
}
