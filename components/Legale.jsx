import Link from 'next/link';
import { NOME, AGGIORNAMENTO_LEGALE } from '@/lib/sito';

export default function Legale({ titolo, children }) {
  return (
    <div className="legale">
      <header>
        <Link href="/" className="brand"><i />{NOME}</Link>
        <nav><Link href="/regole">Regole</Link><Link href="/termini">Termini</Link><Link href="/privacy">Privacy</Link><Link href="/cookie">Cookie</Link></nav>
      </header>
      <article>
        <h1>{titolo}</h1>
        <p className="hint">Ultimo aggiornamento: {AGGIORNAMENTO_LEGALE}</p>
        {children}
      </article>
    </div>
  );
}
