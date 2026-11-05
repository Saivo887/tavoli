export default function manifest() {
  return {
    name: 'Tavoli',
    short_name: 'Tavoli',
    description: 'Siediti al tavolo e confrontati: politica, scuola, studio, psicologia, relazioni.',
    start_url: '/',
    display: 'standalone',
    background_color: '#2a1912',
    theme_color: '#6a3df0',
    lang: 'it',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
