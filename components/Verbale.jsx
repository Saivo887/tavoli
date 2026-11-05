'use client';

function Lista({ titolo, voci }) {
  if (!voci?.length) return null;
  return (
    <div>
      <div className="label" style={{ marginBottom: 6 }}>{titolo}</div>
      <ul className="verbale-lista">{voci.map((v, i) => <li key={i}>{v}</li>)}</ul>
    </div>
  );
}

export default function Verbale({ v }) {
  if (!v) return <p className="hint">Il verbale si sta preparando: torna tra qualche secondo.</p>;
  return (
    <div className="verbale">
      <div className="verbale-numeri">
        <div><b>{v.durata_minuti}</b><span>minuti</span></div>
        <div><b>{v.al_tavolo}</b><span>al tavolo</span></div>
        <div><b>{v.pubblico}</b><span>nel pubblico</span></div>
        <div><b>{v.interventi_scritti}</b><span>interventi scritti</span></div>
      </div>
      {v.sintesi && <p className="verbale-sintesi">{v.sintesi}</p>}
      <Lista titolo="Posizioni emerse" voci={v.posizioni} />
      <Lista titolo="Punti d’accordo" voci={v.accordi} />
      <Lista titolo="Domande rimaste aperte" voci={v.domande_aperte} />
      {v.piu_attivi?.length > 0 && <p className="hint" style={{ margin: 0 }}>Più attivi per iscritto: {v.piu_attivi.map(p => `${p.nickname} (${p.n})`).join(', ')}</p>}
      {v.con_ai && <p className="hint" style={{ margin: 0 }}>Sintesi preparata in automatico dagli interventi scritti: può essere imprecisa.</p>}
    </div>
  );
}
