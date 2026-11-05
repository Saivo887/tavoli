import Legale from '@/components/Legale';
import { NOME, contatto } from '@/lib/sito';

export const metadata = { title: `Cookie · ${NOME}` };

export default function Cookie() {
  return (
    <Legale titolo="Cookie e archiviazione locale">
      <p>{NOME} non usa cookie di profilazione, pubblicitari o di statistica, e non carica servizi esterni che tracciano la navigazione. Per questo non ti chiediamo un consenso con un banner.</p>

      <h2>Cosa salviamo sul tuo dispositivo</h2>
      <ul>
        <li><b>Sessione di accesso:</b> un dato tecnico salvato nell’archivio locale del browser (localStorage) che ti mantiene connesso. È indispensabile per usare il servizio e viene cancellato quando esci.</li>
        <li><b>Notifiche:</b> se attivi le notifiche sul telefono, il browser registra un piccolo programma (service worker) che serve solo a mostrarti gli avvisi.</li>
      </ul>
      <p>Questi strumenti sono tecnici e necessari, quindi non richiedono consenso secondo le linee guida del Garante privacy.</p>

      <h2>Come cancellarli</h2>
      <p>Puoi cancellarli in qualsiasi momento uscendo dall’account o dalle impostazioni del browser. Per domande scrivi a {contatto()}.</p>
    </Legale>
  );
}
