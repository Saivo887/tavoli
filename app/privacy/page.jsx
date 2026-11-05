import Legale from '@/components/Legale';
import { NOME, TITOLARE, contatto } from '@/lib/sito';

export const metadata = { title: `Informativa privacy · ${NOME}` };

export default function Privacy() {
  return (
    <Legale titolo="Informativa privacy">
      <p>Questa informativa spiega quali dati personali raccoglie {NOME}, perché li usa, per quanto tempo li conserva e quali diritti hai, ai sensi del Regolamento (UE) 2016/679 (GDPR).</p>

      <h2>Chi tratta i tuoi dati</h2>
      <p>Titolare del trattamento è {TITOLARE}. Per qualsiasi richiesta sui tuoi dati puoi scrivere a {contatto()}.</p>

      <h2>Quali dati raccogliamo</h2>
      <ul>
        <li><b>Dati dell’account:</b> email, password (conservata in forma cifrata), nickname, nome vero se scegli di indicarlo, foto profilo, bio e interessi.</li>
        <li><b>Verifica dell’età:</b> la data di nascita serve solo a controllare che tu abbia almeno 18 anni al momento della registrazione e non viene conservata. Conserviamo la data in cui hai accettato termini e informativa.</li>
        <li><b>Attività sul servizio:</b> tavoli creati o frequentati, ruolo al tavolo, tempo trascorso, messaggi scritti al tavolo e nella chat del pubblico, messaggi privati, persone che segui e che ti seguono, blocchi, notifiche.</li>
        <li><b>Segnalazioni:</b> le segnalazioni che invii o che ti riguardano, con il testo segnalato.</li>
        <li><b>Voce:</b> quando parli a un tavolo la tua voce viene trasmessa in diretta agli altri partecipanti. Non registriamo l’audio.</li>
        <li><b>Notifiche sul telefono:</b> se le attivi, salviamo l’indirizzo tecnico del tuo dispositivo fornito dal browser per poterti avvisare.</li>
        <li><b>Dati tecnici:</b> indirizzo IP e dati di accesso registrati dai nostri fornitori per sicurezza e funzionamento.</li>
      </ul>

      <h2>Perché li usiamo e su quale base</h2>
      <ul>
        <li>Fornirti il servizio: account, tavoli, chat, notifiche (esecuzione del contratto, art. 6.1.b GDPR).</li>
        <li>Tenere il servizio sicuro, gestire segnalazioni e sospensioni, prevenire abusi (legittimo interesse, art. 6.1.f, e obblighi di legge come il Regolamento UE 2022/2065 sui servizi digitali).</li>
        <li>Rispondere a richieste delle autorità quando previsto dalla legge (obbligo legale, art. 6.1.c).</li>
      </ul>
      <p>Non usiamo i tuoi dati per pubblicità, non li vendiamo e non facciamo profilazione commerciale.</p>

      <h2>Chi può vedere cosa</h2>
      <ul>
        <li>Nickname, foto, bio e interessi sono visibili agli utenti registrati.</li>
        <li>Il nome vero è visibile solo ai tuoi follower.</li>
        <li>Con il profilo privato, statistiche e tavoli recenti sono visibili solo ai follower che hai approvato.</li>
        <li>Quello che scrivi o dici a un tavolo è visibile a tutti i presenti; nei tavoli pubblici chiunque può entrare.</li>
      </ul>

      <h2>Fornitori che trattano i dati per nostro conto</h2>
      <ul>
        <li><b>Supabase</b>: database, accesso e archiviazione delle foto, con server nell’Unione europea (Francoforte).</li>
        <li><b>Vercel</b>: ospita il sito; può trattare dati tecnici di navigazione anche fuori dall’UE, con le garanzie delle clausole contrattuali standard.</li>
        <li><b>LiveKit</b>: trasmissione dell’audio dal vivo ai tavoli.</li>
        <li><b>Servizi di invio email e notifiche</b> del tuo browser o sistema operativo (per esempio Google, Apple, Mozilla) per recapitare le notifiche.</li>
      </ul>

      <h2>Per quanto tempo</h2>
      <ul>
        <li>I dati dell’account e i contenuti restano finché non elimini l’account.</li>
        <li>Quando elimini l’account cancelliamo profilo, foto, messaggi, tavoli creati, chat private e relazioni di segui.</li>
        <li>Le segnalazioni gestite vengono conservate fino a 12 mesi per tutelare la sicurezza del servizio.</li>
        <li>I dati tecnici dei fornitori seguono i loro tempi di conservazione, di norma brevi.</li>
      </ul>

      <h2>I tuoi diritti</h2>
      <p>Puoi chiedere accesso, rettifica, cancellazione, limitazione, portabilità dei tuoi dati e opporti al trattamento basato sul legittimo interesse (artt. 15-22 GDPR). Molte modifiche puoi farle da solo nel profilo, dove trovi anche il pulsante per eliminare l’account. Per il resto scrivi a {contatto()}. Hai anche il diritto di presentare reclamo al Garante per la protezione dei dati personali (garanteprivacy.it).</p>

      <h2>Età minima</h2>
      <p>{NOME} è riservato ai maggiori di 18 anni. Se veniamo a sapere che un account appartiene a un minore, lo eliminiamo.</p>
    </Legale>
  );
}
