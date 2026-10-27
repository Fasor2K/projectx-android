import { useLinkingURL } from 'expo-linking';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';

/**
 * Atterraggio del link di conferma email (`site_url` in config.toml): Auth mette i token
 * nel frammento dell'URL, qui diventano la sessione dell'app.
 */
export default function AuthCallback() {
  const url = useLinkingURL();
  const params = new URLSearchParams(url?.split('#')[1] ?? '');
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  const hasTokens = !!access_token && !!refresh_token;
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!access_token || !refresh_token) return;
    supabase.auth.setSession({ access_token, refresh_token }).finally(() => setDone(true));
  }, [access_token, refresh_token]);

  // Senza token (link scaduto o già usato) si torna all'app: il login resta disponibile.
  if (url && (done || !hasTokens)) return <Redirect href="/" />;
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
