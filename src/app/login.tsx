import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { authErrorMessage } from '@/lib/auth-errors';
import { t } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { colors, spacing, typography } from '@/theme';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signIn() {
    if (!email.trim() || !password) {
      Alert.alert(t('login.missingDataTitle'), t('login.missingDataMessage'));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    // Il successo lo gestisce il layout: la nuova sessione sblocca le schermate protette.
    if (error) Alert.alert(t('login.failedTitle'), authErrorMessage(error.code));
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={typography.brand}>Foodity</Text>
        <Text style={[typography.eyebrow, styles.eyebrow]}>{t('login.eyebrow')}</Text>
        <Text style={typography.display}>{t('login.title')}</Text>
        <Text style={typography.body}>{t('login.subtitle')}</Text>
      </View>

      <Card style={styles.card}>
        <TextField
          label={t('login.emailLabel')}
          icon={{ sf: 'envelope', md: 'mail' }}
          placeholder={t('login.emailPlaceholder')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <TextField
          label={t('login.passwordLabel')}
          icon={{ sf: 'lock', md: 'lock' }}
          placeholder={t('login.passwordPlaceholder')}
          secure
          value={password}
          onChangeText={setPassword}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={signIn}
        />
        <Pressable
          style={styles.forgot}
          hitSlop={spacing.sm}
          accessibilityRole="link"
          onPress={() => Alert.alert(t('login.forgotPassword'), t('login.forgotPasswordUnavailable'))}>
          <Text style={styles.link}>{t('login.forgotPassword')}</Text>
        </Pressable>
        <Button
          title={t('login.submit')}
          icon={{ sf: 'arrow.right', md: 'arrow_forward' }}
          loading={loading}
          onPress={signIn}
        />
      </Card>

      <Text style={[typography.body, styles.signup]}>
        {t('login.noAccount')}{' '}
        <Link href="/register" style={styles.signupLink}>
          {t('login.signUp')}
        </Link>
      </Text>

      <View style={styles.footer}>
        <Icon sf="checkmark.shield" md="verified_user" size={16} tintColor={colors.success} />
        <Text style={typography.caption}>{t('login.dataProtected')}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
  },
  header: {
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  eyebrow: {
    marginTop: spacing.xl,
  },
  card: {
    gap: spacing.lg,
  },
  forgot: {
    alignSelf: 'flex-end',
  },
  link: {
    fontSize: 14,
    color: colors.primary,
  },
  signup: {
    textAlign: 'center',
  },
  signupLink: {
    fontWeight: '700',
    color: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: 'auto',
  },
});
