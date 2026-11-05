'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { VAPID_PUBBLICA } from '@/lib/sito';
import { useAuth, useToast } from './Providers';

function chiave(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

export default function NotificheTelefono() {
  const { user } = useAuth();
  const toast = useToast();
  const [stato, setStato] = useState('controllo'); // controllo | non_supportato | ios | negato | attive | spente
  const [attesa, setAttesa] = useState(false);

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const installata = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        setStato(ios && !installata ? 'ios' : 'non_supportato'); return;
      }
      if (Notification.permission === 'denied') { setStato('negato'); return; }
      const reg = await navigator.serviceWorker.getRegistration('/sw.js') || await navigator.serviceWorker.register('/sw.js');
      const sub = await reg.pushManager.getSubscription();
      setStato(sub ? 'attive' : 'spente');
    })().catch(() => setStato('non_supportato'));
  }, []);

  async function attiva() {
    setAttesa(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setStato(perm === 'denied' ? 'negato' : 'spente'); return; }
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chiave(VAPID_PUBBLICA) });
      const j = sub.toJSON();
      const { error } = await supabase.from('push_iscrizioni').upsert(
        { utente_id: user.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth },
        { onConflict: 'endpoint' });
      if (error) throw error;
      setStato('attive');
      toast('Notifiche attivate su questo dispositivo.');
    } catch {
      toast('Non sono riuscito ad attivare le notifiche su questo dispositivo.');
    } finally { setAttesa(false); }
  }

  async function disattiva() {
    setAttesa(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      const sub = reg && await reg.pushManager.getSubscription();
      if (sub) {
        await supabase.from('push_iscrizioni').delete().eq('endpoint', sub.endpoint);
        await sub.unsubscribe();
      }
      setStato('spente');
      toast('Notifiche disattivate su questo dispositivo.');
    } finally { setAttesa(false); }
  }

  return (
    <div className="field">
      <span className="lb">Notifiche su questo dispositivo</span>
      {stato === 'attive' && <><span className="hint">Attive: ti avvisiamo per messaggi, inviti e tavoli delle persone con la campanella.</span>
        <button type="button" className="btn" style={{ alignSelf: 'flex-start' }} disabled={attesa} onClick={disattiva}>Disattiva</button></>}
      {stato === 'spente' && <><span className="hint">Ricevi un avviso anche quando il sito è chiuso.</span>
        <button type="button" className="btn primary" style={{ alignSelf: 'flex-start' }} disabled={attesa} onClick={attiva}>Attiva le notifiche</button></>}
      {stato === 'negato' && <span className="hint">Hai bloccato le notifiche per questo sito: riattivale dalle impostazioni del browser.</span>}
      {stato === 'ios' && <span className="hint">Su iPhone aggiungi prima il sito alla schermata Home (Condividi → Aggiungi alla schermata Home), poi aprilo da lì e torna qui.</span>}
      {stato === 'non_supportato' && <span className="hint">Questo browser non supporta le notifiche.</span>}
      {stato === 'controllo' && <span className="hint">Controllo…</span>}
    </div>
  );
}
