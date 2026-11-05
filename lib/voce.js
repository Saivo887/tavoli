'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';

/*
  Voce dal vivo con LiveKit.
  - tutti i presenti ascoltano;
  - chi può parlare (seduto, non silenziato, con la parola) riceve un permesso per il microfono;
  - quando il permesso cambia ci si ricollega con un nuovo permesso.
*/
export function useVoce({ tavoloId, attivo, puoParlare }) {
  const [stato, setStato] = useState('spento'); // spento | collego | connesso | non_disponibile | errore
  const [micOn, setMicOn] = useState(false);
  const [parlanti, setParlanti] = useState(new Set());
  const [audioBloccato, setAudioBloccato] = useState(false);
  const roomRef = useRef(null);
  const ultimaAttivita = useRef(0);

  useEffect(() => {
    if (!attivo || !tavoloId) return;
    let annullato = false;
    let room = null;

    (async () => {
      setStato('collego');
      const { data, error } = await supabase.functions.invoke('token-voce', { body: { tavolo: tavoloId } });
      if (annullato) return;
      if (error || !data) { setStato('errore'); return; }
      if (!data.disponibile) { setStato('non_disponibile'); return; }

      const { Room, RoomEvent, Track } = await import('livekit-client');
      if (annullato) return;
      room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach();
          el.setAttribute('data-voce', '1');
          el.style.display = 'none';
          document.body.appendChild(el);
        }
      });
      room.on(RoomEvent.TrackUnsubscribed, (track) => { track.detach().forEach(el => el.remove()); });
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const ids = new Set(speakers.map(p => p.identity));
        setParlanti(ids);
        const io = room.localParticipant?.identity;
        if (io && ids.has(io) && Date.now() - ultimaAttivita.current > 30000) {
          ultimaAttivita.current = Date.now();
          supabase.rpc('attivita', { t: tavoloId });
        }
      });
      room.on(RoomEvent.AudioPlaybackStatusChanged, () => setAudioBloccato(!room.canPlaybackAudio));
      room.on(RoomEvent.Disconnected, () => { if (!annullato) { setStato('spento'); setMicOn(false); } });

      try {
        await room.connect(data.url, data.token);
        if (annullato) { room.disconnect(); return; }
        setAudioBloccato(!room.canPlaybackAudio);
        setStato('connesso');
      } catch {
        if (!annullato) setStato('errore');
      }
    })();

    return () => {
      annullato = true;
      setMicOn(false);
      setParlanti(new Set());
      if (room) room.disconnect();
      roomRef.current = null;
      document.querySelectorAll('audio[data-voce]').forEach(el => el.remove());
    };
  }, [tavoloId, attivo, puoParlare]);

  const cambiaMic = useCallback(async () => {
    const room = roomRef.current;
    if (!room || !puoParlare) return false;
    const nuovo = !micOn;
    try {
      await room.localParticipant.setMicrophoneEnabled(nuovo);
      setMicOn(nuovo);
      if (nuovo) supabase.rpc('attivita', { t: tavoloId });
      return true;
    } catch {
      return false;
    }
  }, [micOn, puoParlare, tavoloId]);

  const attivaAudio = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try { await room.startAudio(); setAudioBloccato(false); } catch {}
  }, []);

  return { stato, micOn, cambiaMic, parlanti, audioBloccato, attivaAudio };
}
