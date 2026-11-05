'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { useAuth, useToast } from '@/components/Providers';
import { Caricamento, Seg } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { messaggioErrore, quando } from '@/lib/temi';

export default function Admin() {
  const { admin, profilo } = useAuth();
  const toast = useToast();
  const [filtro, setFiltro] = useState('aperta');
  const [lista, setLista] = useState(null);

  const carica = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_segnalazioni', { p_stato: filtro === 'tutte' ? null : filtro });
    if (error) { toast(messaggioErrore(error)); setLista([]); return; }
    setLista(data || []);
  }, [filtro, toast]);

  useEffect(() => { if (admin) carica(); }, [admin, carica]);

  async function azione(id, a, ok) {
    const { error } = await supabase.rpc('admin_azione', { p_segnalazione: id, p_azione: a });
    if (error) toast(messaggioErrore(error)); else { toast(ok); carica(); }
  }

  if (!profilo) return <Shell><Caricamento /></Shell>;
  if (!admin) return <Shell><div className="empty"><h3>Questa pagina è riservata all’amministrazione.</h3><Link className="btn" href="/">Torna alla home</Link></div></Shell>;

  return (
    <Shell>
      <div className="head">
        <div><h1>Segnalazioni</h1><p className="sub">Decidi cosa fare con ogni segnalazione. Le azioni vengono applicate subito.</p></div>
        <Seg value={filtro} onChange={setFiltro} options={[['aperta', 'Da gestire'], ['risolta', 'Risolte'], ['ignorata', 'Ignorate'], ['tutte', 'Tutte']]} />
      </div>
      {!lista ? <Caricamento /> : !lista.length ? (
        <div className="empty"><h3>Nessuna segnalazione {filtro === 'aperta' ? 'da gestire' : 'in questo elenco'}.</h3></div>
      ) : lista.map(s => (
        <div key={s.id} className="panel segn">
          <div className="trow">
            <div className="chips"><span className="tag tema" style={{ '--tc': 'var(--live)' }}>{s.motivo}</span>
              <span className="tag">{s.stato === 'aperta' ? 'Da gestire' : s.stato === 'risolta' ? 'Risolta' : 'Ignorata'}</span>
              {s.esito && <span className="tag">{s.esito}</span>}</div>
            <span className="hint">{quando(s.creato_il)} · da {s.autore || 'account eliminato'}</span>
          </div>
          <div className="segn-dati">
            {s.utente && <p><b>Persona:</b> <Link href={`/u/${s.utente}`}>{s.utente}</Link>{s.utente_sospeso ? ' (sospesa)' : ''} · {s.segnalazioni_utente} segnalazioni in totale</p>}
            {s.tavolo && <p><b>Tavolo:</b> <Link href={`/tavolo/${s.tavolo_id}`}>{s.tavolo}</Link> ({s.tavolo_stato})</p>}
            {s.testo_segnalato && <blockquote>{s.testo_segnalato}</blockquote>}
            {s.dettagli && <p><b>Dettagli:</b> {s.dettagli}</p>}
          </div>
          <div className="chips">
            {s.stato === 'aperta' && <button className="btn sm" onClick={() => azione(s.id, 'ignora', 'Segnalazione archiviata.')}>Nessuna violazione</button>}
            {s.messaggio_id && s.stato === 'aperta' && <button className="btn sm" onClick={() => azione(s.id, 'elimina_messaggio', 'Messaggio eliminato.')}>Elimina il messaggio</button>}
            {s.tavolo_id && s.tavolo_stato !== 'chiuso' && <button className="btn sm" onClick={() => azione(s.id, 'chiudi_tavolo', 'Tavolo chiuso.')}>Chiudi il tavolo</button>}
            {s.utente_id && !s.utente_sospeso && <button className="btn sm danger" onClick={() => azione(s.id, 'sospendi', 'Utente sospeso.')}>Sospendi la persona</button>}
            {s.utente_id && s.utente_sospeso && <button className="btn sm" onClick={() => azione(s.id, 'riattiva', 'Utente riattivato.')}>Riattiva la persona</button>}
          </div>
        </div>
      ))}
    </Shell>
  );
}
