import { ImageResponse } from 'next/og';
import { TC, TEMI } from '@/lib/temi';
import { TavoloSvg, sfondoStanza } from '@/components/OgTavolo';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Tavoli: siediti al tavolo e confrontati davvero';

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: sfondoStanza('Psicologia'), color: '#fff7ee', padding: 64, fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 28, flex: 1 }}>
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 800 }}>Tavoli</div>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 72, fontWeight: 800, lineHeight: 1.04, letterSpacing: -1 }}>
            <span>Siediti al tavolo.</span><span>Confrontati davvero.</span>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {TEMI.slice(0, 5).map(t => (
              <div key={t} style={{ display: 'flex', background: TC[t], color: '#fff', borderRadius: 999, padding: '8px 20px', fontSize: 26, fontWeight: 700 }}>{t}</div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <TavoloSvg sedie={6} occupati={4} tema="Psicologia" size={400} />
        </div>
      </div>
    ),
    size,
  );
}
