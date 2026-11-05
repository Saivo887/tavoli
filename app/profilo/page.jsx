'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import Statistiche from '@/components/Statistiche';
import NotificheTelefono from '@/components/NotificheTelefono';
import { useRouter } from 'next/navigation';
import { useAuth, useToast } from '@/components/Providers';
import { Avatar, Ico, Seg, Caricamento } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { TC, TEMI, messaggioErrore } from '@/lib/temi';

export default function Profilo() {
  const { user, profilo, ricaricaProfilo, admin } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [elimina, setElimina] = useState(false);
  const [conferma, setConferma] = useState('');
  const [eliminando, setEliminando] = useState(false);
  const [f, setF] = useState(null);
  const [stat, setStat] = useState(null);
  const [amici, setAmici] = useState([]);
  const [errore, setErrore] = useState('');
  const [salva, setSalva] = useState(false);
  const [carico, setCarico] = useState(false);
  const [appuntamenti, setAppuntamenti] = useState([]);

  useEffect(() => {
    if (!user || !profilo || f) return;
    supabase.from('profili_privati').select('nome_vero').eq('id', user.id).maybeSingle().then(({ data }) => {
      setF({ nickname: profilo.nickname, nome: data?.nome_vero || '', bio: profilo.bio || '', interessi: profilo.interessi || [], privato: profilo.privato,
        frase: profilo.frase || '', copertina: profilo.copertina || '' });
    });
  }, [user, profilo, f]);

  useEffect(() => {
    if (!user) return;
    supabase.rpc('statistiche', { u: user.id }).then(({ data }) => setStat(data));
    supabase.from('palinsesto').select('*').eq('creatore_id', user.id).eq('attivo', true).order('giorno').then(({ data }) => setAppuntamenti(data || []));
    (async () => {
      const [{ data: a }, { data: b }] = await Promise.all([
        supabase.from('seguiti').select('seguito_id').eq('follower_id', user.id).eq('stato', 'accettato'),
        supabase.from('seguiti').select('follower_id').eq('seguito_id', user.id).eq('stato', 'accettato'),
      ]);
      const mi = new Set((b || []).map(r => r.follower_id));
      const ids = (a || []).map(r => r.seguito_id).filter(x => mi.has(x));
      if (!ids.length) { setAmici([]); return; }
      const { data } = await supabase.from('profili').select('id, nickname, avatar_url').in('id', ids);
      setAmici(data || []);
    })();
  }, [user]);

  async function salvaProfilo(e) {
    e.preventDefault();
    setErrore('');
    const nick = f.nickname.trim();
    if (!/^[A-Za-z0-9._]{3,24}$/.test(nick)) { setErrore('Il nickname deve avere 3-24 caratteri: lettere, numeri, punto o trattino basso.'); return; }
    setSalva(true);
    const { error } = await supabase.from('profili').update({ nickname: nick, bio: f.bio.trim(), interessi: f.interessi, privato: f.privato, frase: f.frase.trim() || null, copertina: f.copertina || null }).eq('id', user.id);
    if (!error) {
      const { error: e2 } = await supabase.from('profili_privati').update({ nome_vero: f.nome.trim() || null }).eq('id', user.id);
      if (e2) setErrore(messaggioErrore(e2));
    } else setErrore(messaggioErrore(error));
    setSalva(false);
    if (!error) { toast('Profilo salvato.'); ricaricaProfilo(); }
  }

  async function caricaFoto(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast('Usa una foto JPG, PNG o WEBP.'); return; }
    if (file.size > 2 * 1024 * 1024) { toast('La foto deve pesare meno di 2 MB.'); return; }
    setCarico(true);
    const ext = file.type.split('/')[1];
    const path = `${user.id}/foto-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('avatar').upload(path, file, { upsert: true, contentType: file.type });
    if (error) { toast(messaggioErrore(error)); setCarico(false); return; }
    const { data } = supabase.storage.from('avatar').getPublicUrl(path);
    await supabase.from('profili').update({ avatar_url: data.publicUrl }).eq('id', user.id);
    setCarico(false);
    toast('Foto aggiornata.');
    ricaricaProfilo();
  }

  async function eliminaAccount() {
    setEliminando(true);
    try {
      const { data: files } = await supabase.storage.from('avatar').list(user.id, { limit: 100 });
      if (files?.length) await supabase.storage.from('avatar').remove(files.map(x => `${user.id}/${x.name}`));
      const { error } = await supabase.rpc('elimina_account');
      if (error) throw error;
      await supabase.auth.signOut();
      router.replace('/accedi?eliminato=1');
    } catch (err) {
      toast(messaggioErrore(err));
      setEliminando(false);
    }
  }

  if (!profilo || !f) return <Shell><Caricamento /></Shell>;

  return (
    <Shell>
      <div className="head"><div><h1>Il tuo profilo</h1><p className="sub">Così ti vedono gli altri.</p></div>
        <Link className="btn" href={`/u/${profilo.nickname}`}>Vedi come lo vedono gli altri</Link></div>
      <div className="prof">
        <div className="panel con-copertina">
          <div className="copertina" style={{ '--tc': TC[profilo.copertina || profilo.interessi?.[0] || 'Altro'] }} />
          <div className="idcard">
            <Avatar nick={profilo.nickname} url={profilo.avatar_url} />
            <div>
              <h2 style={{ fontSize: 24 }}>@{profilo.nickname}</h2>
              <div className="hint">{f.nome ? `${f.nome} · visibile solo ai follower` : 'Nome vero non inserito'}</div>
              <div className="chips" style={{ marginTop: 8 }}>{profilo.privato ? <span className="tag"><Ico n="lock" />Profilo privato</span> : <span className="tag">Profilo aperto</span>}</div>
            </div>
          </div>
          {profilo.frase && <p className="frase">“{profilo.frase}”</p>}
          {profilo.bio && <p style={{ margin: 0 }}>{profilo.bio}</p>}
          {profilo.interessi?.length > 0 && <div className="chips">{profilo.interessi.map(i => <span key={i} className="tag tema" style={{ '--tc': TC[i] }}>{i}</span>)}</div>}
          <Statistiche s={stat} />
        </div>

        <form className="panel" onSubmit={salvaProfilo}>
          <h3 style={{ fontSize: 18 }}>Modifica profilo</h3>
          <div className="field">
            <span className="lb">Foto profilo</span>
            <label className="btn" style={{ alignSelf: 'flex-start' }}>
              {carico ? 'Caricamento…' : 'Scegli una foto'}
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={caricaFoto} disabled={carico} />
            </label>
          </div>
          <div className="field"><label htmlFor="p-nick">Nickname</label>
            <input id="p-nick" value={f.nickname} maxLength={24} onChange={e => setF({ ...f, nickname: e.target.value })} />
            <span className="hint">Univoco. È il nome che compare ai tavoli.</span></div>
          <div className="field"><label htmlFor="p-nome">Nome vero (facoltativo)</label>
            <input id="p-nome" value={f.nome} maxLength={60} placeholder="Lascia vuoto se non vuoi mostrarlo" onChange={e => setF({ ...f, nome: e.target.value })} />
            <span className="hint">Lo vedono solo i tuoi follower.</span></div>
          <div className="field"><label htmlFor="p-frase">Su cosa mi piace discutere</label>
            <input id="p-frase" value={f.frase} maxLength={120} placeholder="Es. Di scuola, di libri e di tutto quello che si può migliorare" onChange={e => setF({ ...f, frase: e.target.value })} />
            <span className="hint">Compare in grande sul tuo profilo e quando ti suggeriamo ad altri.</span></div>
          <div className="field"><span className="lb">Colore della copertina</span>
            <div className="chips">{TEMI.map(t => (
              <button type="button" key={t} className="chip" style={{ '--tc': TC[t] }} aria-pressed={f.copertina === t} onClick={() => setF({ ...f, copertina: t })}><i />{t}</button>
            ))}</div></div>
          <div className="field"><label htmlFor="p-bio">Bio</label>
            <textarea id="p-bio" rows={2} maxLength={160} value={f.bio} onChange={e => setF({ ...f, bio: e.target.value })} /></div>
          <div className="field"><span className="lb">Tipo di profilo</span>
            <Seg value={f.privato ? 'p' : 'a'} onChange={v => setF({ ...f, privato: v === 'p' })} options={[['a', 'Aperto'], ['p', 'Privato']]} />
            <span className="hint">{f.privato ? 'Ogni richiesta di segui va accettata. Statistiche, tavoli e nome vero li vedono solo i follower approvati.' : 'Chiunque può seguirti subito.'}</span></div>
          <div className="field"><span className="lb">Interessi</span>
            <div className="chips">{TEMI.map(t => (
              <button type="button" key={t} className="chip" style={{ '--tc': TC[t] }} aria-pressed={f.interessi.includes(t)}
                onClick={() => setF({ ...f, interessi: f.interessi.includes(t) ? f.interessi.filter(x => x !== t) : [...f.interessi, t] })}><i />{t}</button>
            ))}</div></div>
          {errore && <p className="err" role="alert">{errore}</p>}
          <button className="btn primary" style={{ alignSelf: 'flex-start' }} disabled={salva}>{salva ? 'Salvataggio…' : 'Salva'}</button>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Amici (vi seguite a vicenda)</div>
            <div className="list">
              {amici.map(a => (
                <div className="prow" key={a.id}>
                  <Link className="l" href={`/u/${a.nickname}`}><Avatar nick={a.nickname} url={a.avatar_url} size={30} /><b>{a.nickname}</b></Link>
                  <Link className="btn sm" href={`/chat?con=${a.nickname}`}><Ico n="chat" />Scrivi</Link>
                </div>
              ))}
              {!amici.length && <p className="hint">Quando tu e un’altra persona vi seguite a vicenda, diventate amici e potete scrivervi in chat.</p>}
            </div>
          </div>
        </form>
      </div>

      <div className="prof">
        <div className="panel">
          <h3 style={{ fontSize: 18 }}>Impostazioni</h3>
          <NotificheTelefono />
          {appuntamenti.length > 0 && (
            <div className="field">
              <span className="lb">I tuoi appuntamenti fissi</span>
              <div className="list">{appuntamenti.map(a => (
                <div className="prow" key={a.id}>
                  <span><b>{a.titolo}</b><span className="hint" style={{ display: 'block' }}>Ogni {['', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'][a.giorno]} alle {String(a.ora).slice(0, 5)} · {a.tema}</span></span>
                  <button type="button" className="btn sm danger" onClick={async () => {
                    const { error } = await supabase.from('palinsesto').update({ attivo: false }).eq('id', a.id);
                    if (error) toast(messaggioErrore(error)); else { setAppuntamenti(x => x.filter(y => y.id !== a.id)); toast('Appuntamento fermato: i prossimi non verranno più creati.'); }
                  }}>Ferma</button>
                </div>
              ))}</div>
            </div>
          )}
          {admin && <Link className="btn" style={{ alignSelf: 'flex-start' }} href="/admin"><Ico n="flag" />Segnalazioni da gestire</Link>}
          <p className="legali" style={{ textAlign: 'left' }}><Link href="/regole">Regole della casa</Link> · <Link href="/termini">Termini d’uso</Link> · <Link href="/privacy">Privacy</Link> · <Link href="/cookie">Cookie</Link></p>
          <button className="btn solomobile" style={{ alignSelf: 'flex-start' }} onClick={async () => { await supabase.auth.signOut(); router.replace('/accedi'); }}><Ico n="out" />Esci</button>
        </div>
        <div className="panel zona-rischio">
          <h3 style={{ fontSize: 18 }}>Elimina l’account</h3>
          <p className="hint" style={{ margin: 0 }}>Cancelliamo profilo, foto, messaggi, tavoli che hai creato, chat private e persone seguite. Non si può tornare indietro.</p>
          {!elimina ? (
            <button className="btn danger" style={{ alignSelf: 'flex-start' }} onClick={() => setElimina(true)}>Elimina il mio account</button>
          ) : (
            <>
              <div className="field">
                <label htmlFor="conf-el">Per confermare scrivi ELIMINA</label>
                <input id="conf-el" value={conferma} onChange={e => setConferma(e.target.value)} autoComplete="off" />
              </div>
              <div className="chips">
                <button className="btn danger" disabled={conferma.trim().toUpperCase() !== 'ELIMINA' || eliminando} onClick={eliminaAccount}>{eliminando ? 'Eliminazione…' : 'Elimina definitivamente'}</button>
                <button className="btn" onClick={() => { setElimina(false); setConferma(''); }}>Annulla</button>
              </div>
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}
