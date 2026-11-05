import { rpcPubblica } from '@/lib/server';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const t = await rpcPubblica('anteprima_tavolo', { t: Number(id) });
  if (!t) return { title: 'Tavolo · Tavoli', description: 'Siediti al tavolo e confrontati davvero.' };
  const liberi = Math.max(0, t.sedie - (t.seduti?.length || 0));
  const descr = t.stato === 'aperto'
    ? `Discussione in corso su ${t.tema}. ${liberi > 0 ? `${liberi} posti liberi al tavolo` : 'Tavolo pieno'}, ${t.pubblico} nel pubblico. Entra ad ascoltare.`
    : t.stato === 'programmato' ? `Tavolo in programma su ${t.tema}, aperto da ${t.creatore}. Fatti avvisare quando inizia.`
    : `Discussione conclusa su ${t.tema}. Leggi com’è andata.`;
  return {
    title: `${t.titolo} · Tavoli`,
    description: descr,
    openGraph: { title: t.titolo, description: descr, type: 'website', siteName: 'Tavoli', locale: 'it_IT' },
    twitter: { card: 'summary_large_image', title: t.titolo, description: descr },
  };
}

export default function LayoutTavolo({ children }) {
  return children;
}
