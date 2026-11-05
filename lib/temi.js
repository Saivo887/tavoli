export const TEMI = ['Politica', 'Scuola', 'Studio', 'Psicologia', 'Relazioni', 'Altro'];

export const TC = {
  Politica: '#e8505b',
  Scuola: '#f08c1a',
  Studio: '#14a38b',
  Psicologia: '#8b5cf6',
  Relazioni: '#e5489a',
  Altro: '#3b82f6',
  Tutti: '#7a4df2',
};

const ERRORI = {
  tavolo_pieno: 'Il tavolo è pieno.',
  espulso: 'Sei stato espulso da questo tavolo.',
  serve_permesso: 'Per sederti serve il permesso del creatore.',
  tavolo_non_aperto: 'Questo tavolo non è aperto.',
  tavolo_inesistente: 'Questo tavolo non esiste o non puoi vederlo.',
  solo_creatore: 'Solo il creatore può farlo.',
  utente_non_presente: 'Questa persona non è più nel pubblico.',
  pubblico_vuoto: 'Non c’è nessuno nel pubblico da far sedere.',
  bloccato: 'Non puoi seguire questa persona.',
  non_su_te_stesso: 'Non puoi farlo su te stesso.',
  non_autenticato: 'Devi accedere di nuovo.',
  non_sul_creatore: 'Non puoi farlo sul creatore del tavolo.',
  troppi_cogestori: 'Puoi avere al massimo 3 co-gestori.',
  sospeso: 'Il tuo account è sospeso.',
  troppe_segnalazioni: 'Hai inviato troppe segnalazioni in poco tempo. Riprova più tardi.',
  invito_non_valido: 'Il link di invito non è valido.',
  solo_amici: 'Puoi invitare solo i tuoi amici (chi vi seguite a vicenda).',
  espulso_altro: 'Questa persona è stata espulsa dal tavolo.',
  solo_admin: 'Solo l’amministrazione può farlo.',
  non_valido: 'Operazione non valida.',
  eta_minima: 'Per iscriverti devi avere almeno 18 anni.',
  termini_non_accettati: 'Devi accettare i termini e l’informativa privacy.',
  troppi_appuntamenti: 'Puoi avere al massimo 5 appuntamenti fissi attivi.',
  non_al_tavolo: 'Devi essere al tavolo per farlo.',
  non_programmato: 'Questo tavolo non è in programma.',
};

export function messaggioErrore(err) {
  const m = (err && (err.message || String(err))) || '';
  for (const k of Object.keys(ERRORI)) if (m.includes(k)) return ERRORI[k];
  if (m.includes('profili_nickname_key') || (m.includes('duplicate') && m.includes('nickname'))) return 'Questo nickname è già in uso.';
  if (m.includes('Invalid login credentials')) return 'Email o password non corretti.';
  if (m.includes('Email not confirmed')) return 'Devi prima confermare l’email: controlla la posta.';
  if (m.includes('User already registered')) return 'Esiste già un account con questa email.';
  if (m.includes('Password should be')) return 'La password deve avere almeno 6 caratteri.';
  if (m.includes('rate limit')) return 'Troppi tentativi, riprova tra qualche minuto.';
  if (m.includes('Database error saving new user')) return 'Registrazione non riuscita: devi avere almeno 18 anni e accettare i termini.';
  if (m.includes('New password should be different')) return 'La nuova password deve essere diversa da quella vecchia.';
  if (m.includes('row-level security')) return 'Non hai il permesso per farlo.';
  return m || 'Qualcosa non ha funzionato, riprova.';
}

export function quando(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'ora';
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400 && d.getDate() === new Date().getDate()) return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

export function dataProgrammata(iso) {
  const d = new Date(iso);
  const oggi = new Date();
  const dom = new Date(); dom.setDate(oggi.getDate() + 1);
  const ora = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === oggi.toDateString()) return `Oggi · ${ora}`;
  if (d.toDateString() === dom.toDateString()) return `Domani · ${ora}`;
  return `${d.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' })} · ${ora}`;
}
