import type { Session } from '@supabase/supabase-js';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { t } from '@/lib/i18n';
import { fetchProfile, ProfileContext, type Profile } from '@/lib/profile';
import { supabase } from '@/lib/supabase';
import { backgroundGradient, colors, spacing, typography } from '@/theme';

export default function RootLayout() {
  // undefined = session not read from storage yet.
  const [session, setSession] = useState<Session | null>();
  // Profile of the logged-in user: undefined = not loaded yet, null = registration to complete (no row in users).
  const [loaded, setLoaded] = useState<{ userId: string; profile: Profile | null }>();
  const [failedFor, setFailedFor] = useState<string>();
  const userId = session?.user.id;
  const profile = userId && loaded?.userId === userId ? loaded.profile : undefined;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (userId) loadProfile(userId);
  }, [userId]);

  function loadProfile(id: string) {
    fetchProfile().then(
      (next) => setLoaded({ userId: id, profile: next }),
      () => setFailedFor(id),
    );
  }

  if (session === undefined) return null;
  if (userId && profile === undefined) {
    return (
      <View style={styles.center}>
        {failedFor === userId ? (
          <>
            <Text style={[typography.body, styles.message]}>{t('profile.loadFailed')}</Text>
            <Button
              title={t('common.retry')}
              onPress={() => {
                setFailedFor(undefined);
                loadProfile(userId!);
              }}
            />
          </>
        ) : (
          <ActivityIndicator color={colors.primary} />
        )}
      </View>
    );
  }

  // ThemeProvider avoids the white flash when switching native tabs on iOS 26.
  // Screen order matters: a logged-in user without a completed profile lands on profile-setup.
  return (
    <ProfileContext.Provider value={{ profile, setProfile: (next) => setLoaded({ userId: userId!, profile: next }) }}>
      <ThemeProvider value={DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!!profile?.onboarding_completed_at}>
            <Stack.Screen name="(tabs)" />
          </Stack.Protected>
          {/* Also reachable later from Settings, to edit the profile. */}
          <Stack.Protected guard={!!session}>
            <Stack.Screen name="profile-setup" />
          </Stack.Protected>
          <Stack.Protected guard={!session}>
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
          </Stack.Protected>
          <Stack.Screen name="auth-callback" />
        </Stack>
      </ThemeProvider>
    </ProfileContext.Provider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
    backgroundImage: backgroundGradient,
  },
  message: {
    textAlign: 'center',
  },
});
