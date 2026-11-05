// Letture pubbliche dal server (anteprime dei link, card), senza account.
const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aqhzaevyrhinnzmygvpg.supabase.co';
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_XatfQBnLEX3SHTDYdGXT_A_d1TuQTD0';

export async function rpcPubblica(nome, args = {}) {
  try {
    const r = await fetch(`${URL_SB}/rest/v1/rpc/${nome}`, {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      next: { revalidate: 60 },
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export const SITO = process.env.NEXT_PUBLIC_SITO || 'https://tavoli-orcin.vercel.app';
