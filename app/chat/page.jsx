'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import Shell from '@/components/Shell';
import { useAuth, useToast } from '@/components/Providers';
import { Avatar, Ico, Caricamento } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { messaggioErrore, quando } from '@/lib/temi';

export default function Chat() {
  const { user } = useAuth();
  const toast = useToast();
  const [amici, setAmici] = useState(null);
  const [ultimi, setUltimi] = useState({});
  const [nonLetti, setNonLetti] = useState({});
  const [sel, setSel] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [testo, setTesto] = useState('');
  const box = useRef(null);
  const selRef = useRef(null);
  selRef.current = sel;

  const caricaAmici = useCallback(async () => {
    const [{ data: a }, { data: b }] = await Promise.all([
      supabase.from('seguiti').select('seguito_id').eq('follower_id', user.id).eq('stato', 'accettato'),
      supabase.from('seguiti').select('follower_id').eq('seguito_id', user.id).eq('stato', 'accettato'),
    ]);
    const mi = new Set((b || []).map(r => r.follower_id));
    const ids = (a || []).map(r => r.seguito_id).filter(x => mi.has(x));
    const { data: prof } = ids.length ? await supabase.from('profili').select('id, nickname, avatar_url').in('id', ids) : { data: [] };
    const { data: ms } = await supabase.from('messaggi_privati').select('mittente_id, destinatario_id, testo, letto, creato_il')
      .or(`mittente_id.eq.${user.id},destinatario_id.eq.${user.id}`).order('id', { ascending: false }).limit(400);
    const u = {}, nl = {};
    (ms || []).forEach(m => {
      const altro = m.mittente_id === user.id ? m.destinatario_id : m.mittente_id;
      if (!u[altro]) u[altro] = m;
      if (m.destinatario_id === user.id && !m.letto) nl[altro] = (nl[altro] || 0) + 1;
    });
    const lista = (prof || []).sort((x, y) => (u[y.id]?.creato_il || '').localeCompare(u[x.id]?.creato_il || ''));
    setUltimi(u); setNonLetti(nl); setAmici(lista);
    return lista;
  }, [user]);

  const apri = useCallback(async (a) => {
    setSel(a);
    const { data } = await supabase.from('messaggi_privati').select('*')
      .or(`and(mittente_id.eq.${user.id},destinatario_id.eq.${a.id}),and(mittente_id.eq.${a.id},destinatario_id.eq.${user.id})`)
      .order('id', { ascending: false }).limit(200);
    setMsgs((data || []).reverse());
    await supabase.from('messaggi_privati').update({ letto: true }).eq('destinatario_id', user.id).eq('mittente_id', a.id).eq('letto', false);
    setNonLetti(n => ({ ...n, [a.id]: 0 }));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    caricaAmici().then(lista => {
      const con = new URLSearchParams(window.location.search).get('con');
      const a = lista.find(x => x.nickname.toLowerCase() === (con || '').toLowerCase());
      if (a) apri(a);
      else if (lista.length && window.innerWidth > 900) apri(lista[0]);
    });
    const ch = supabase.channel('chat-' + user.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messaggi_privati' }, p => {
        const m = p.new; const s = selRef.current;
        if (s && (m.mittente_id === s.id || m.destinatario_id === s.id)) {
          setMsgs(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
          if (m.destinatario_id === user.id) supabase.from('messaggi_privati').update({ letto: true }).eq('id', m.id).then(() => {});
        } else if (m.destinatario_id === user.id) {
          setNonLetti(n => ({ ...n, [m.mittente_id]: (n[m.mittente_id] || 0) + 1 }));
        }
        const altro = m.mittente_id === user.id ? m.destinatario_id : m.mittente_id;
        setUltimi(u => ({ ...u, [altro]: m }));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, caricaAmici, apri]);

  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [msgs]);

  async function invia(e) {
    e.preventDefault();
    const v = testo.trim(); if (!v || !sel) return;
    setTesto('');
    const { data, error } = await supabase.from('messaggi_privati').insert({ mittente_id: user.id, destinatario_id: sel.id, testo: v }).select().single();
    if (error) { toast(messaggioErrore(error)); setTesto(v); return; }
    setMsgs(prev => prev.some(x => x.id === data.id) ? prev : [...prev, data]);
  }

  if (!amici) return <Shell><Caricamento /></Shell>;

  return (
    <Shell>
      <div className="head"><div><h1>Chat</h1><p className="sub">Messaggi privati con gli amici, cioè chi vi seguite a vicenda.</p></div></div>
      {!amici.length ? (
        <div className="empty"><h3>Nessun amico ancora</h3>
          <p className="hint" style={{ margin: 0 }}>Quando tu e un’altra persona vi seguite a vicenda, diventate amici e potete scrivervi qui.</p>
          <Link className="btn primary" href="/persone"><Ico n="search" />Trova persone</Link></div>
      ) : (
        <div className={`chat ${sel ? 'aperta' : ''}`}>
          <div className="convs">
            {amici.map(a => (
              <button key={a.id} className="conv" aria-current={sel?.id === a.id} onClick={() => apri(a)}>
                <Avatar nick={a.nickname} url={a.avatar_url} size={38} />
                <span className="t"><b>{a.nickname}</b><span>{ultimi[a.id] ? (ultimi[a.id].mittente_id === user.id ? 'Tu: ' : '') + ultimi[a.id].testo : 'Nessun messaggio'}</span></span>
                {nonLetti[a.id] > 0 && <span className="dot" />}
              </button>
            ))}
          </div>
          <div className="thread">
            {sel ? <>
              <div className="th">
                <button className="back solomobile" onClick={() => setSel(null)} aria-label="Torna alle conversazioni"><Ico n="back" /></button>
                <Avatar nick={sel.nickname} url={sel.avatar_url} size={32} />
                <Link href={`/u/${sel.nickname}`}><b>{sel.nickname}</b></Link>
              </div>
              <div className="bubbles" ref={box}>
                {msgs.map(m => <div key={m.id} className={`bub ${m.mittente_id === user.id ? 'me' : ''}`}>{m.testo}<small>{quando(m.creato_il)}</small></div>)}
                {!msgs.length && <p className="hint">Scrivi il primo messaggio a {sel.nickname}.</p>}
              </div>
              <form className="composer" onSubmit={invia}>
                <input value={testo} onChange={e => setTesto(e.target.value)} maxLength={2000} placeholder={`Scrivi a ${sel.nickname}…`} autoComplete="off" />
                <button className="btn primary" aria-label="Invia"><Ico n="send" /></button>
              </form>
            </> : <p className="hint" style={{ padding: 16 }}>Scegli una conversazione.</p>}
          </div>
        </div>
      )}
    </Shell>
  );
}
