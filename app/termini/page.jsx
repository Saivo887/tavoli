import Legale from '@/components/Legale';
import { NOME, TITOLARE, contatto } from '@/lib/sito';

export const metadata = { title: `Termini d’uso · ${NOME}` };

export default function Termini() {
  return (
    <Legale titolo="Termini d’uso">
      <p>Questi termini regolano l’uso di {NOME}, il servizio di discussione a tavoli gestito da {TITOLARE} (contatto: {contatto()}). Registrandoti li accetti.</p>

      <h2>1. Chi può iscriversi</h2>
      <p>Il servizio è riservato a persone con almeno 18 anni. Ognuno può avere un solo account, personale e non cedibile. Sei responsabile della sicurezza della tua password.</p>

      <h2>2. Come funzionano i tavoli</h2>
      <ul>
        <li>Chi apre un tavolo ne è il creatore: sceglie titolo, tema, numero di sedie e regole, e può nominare fino a 3 co-gestori.</li>
        <li>Creatore e co-gestori possono far sedere, silenziare, rimandare tra il pubblico ed espellere i partecipanti dal proprio tavolo. Chi viene espulso non può rientrare in quel tavolo.</li>
        <li>Al tavolo si può parlare a voce o scrivere. L’audio è trasmesso in diretta e non viene registrato. Non registrare né diffondere quello che dicono gli altri senza il loro consenso.</li>
      </ul>

      <h2>3. Regole di comportamento</h2>
      <p>{NOME} serve a confrontarsi, anche in modo acceso, nel rispetto delle persone. È vietato:</p>
      <ul>
        <li>insultare, molestare, minacciare o perseguitare altri utenti;</li>
        <li>incitare all’odio o alla discriminazione per origine, religione, genere, orientamento sessuale, disabilità o altre caratteristiche personali;</li>
        <li>pubblicare contenuti sessuali espliciti, violenti o illegali;</li>
        <li>diffondere dati personali di altri senza consenso;</li>
        <li>fare spam, truffe, pubblicità non richiesta o usare account automatici;</li>
        <li>fingersi un’altra persona.</li>
      </ul>

      <h2>4. Temi delicati</h2>
      <p>I tavoli su psicologia, relazioni e salute sono spazi di confronto tra persone, non consulenze professionali e non sostituiscono medici, psicologi o servizi di emergenza. In caso di pericolo chiama il 112. Se stai attraversando un momento difficile puoi contattare il Telefono Amico (02 2327 2327) o il servizio di supporto della tua zona.</p>

      <h2>5. Segnalazioni e moderazione</h2>
      <ul>
        <li>Con il pulsante <b>Segnala</b> puoi segnalare persone, tavoli e messaggi. Esaminiamo le segnalazioni il prima possibile.</li>
        <li>Possiamo eliminare contenuti, chiudere tavoli e sospendere account che violano queste regole o la legge. In questi casi indichiamo il motivo della decisione.</li>
        <li>Se non sei d’accordo con una decisione che ti riguarda puoi contestarla scrivendo a {contatto()}: la riesamineremo.</li>
        <li>Lo stesso indirizzo è il punto di contatto per le autorità e per le segnalazioni di contenuti illegali previsto dal Regolamento UE 2022/2065.</li>
      </ul>

      <h2>6. I tuoi contenuti</h2>
      <p>Quello che scrivi o dici resta tuo e ne sei responsabile. Ci autorizzi a mostrarlo agli altri partecipanti per far funzionare il servizio. Quando elimini l’account, i tuoi contenuti vengono cancellati.</p>

      <h2>7. Il servizio</h2>
      <p>{NOME} è gratuito ed è in fase di prova: alcune funzioni possono cambiare, interrompersi o non funzionare come previsto. Facciamo il possibile per tenerlo attivo e sicuro, ma non possiamo garantirlo senza interruzioni e non rispondiamo dei contenuti pubblicati dagli utenti.</p>

      <h2>8. Chiusura dell’account</h2>
      <p>Puoi eliminare il tuo account in qualsiasi momento dal profilo. Possiamo sospendere o chiudere gli account che violano gravemente o ripetutamente queste regole.</p>

      <h2>9. Modifiche e legge applicabile</h2>
      <p>Se cambiamo questi termini lo comunichiamo sul sito. Si applica la legge italiana; restano salvi i diritti che la legge riconosce ai consumatori.</p>
    </Legale>
  );
}
