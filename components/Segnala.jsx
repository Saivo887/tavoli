'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { messaggioErrore } from '@/lib/temi';
import { useToast } from './Providers';
import { Modale } from './ui';

const MOTIVI = ['Insulti o molestie', 'Odio o discriminazione', 'Minacce o violenza', 'Contenuti sessuali', 'Spam o truffa', 'Altro'];

// cosa: { utente?, tavolo?, messaggio?, descrizione }
export default function Segnala({ cosa, onClose }) {
  const toast = useToast();
  const [motivo, setMotivo] = useState('');
  const [dettagli, setDettagli] = useState('');
  const [attesa, setAttesa] = useState(false);
  const [errore, setErrore] = useState('');

  async function invia(e) {
    e.preventDefault();
    if (!motivo) { setErrore('Scegli un motivo.'); return; }
    setAttesa(true);
    const { error } = await supabase.rpc('segnala', {
      p_utente: cosa.utente || null, p_tavolo: cosa.tavolo || null, p_messaggio: cosa.messaggio || null,
      p_motivo: motivo, p_dettagli: dettagli,
    });
    setAttesa(false);
    if (error) { setErrore(messaggioErrore(error)); return; }
    toast('Segnalazione inviata. La controlleremo al più presto.');
    onClose();
  }

  return (
    <Modale titolo={`Segnala ${cosa.descrizione}`} onClose={onClose}>
      <form onSubmit={invia} className="stackform">
        <div className="motivi" role="radiogroup" aria-label="Motivo">
          {MOTIVI.map(m => (
            <label key={m} className={`motivo ${motivo === m ? 'on' : ''}`}>
              <input type="radio" name="motivo" value={m} checked={motivo === m} onChange={() => setMotivo(m)} />{m}
            </label>
          ))}
        </div>
        <div className="field">
          <label htmlFor="segn-det">Dettagli (facoltativo)</label>
          <textarea id="segn-det" rows={3} maxLength={500} value={dettagli} onChange={e => setDettagli(e.target.value)} placeholder="Cosa è successo?" />
        </div>
        {errore && <p className="err">{errore}</p>}
        <p className="hint" style={{ margin: 0 }}>Chi segnali non saprà che sei stato tu. In caso di pericolo immediato chiama il 112.</p>
        <button className="btn primary" disabled={attesa}>{attesa ? 'Invio…' : 'Invia segnalazione'}</button>
      </form>
    </Modale>
  );
}
