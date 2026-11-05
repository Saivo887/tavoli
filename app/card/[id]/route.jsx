// Card verticale (formato storie 1080x1920) da condividere su Instagram, WhatsApp, TikTok.
import { ImageResponse } from 'next/og';
import { rpcPubblica } from '@/lib/server';
import { TC } from '@/lib/temi';
import { TavoloSvg, sfondoStanza } from '@/components/OgTavolo';

export async function GET(_req, { params }) {
  const { id } = await params;
  const t = await rpcPubblica('anteprima_tavolo', { t: Number(id) });
  const tema = t?.tema || 'Altro';
  const titolo = t?.titolo || 'Un tavolo su Tavoli';
  const v = t?.verbale;
  const frase = t?.stato === 'chiuso' ? 'Ho partecipato a' : t?.stato === 'programmato' ? 'Ti aspetto al tavolo' : 'Sono al tavolo';
  const dettaglio = t?.stato === 'chiuso' && v
    ? `${v.durata_minuti || 0} minuti · ${v.al_tavolo || 0} al tavolo · ${v.pubblico || 0} nel pubblico`
    : t?.stato === 'programmato' ? new Date(t.inizio_previsto).toLocaleString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
    : 'Entra ad ascoltare o siediti con noi';

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', background: sfondoStanza(tema), color: '#fff7ee', padding: '140px 90px', fontFamily: 'sans-serif', textAlign: 'center' }}>
        <div style={{ display: 'flex', fontSize: 56, fontWeight: 800 }}>Tavoli</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}>
          <TavoloSvg sedie={t?.sedie || 6} occupati={Math.max(t?.seduti?.length || 0, v?.al_tavolo || 0)} tema={tema} size={620} />
          <div style={{ display: 'flex', fontSize: 44, color: '#d2bcaa' }}>{frase}</div>
          <div style={{ display: 'flex', fontSize: titolo.length > 60 ? 70 : 84, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1 }}>{titolo}</div>
          <div style={{ display: 'flex', background: TC[tema], color: '#fff', borderRadius: 999, padding: '12px 34px', fontSize: 40, fontWeight: 700 }}>{tema}</div>
        </div>
        <div style={{ display: 'flex', fontSize: 38, color: '#d2bcaa' }}>{dettaglio}</div>
      </div>
    ),
    { width: 1080, height: 1920 },
  );
}
