import type { Session } from '@supabase/supabase-js';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export default function RootLayout() {
  // undefined = session not read from storage yet.
  const [session, setSession] = useState<Session | null>();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;

  // ThemeProvider avoids the white flash when switching native tabs on iOS 26.
  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
        </Stack.Protected>
        <Stack.Screen name="auth-callback" />
      </Stack>
    </ThemeProvider>
  );
}
