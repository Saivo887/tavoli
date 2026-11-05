'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/Shell';
import { useToast } from '@/components/Providers';
import { Ico, Seg } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { TC, TEMI, messaggioErrore } from '@/lib/temi';

const IDEE = {
  Politica: ['Salario minimo in Italia: sì o no?', 'Il voto ai sedicenni ha senso?', 'Tasse sui grandi patrimoni: giusto o controproducente?', 'L’Europa dovrebbe avere un esercito comune?', 'Perché i giovani non vanno a votare?'],
  Scuola: ['I compiti a casa servono ancora?', 'Telefono in classe: vietarlo del tutto?', 'L’intelligenza artificiale a scuola: aiuto o scorciatoia?', 'Il voto in pagella misura davvero quanto sai?', 'Settimana corta a scuola: favorevoli o contrari?'],
  Studio: ['Il tuo metodo di studio migliore', 'Università o lavoro subito dopo il diploma?', 'Come restare concentrati con il telefono vicino', 'Studiare in gruppo o da soli?', 'Vale ancora la pena fare un master?'],
  Psicologia: ['Ansia da prestazione: come la gestite?', 'Solitudine nell’era dei social', 'Andare dallo psicologo è ancora un tabù?', 'Come si dice di no senza sentirsi in colpa', 'Burnout: come ve ne siete accorti?'],
  Relazioni: ['Relazioni a distanza: funzionano davvero?', 'Amicizia tra uomo e donna: esiste?', 'Gelosia: quando diventa troppo?', 'Conoscersi con le app: pro e contro', 'Convivere prima del matrimonio?'],
  Altro: ['Lo smart working ci rende più felici?', 'Meglio vivere in città o in provincia?', 'Il libro che ti ha cambiato idea su qualcosa', 'I social ci uniscono o ci dividono?', 'Una cosa che faresti diversamente a vent’anni'],
};

function domaniAlle21() {
  const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(21, 0, 0, 0);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T21:00`;
}

export default function Crea() {
  const router = useRouter();
  const toast = useToast();
  const [titolo, setTitolo] = useState('');
  const [tema, setTema] = useState('Politica');
  const [sedie, setSedie] = useState(6);
  const [parola, setParola] = useState('libera');
  const [ingresso, setIngresso] = useState('libero');
  const [vis, setVis] = useState('pubblico');
  const [quandoT, setQuando] = useState('ora');
  const [data, setData] = useState(domaniAlle21());
  const [settimanale, setSettimanale] = useState(false);
  const [errore, setErrore] = useState('');
  const [attesa, setAttesa] = useState(false);

  async function invia(e) {
    e.preventDefault();
    setErrore('');
    if (titolo.trim().length < 3) { setErrore('Scrivi un titolo di almeno 3 caratteri.'); return; }
    let inizio = null;
    if (quandoT === 'prog') {
      const d = new Date(data);
      if (isNaN(d) || d.getTime() < Date.now() + 3 * 60000) { setErrore('Scegli una data e un’ora nel futuro.'); return; }
      inizio = d.toISOString();
    }
    setAttesa(true);
    const { data: id, error } = await supabase.rpc('crea_tavolo', {
      p_titolo: titolo.trim(), p_tema: tema, p_sedie: sedie, p_parola: parola, p_ingresso: ingresso, p_visibilita: vis, p_inizio: inizio,
      p_settimanale: !!inizio && settimanale,
    });
    setAttesa(false);
    if (error) { setErrore(messaggioErrore(error)); return; }
    if (inizio) { toast(settimanale ? 'Appuntamento fisso creato: il tavolo tornerà ogni settimana.' : 'Tavolo programmato. Chi ti segue con la campanella è stato avvisato.'); router.push('/'); }
    else router.push(`/tavolo/${id}`);
  }

  return (
    <Shell>
      <div className="head"><div><h1>Apri un tavolo</h1><p className="sub">Scegli il tema e le regole. Puoi cambiarle anche a tavolo aperto.</p></div></div>
      <form className="form" onSubmit={invia}>
        <div className="field">
          <label htmlFor="c-title">Titolo della discussione</label>
          <input id="c-title" maxLength={90} value={titolo} onChange={e => setTitolo(e.target.value)} placeholder="Es. Lo smart working ci rende più felici?" />
          <div className="idee">
            <span className="hint">Idee per {tema}:</span>
            {IDEE[tema].map(i => <button type="button" key={i} className="idea" style={{ '--tc': TC[tema] }} onClick={() => setTitolo(i)}>{i}</button>)}
          </div>
        </div>
        <div className="field">
          <span className="lb">Tema</span>
          <div className="chips">
            {TEMI.map(t => (
              <button type="button" key={t} className="chip" style={{ '--tc': TC[t] }} aria-pressed={tema === t} onClick={() => setTema(t)}><i />{t}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="lb">Sedie al tavolo</span>
          <div className="stepper">
            <button type="button" className="btn sm" onClick={() => setSedie(s => Math.max(2, s - 1))} aria-label="Meno sedie">−</button>
            <output>{sedie}</output>
            <button type="button" className="btn sm" onClick={() => setSedie(s => Math.min(12, s + 1))} aria-label="Più sedie">+</button>
            <span className="seatsbar" style={{ '--tc': TC[tema] }}>{Array.from({ length: sedie }, (_, i) => <span key={i} className="on" />)}</span>
          </div>
          <span className="hint">Da 2 a 12 sedie, la tua compresa. Gli altri ascoltano dal pubblico.</span>
        </div>
        <div className="field">
          <span className="lb">Chi parla</span>
          <Seg value={parola} onChange={setParola} options={[['libera', 'Parola libera'], ['mano', 'Alzata di mano']]} />
          <span className="hint">{parola === 'libera' ? 'Chi è seduto parla quando vuole.' : 'Chi è seduto alza la mano e tu dai la parola.'}</span>
        </div>
        <div className="field">
          <span className="lb">Come ci si siede</span>
          <Seg value={ingresso} onChange={setIngresso} options={[['libero', 'Libero'], ['scelta', 'Scelgo io']]} />
          <span className="hint">{ingresso === 'libero' ? 'Quando si libera una sedia, il primo del pubblico che la tocca si siede.' : 'Il pubblico chiede di sedersi e decidi tu.'}</span>
        </div>
        <div className="field">
          <span className="lb">Visibilità</span>
          <Seg value={vis} onChange={setVis} options={[['pubblico', 'Pubblico'], ['privato', <><Ico n="lock" />Privato</>]]} />
          <span className="hint">{vis === 'pubblico' ? 'Lo vedono tutti nella home.' : 'Lo vedono solo i tuoi amici (chi vi seguite a vicenda).'}</span>
        </div>
        <div className="field">
          <span className="lb">Quando</span>
          <Seg value={quandoT} onChange={setQuando} options={[['ora', 'Adesso'], ['prog', 'Programma']]} />
          {quandoT === 'prog' && <>
            <input type="datetime-local" style={{ maxWidth: 260 }} value={data} onChange={e => setData(e.target.value)} />
            <label className="check">
              <input type="checkbox" checked={settimanale} onChange={e => setSettimanale(e.target.checked)} />
              <span><b>Ripeti ogni settimana</b> stesso giorno e stessa ora. Diventa un appuntamento fisso: chi ti segue sa quando trovarti.</span>
            </label>
          </>}
        </div>
        {errore && <p className="err" role="alert">{errore}</p>}
        <div className="trow">
          <span className="hint">Chi ti segue con la campanella attiva riceverà una notifica.</span>
          <button className="btn primary" disabled={attesa}>{attesa ? 'Attendi…' : quandoT === 'ora' ? 'Apri il tavolo' : 'Programma il tavolo'}</button>
        </div>
      </form>
    </Shell>
  );
}
