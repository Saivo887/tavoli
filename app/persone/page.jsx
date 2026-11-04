'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { useAuth } from '@/components/Providers';
import { Avatar, Ico } from '@/components/ui';
import { supabase } from '@/lib/supabase';

export default function Persone() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [ris, setRis] = useState([]);
  const [nuovi, setNuovi] = useState([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('profili').select('id, nickname, avatar_url, bio, privato').neq('id', user.id).order('creato_il', { ascending: false }).limit(12)
      .then(({ data }) => setNuovi(data || []));
  }, [user]);

  useEffect(() => {
    const v = q.trim().replace(/[%_,()]/g, '');
    if (v.length < 2) { setRis([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('profili').select('id, nickname, avatar_url, bio, privato').ilike('nickname', `%${v}%`).limit(20);
      setRis(data || []);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const lista = q.trim().length >= 2 ? ris : nuovi;
  return (
    <Shell>
      <div className="head"><div><h1>Persone</h1><p className="sub">Cerca qualcuno per nickname e seguilo.</p></div></div>
      <div className="field" style={{ maxWidth: 520 }}>
        <label htmlFor="q" className="lb">Cerca</label>
        <input id="q" className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Scrivi almeno 2 lettere del nickname" autoComplete="off" />
      </div>
      <div className="label">{q.trim().length >= 2 ? 'Risultati' : 'Iscritti da poco'}</div>
      <div className="panel"><div className="list">
        {lista.filter(p => p.id !== user?.id).map(p => (
          <div className="prow" key={p.id}>
            <Link className="l" href={`/u/${p.nickname}`}><Avatar nick={p.nickname} url={p.avatar_url} size={40} />
              <span style={{ minWidth: 0 }}><b>{p.nickname}{p.privato && <span className="tag" style={{ marginLeft: 6 }}><Ico n="lock" />privato</span>}</b>
                {p.bio && <span className="hint">{p.bio}</span>}</span></Link>
            <Link className="btn sm" href={`/u/${p.nickname}`}>Vedi profilo</Link>
          </div>
        ))}
        {!lista.length && <p className="hint">{q.trim().length >= 2 ? 'Nessuno con questo nickname.' : 'Ancora nessun altro iscritto.'}</p>}
      </div></div>
    </Shell>
  );
}
