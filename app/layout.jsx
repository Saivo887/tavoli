import { Bricolage_Grotesque, Figtree, JetBrains_Mono } from 'next/font/google';
import Providers from '@/components/Providers';
import './globals.css';

const display = Bricolage_Grotesque({ subsets: ['latin'], weight: ['500', '700', '800'], variable: '--font-display' });
const body = Figtree({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['500'], variable: '--font-mono' });

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITO || 'https://tavoli-orcin.vercel.app'),
  title: 'Tavoli · Siediti al tavolo, confrontati davvero',
  description: 'Apri un tavolo su politica, scuola, studio, psicologia o relazioni. Parla o scrivi, oppure ascolta dal pubblico.',
  openGraph: { siteName: 'Tavoli', locale: 'it_IT', type: 'website' },
  twitter: { card: 'summary_large_image' },
  applicationName: 'Tavoli',
  appleWebApp: { capable: true, title: 'Tavoli', statusBarStyle: 'black-translucent' },
  icons: { apple: '/icons/apple-touch-icon.png' },
};

export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#6a3df0' };

export default function RootLayout({ children }) {
  return (
    <html lang="it" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
