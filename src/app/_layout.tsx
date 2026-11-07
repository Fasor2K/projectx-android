import type { Session } from '@supabase/supabase-js';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { t } from '@/lib/i18n';
import { fetchProfile, ProfileContext, type Profile } from '@/lib/profile';
import { SearchFiltersContext } from '@/lib/search';
import { supabase } from '@/lib/supabase';
import { backgroundGradient, colors, spacing, typography } from '@/theme';

export default function RootLayout() {
  // undefined = session not read from storage yet.
  const [session, setSession] = useState<Session | null>();
  // Profile of the logged-in user: undefined = not loaded yet, null = registration to complete (no row in users).
  const [loaded, setLoaded] = useState<{ userId: string; profile: Profile | null }>();
  const [failedFor, setFailedFor] = useState<string>();
  const [searchTags, setSearchTags] = useState<string[]>([]);
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
  // Every guard has an explicit redirectTo: the default fallback is the first unguarded route in
  // expo-router's own order (not this one), e.g. auth-callback, which redirects back to "/" and loops.
  return (
    <ProfileContext.Provider value={{ profile, setProfile: (next) => setLoaded({ userId: userId!, profile: next }) }}>
      <SearchFiltersContext.Provider value={{ tags: searchTags, setTags: setSearchTags }}>
        <ThemeProvider value={DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={!!profile?.onboarding_completed_at} redirectTo={session ? '/profile-setup' : '/login'}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="settings" />
              <Stack.Screen
                name="search-filters"
                options={{ presentation: 'formSheet', sheetAllowedDetents: [0.9], sheetGrabberVisible: true }}
              />
              <Stack.Screen name="scanner" options={{ presentation: 'fullScreenModal' }} />
              <Stack.Screen name="calendar" />
              <Stack.Screen name="diary-chart" />
              <Stack.Screen name="meal" />
              <Stack.Screen
                name="meal-item"
                options={{ presentation: 'formSheet', sheetAllowedDetents: 'fitToContents', sheetGrabberVisible: true }}
              />
              <Stack.Screen
                name="glucose-insulin"
                options={{ presentation: 'formSheet', sheetAllowedDetents: [0.75], sheetGrabberVisible: true }}
              />
              <Stack.Screen
                name="diary-export"
                options={{ presentation: 'formSheet', sheetAllowedDetents: 'fitToContents', sheetGrabberVisible: true }}
              />
              <Stack.Screen
                name="scanned-product"
                options={{ presentation: 'formSheet', sheetAllowedDetents: [0.6], sheetGrabberVisible: true }}
              />
            </Stack.Protected>
            {/* Also reachable later from Settings, to edit the profile. */}
            <Stack.Protected guard={!!session} redirectTo="/login">
              <Stack.Screen name="profile-setup" />
            </Stack.Protected>
            <Stack.Protected guard={!session} redirectTo="/">
              <Stack.Screen name="login" />
              <Stack.Screen name="register" />
            </Stack.Protected>
            <Stack.Screen name="auth-callback" />
          </Stack>
        </ThemeProvider>
      </SearchFiltersContext.Provider>
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
