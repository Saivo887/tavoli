'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { useAuth, useToast } from '@/components/Providers';
import { Avatar, Caricamento } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { messaggioErrore, quando } from '@/lib/temi';

const TESTI = {
  richiesta_segui: () => 'ha chiesto di seguirti',
  nuovo_follower: () => 'ha iniziato a seguirti',
  segui_accettato: () => 'ha accettato la tua richiesta: ora lo segui',
  tavolo_aperto: n => `ha aperto il tavolo “${n.tavoli?.titolo || ''}”`,
  tavolo_programmato: n => `ha programmato il tavolo “${n.tavoli?.titolo || ''}”`,
  invito_tavolo: n => `ti invita al tavolo “${n.tavoli?.titolo || ''}”`,
  segnalazione: () => 'è stato segnalato: c’è una nuova segnalazione da gestire',
  riconoscimento_argomento: n => `ha apprezzato un tuo argomento al tavolo “${n.tavoli?.titolo || ''}”`,
  riconoscimento_cambiare_idea: n => `dice che gli hai fatto cambiare idea al tavolo “${n.tavoli?.titolo || ''}”`,
};

export default function Notifiche() {
  const { user } = useAuth();
  const toast = useToast();
  const [lista, setLista] = useState(null);
  const [richieste, setRichieste] = useState(new Set());

  const carica = useCallback(async () => {
    const [{ data }, { data: r }] = await Promise.all([
      supabase.from('notifiche').select('id, tipo, letta, creato_il, tavolo_id, da_utente_id, da:profili!notifiche_da_utente_id_fkey(nickname, avatar_url), tavoli(titolo, stato)')
        .eq('utente_id', user.id).order('id', { ascending: false }).limit(60),
      supabase.from('seguiti').select('follower_id').eq('seguito_id', user.id).eq('stato', 'richiesta'),
    ]);
    setLista(data || []);
    setRichieste(new Set((r || []).map(x => x.follower_id)));
  }, [user]);

  useEffect(() => { if (user) carica(); }, [user, carica]);

  async function leggiTutte() {
    await supabase.from('notifiche').update({ letta: true }).eq('utente_id', user.id).eq('letta', false);
    carica();
  }
  async function rispondi(f, accetta) {
    const { error } = await supabase.rpc('rispondi_segui', { f, accetta });
    if (error) toast(messaggioErrore(error)); else { toast(accetta ? 'Richiesta accettata.' : 'Richiesta rifiutata.'); carica(); }
  }

  if (!lista) return <Shell><Caricamento /></Shell>;
  const nonLette = lista.some(n => !n.letta);

  return (
    <Shell>
      <div className="head"><div><h1>Notifiche</h1></div>{nonLette && <button className="btn sm" onClick={leggiTutte}>Segna tutte come lette</button>}</div>
      <div className="panel"><div className="list">
        {lista.map(n => (
          <div key={n.id} className={`notif ${n.letta ? '' : 'unread'}`}>
            <Link className="l" href={n.da ? `/u/${n.da.nickname}` : '#'}>
              <Avatar nick={n.da?.nickname} url={n.da?.avatar_url} size={38} />
              <p>{n.tipo === 'segnalazione' && !n.da
                ? <>Nuova segnalazione su un tavolo da gestire</>
                : <><b>{n.da?.nickname || 'Qualcuno'}</b> {(TESTI[n.tipo] || (() => n.tipo))(n)}</>}
                <br /><time>{quando(n.creato_il)}</time></p>
            </Link>
            {n.tipo === 'richiesta_segui' && richieste.has(n.da_utente_id) && (
              <span className="chips"><button className="btn sm primary" onClick={() => rispondi(n.da_utente_id, true)}>Accetta</button>
                <button className="btn sm" onClick={() => rispondi(n.da_utente_id, false)}>Rifiuta</button></span>
            )}
            {n.tipo === 'segnalazione'
              ? <Link className="btn sm" href="/admin">Gestisci</Link>
              : n.tavolo_id && n.tavoli?.stato === 'aperto' && <Link className="btn sm" href={`/tavolo/${n.tavolo_id}`}>{n.tipo === 'invito_tavolo' ? 'Entra' : 'Vai al tavolo'}</Link>}
          </div>
        ))}
        {!lista.length && <p className="hint">Nessuna notifica. Segui qualcuno e attiva la campanella per sapere quando apre un tavolo.</p>}
      </div></div>
    </Shell>
  );
}
