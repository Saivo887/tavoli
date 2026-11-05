'use client';
import { useAuth } from '@/components/Providers';
import Landing from '@/components/Landing';
import HomeLoggato from '@/components/HomeLoggato';
import { Caricamento } from '@/components/ui';

export default function Home() {
  const { session } = useAuth();
  if (session === undefined) return <Caricamento />;
  if (!session) return <Landing />;
  return <HomeLoggato />;
}
