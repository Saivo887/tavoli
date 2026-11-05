import { ImageResponse } from 'next/og';
import { rpcPubblica } from '@/lib/server';
import { TC } from '@/lib/temi';
import { TavoloSvg, sfondoStanza } from '@/components/OgTavolo';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Un tavolo di discussione su Tavoli';

export default async function Image({ params }) {
  const { id } = await params;
  const t = await rpcPubblica('anteprima_tavolo', { t: Number(id) });
  const tema = t?.tema || 'Altro';
  const titolo = t?.titolo || 'Un tavolo privato su Tavoli';
  const seduti = t?.seduti?.length || 0;
  const sedie = t?.sedie || 6;
  const liberi = Math.max(0, sedie - seduti);
  let riga = 'Siediti al tavolo. Confrontati davvero.';
  if (t?.stato === 'aperto') riga = liberi > 0 ? `In corso · ${liberi} ${liberi === 1 ? 'posto libero' : 'posti liberi'} · ${t.pubblico} nel pubblico` : `In corso · tavolo pieno · ${t.pubblico} nel pubblico`;
  else if (t?.stato === 'programmato') riga = `In programma · ${new Date(t.inizio_previsto).toLocaleString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })}`;
  else if (t?.stato === 'chiuso') riga = 'Discussione conclusa · leggi com’è andata';

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: sfondoStanza(tema), color: '#fff7ee', padding: 64, fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, paddingRight: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', background: TC[tema], color: '#fff', borderRadius: 999, padding: '8px 22px', fontSize: 28, fontWeight: 700 }}>{tema}</div>
            {t?.stato === 'aperto' && <div style={{ display: 'flex', background: '#e8505b', color: '#fff', borderRadius: 999, padding: '8px 22px', fontSize: 28, fontWeight: 700 }}>● In corso</div>}
          </div>
          <div style={{ display: 'flex', fontSize: titolo.length > 60 ? 54 : 66, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1 }}>{titolo}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', fontSize: 30, color: '#d2bcaa' }}>{riga}</div>
            <div style={{ display: 'flex', fontSize: 34, fontWeight: 800 }}>Tavoli</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <TavoloSvg sedie={sedie} occupati={seduti} tema={tema} size={420} />
        </div>
      </div>
    ),
    size,
  );
}
