import Link from 'next/link';
import Legale from '@/components/Legale';
import { NOME } from '@/lib/sito';

export const metadata = { title: `Regole della casa · ${NOME}` };

const REGOLE = [
  ['Si attacca l’idea, non la persona', 'Puoi essere in totale disaccordo. Non puoi insultare, deridere o prendere di mira chi la pensa diversamente.'],
  ['Prima ascolta, poi rispondi', 'Prova a riassumere cosa ha detto l’altro prima di ribattere. Spesso il disaccordo è più piccolo di quanto sembra.'],
  ['Chi apre il tavolo fa le regole', 'Il creatore e i co-gestori decidono chi si siede, chi parla e chi deve andare. Se non ti piacciono le regole di un tavolo, aprine uno tuo.'],
  ['Al tavolo si lascia spazio', 'Non monopolizzare la discussione. Se tutti hanno parlato tranne una persona, chiedile cosa ne pensa.'],
  ['Niente odio, niente minacce', 'Discriminare per origine, religione, genere, orientamento o disabilità e minacciare qualcuno porta alla sospensione dell’account.'],
  ['Quello che si dice al tavolo resta al tavolo', 'Non registrare la voce degli altri e non diffondere screenshot con nomi o dati personali senza permesso.'],
  ['Sui temi delicati, delicatezza', 'Nei tavoli su psicologia e relazioni si condividono esperienze, non diagnosi. Se qualcuno è in difficoltà, suggerisci un aiuto professionale. In emergenza: 112.'],
  ['Se qualcuno esagera, segnala', 'Usa il pulsante Segnala su persone, messaggi e tavoli. Chi segnali non saprà che sei stato tu.'],
];

export default function Regole() {
  return (
    <Legale titolo="Regole della casa">
      <p>{NOME} è fatto per confrontarsi davvero, anche in modo acceso. Per riuscirci servono poche regole, uguali per tutti.</p>
      <ol className="regole">
        {REGOLE.map(([t, d]) => <li key={t}><b>{t}</b><span>{d}</span></li>)}
      </ol>
      <p>Le regole complete sono nei <Link href="/termini">Termini d’uso</Link>.</p>
    </Legale>
  );
}
