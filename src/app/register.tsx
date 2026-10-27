import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { GlassSurface } from '@/components/glass-surface';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { authErrorMessage } from '@/lib/auth-errors';
import { t } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing, typography } from '@/theme';

const MIN_PASSWORD_LENGTH = 8; // = minimum_password_length in supabase/config.toml

export default function Register() {
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function signUp() {
    const error = validate();
    if (error) {
      Alert.alert(t('register.checkDataTitle'), error);
      return;
    }
    setLoading(true);
    // Il profilo in `users` nasce dopo la conferma dell'email (DATABASE.md, "Autenticazione"):
    // intanto nickname e accettazione dei termini restano nei metadati di Auth.
    const { error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: 'foodity://auth-callback',
        data: { nickname: nickname.trim(), terms_accepted_at: new Date().toISOString() },
      },
    });
    setLoading(false);
    if (authError) {
      Alert.alert(t('register.failedTitle'), authErrorMessage(authError.code));
      return;
    }
    Alert.alert(
      t('register.checkEmailTitle'),
      t('register.checkEmailMessage', { email: email.trim() }),
      [{ text: t('common.ok'), onPress: () => router.back() }],
    );
  }

  function validate() {
    if (!nickname.trim()) return t('register.errors.nickname');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return t('register.errors.email');
    if (password.length < MIN_PASSWORD_LENGTH) return t('register.errors.passwordLength', { min: MIN_PASSWORD_LENGTH });
    if (password !== confirm) return t('register.errors.passwordMismatch');
    if (!termsAccepted) return t('register.errors.terms');
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('common.back')} hitSlop={spacing.sm}>
        <GlassSurface interactive style={styles.back}>
          <Icon sf="chevron.left" md="arrow_back" tintColor={colors.text} />
        </GlassSurface>
      </Pressable>

      <Text style={[typography.display, styles.title]} accessibilityRole="header">
        {t('register.title')}
      </Text>

      <Card>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Icon sf="person.badge.plus" md="person_add" />
          </View>
          <View style={styles.sectionText}>
            <Text style={typography.title}>{t('register.accountTitle')}</Text>
            <Text style={typography.caption}>{t('register.accountSubtitle')}</Text>
          </View>
        </View>
        <TextField
          label={t('register.nicknameLabel')}
          icon={{ sf: 'person', md: 'person' }}
          placeholder={t('register.nicknamePlaceholder')}
          hint={t('register.nicknameHint')}
          value={nickname}
          onChangeText={setNickname}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username-new"
          textContentType="nickname"
        />
        <TextField
          label={t('register.emailLabel')}
          icon={{ sf: 'envelope', md: 'mail' }}
          placeholder={t('login.emailPlaceholder')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
        />
        <TextField
          label={t('register.passwordLabel')}
          icon={{ sf: 'lock', md: 'lock' }}
          placeholder={t('register.passwordPlaceholder', { min: MIN_PASSWORD_LENGTH })}
          secure
          value={password}
          onChangeText={setPassword}
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <TextField
          label={t('register.confirmLabel')}
          icon={{ sf: 'person.badge.key', md: 'how_to_reg' }}
          placeholder={t('register.confirmPlaceholder')}
          secure
          value={confirm}
          onChangeText={setConfirm}
          autoComplete="new-password"
          textContentType="newPassword"
        />
      </Card>

      <Card>
        <View style={styles.terms}>
          <Text style={[typography.caption, styles.termsText]}>
            {t('register.termsPrefix')}
            <Text style={styles.termsLink}>{t('register.termsOfService')}</Text>
            {t('register.termsMiddle')}
            <Text style={styles.termsLink}>{t('register.privacyPolicy')}</Text>
            {t('register.termsSuffix')}
          </Text>
          <Switch
            value={termsAccepted}
            onValueChange={setTermsAccepted}
            trackColor={{ true: colors.primary }}
            accessibilityLabel={t('register.termsA11y')}
          />
        </View>
        <Text style={typography.caption}>
          {t('register.disclaimer')}
        </Text>
      </Card>

      <Button title={t('register.submit')} loading={loading} onPress={signUp} style={styles.submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginVertical: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  sectionText: {
    flex: 1,
    gap: 2,
  },
  terms: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  termsLink: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  submit: {
    alignSelf: 'flex-end',
    borderRadius: radius.pill,
  },
});
