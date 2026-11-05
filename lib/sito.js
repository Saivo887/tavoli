// Dati generali del sito: cambiali qui quando avrai nome e contatti definitivi.
export const NOME = 'Tavoli';
export const TITOLARE = 'Salvatore Faraci';
export const EMAIL_CONTATTO = ''; // es. 'info@tuodominio.it' — finché è vuota le pagine mostrano "da definire"
export const AGGIORNAMENTO_LEGALE = '5 novembre 2026';

// Chiave pubblica per le notifiche sul telefono (la privata è solo sul server)
export const VAPID_PUBBLICA = 'BLd0NyQ8B6NHql4GN0XmLAwVkIPefBQFqekerDQ5XvNRw5WfGA_Iaa9Yz7IQ53_q5cP8pHrNcusvtp4bM4-zaxM';

export function contatto() {
  return EMAIL_CONTATTO || '[email di contatto da definire]';
}
