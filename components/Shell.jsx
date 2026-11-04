'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './Providers';
import { Ico, Caricamento } from './ui';

export default function Shell({ children, wide }) {
  const { session, user } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const [nNotif, setNNotif] = useState(0);
  const [nChat, setNChat] = useState(0);

  useEffect(() => {
    if (session === null) router.replace('/accedi');
  }, [session, router]);

  useEffect(() => {
    if (!user) return;
    const conta = async () => {
      const [{ count: a }, { count: b }] = await Promise.all([
        supabase.from('notifiche').select('id', { count: 'exact', head: true }).eq('utente_id', user.id).eq('letta', false),
        supabase.from('messaggi_privati').select('id', { count: 'exact', head: true }).eq('destinatario_id', user.id).eq('letto', false),
      ]);
      setNNotif(a || 0); setNChat(b || 0);
    };
    conta();
    const ch = supabase.channel('badge-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifiche', filter: `utente_id=eq.${user.id}` }, conta)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messaggi_privati', filter: `destinatario_id=eq.${user.id}` }, conta)
      .subscribe();
    const iv = setInterval(conta, 30000);
    return () => { supabase.removeChannel(ch); clearInterval(iv); };
  }, [user, path]);

  if (!session) return <Caricamento />;

  const items = [
    ['/', 'Home', 'home'],
    ['/crea', 'Crea tavolo', 'plus'],
    ['/persone', 'Persone', 'users'],
    ['/chat', 'Chat', 'chat', nChat],
    ['/notifiche', 'Notifiche', 'bell', nNotif],
    ['/profilo', 'Profilo', 'user'],
  ];
  const attivo = (href) => (href === '/' ? path === '/' || path.startsWith('/tavolo') : path.startsWith(href));

  return (
    <div className="app">
      <aside className="side">
        <Link href="/" className="brand"><i />Tavoli</Link>
        <nav className="nav">
          {items.map(([href, l, i, b]) => (
            <Link key={href} href={href} className={href === '/crea' ? 'create' : ''} aria-current={attivo(href) ? 'page' : undefined}>
              <Ico n={i} />{b ? <span className="badge">{b > 99 ? '99+' : b}</span> : null}{l}
            </Link>
          ))}
        </nav>
        <button className="esci" onClick={async () => { await supabase.auth.signOut(); router.replace('/accedi'); }}>
          <Ico n="out" />Esci
        </button>
      </aside>
      <main><div className={wide ? 'wrap wide' : 'wrap'}>{children}</div></main>
      <nav className="bottom">
        {items.filter(([h]) => h !== '/persone').map(([href, l, i, b]) => (
          <Link key={href} href={href} className={href === '/crea' ? 'plus' : ''} aria-current={attivo(href) ? 'page' : undefined}>
            <Ico n={i} />{b ? <span className="badge">{b > 99 ? '99+' : b}</span> : null}{href === '/crea' ? 'Crea' : l}
          </Link>
        ))}
      </nav>
    </div>
  );
}
