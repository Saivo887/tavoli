'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthCtx = createContext(null);
const ToastCtx = createContext(() => {});

export function useAuth() { return useContext(AuthCtx); }
export function useToast() { return useContext(ToastCtx); }

export default function Providers({ children }) {
  const [session, setSession] = useState(undefined);
  const [profilo, setProfilo] = useState(null);
  const [toast, setToast] = useState(null);
  const timer = useRef();

  const caricaProfilo = useCallback(async (uid) => {
    if (!uid) { setProfilo(null); return; }
    const { data } = await supabase.from('profili').select('*').eq('id', uid).maybeSingle();
    setProfilo(data || null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
      caricaProfilo(data.session?.user?.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s || null);
      caricaProfilo(s?.user?.id);
    });
    return () => sub.subscription.unsubscribe();
  }, [caricaProfilo]);

  const mostra = useCallback((msg) => {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  const value = {
    session,
    user: session?.user || null,
    profilo,
    ricaricaProfilo: () => caricaProfilo(session?.user?.id),
  };

  return (
    <AuthCtx.Provider value={value}>
      <ToastCtx.Provider value={mostra}>
        {children}
        {toast && <div className="toast" role="status">{toast}</div>}
      </ToastCtx.Provider>
    </AuthCtx.Provider>
  );
}
