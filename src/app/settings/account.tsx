import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { BackButton } from '@/components/back-button';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { TextField } from '@/components/text-field';
import { authErrorMessage } from '@/lib/auth-errors';
import { t } from '@/lib/i18n';
import { ApiError, updateNickname, useProfile } from '@/lib/profile';
import { supabase } from '@/lib/supabase';
import { radius, spacing, typography } from '@/theme';

const MIN_PASSWORD_LENGTH = 8; // = minimum_password_length in supabase/config.toml
const NICKNAME = /^\S{3,30}$/; // = NICKNAME in projectx-be/supabase/functions/update-nickname

/** "Il tuo account": cambio di nickname (update-nickname) e password (Supabase Auth). */
export default function Account() {
  const { profile, setProfile } = useProfile();
  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const [savingNickname, setSavingNickname] = useState(false);
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  async function saveNickname() {
    if (!NICKNAME.test(nickname.trim())) {
      return Alert.alert(t('register.checkDataTitle'), t('account.errors.nickname'));
    }
    setSavingNickname(true);
    try {
      setProfile(await updateNickname(nickname.trim()));
      Alert.alert(t('account.nicknameSaved'));
    } catch (e) {
      const taken = e instanceof ApiError && e.code === 'nickname_taken';
      Alert.alert(t('account.errors.title'), t(taken ? 'account.errors.nicknameTaken' : 'authErrors.generic'));
    } finally {
      setSavingNickname(false);
    }
  }

  async function savePassword() {
    const error = !current
      ? t('account.errors.currentPassword')
      : password.length < MIN_PASSWORD_LENGTH
        ? t('register.errors.passwordLength', { min: MIN_PASSWORD_LENGTH })
        : password !== confirm
          ? t('register.errors.passwordMismatch')
          : undefined;
    if (error) return Alert.alert(t('register.checkDataTitle'), error);

    setSavingPassword(true);
    const { data } = await supabase.auth.getUser();
    // Auth non chiede la password attuale (secure_password_change = false): la verifica l'app con un nuovo accesso.
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: data.user?.email ?? '', password: current });
    if (signInError) {
      setSavingPassword(false);
      const wrong = signInError.code === 'invalid_credentials';
      return Alert.alert(t('account.errors.title'), wrong ? t('account.errors.wrongPassword') : authErrorMessage(signInError.code));
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSavingPassword(false);
    if (updateError) return Alert.alert(t('account.errors.title'), authErrorMessage(updateError.code));
    setCurrent('');
    setPassword('');
    setConfirm('');
    Alert.alert(t('account.passwordSaved'));
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <BackButton />

      <Text style={[typography.display, styles.title]} accessibilityRole="header">
        {t('account.title')}
      </Text>

      <Card>
        <SectionHeader
          icon={{ sf: 'person', md: 'person' }}
          title={t('account.nicknameTitle')}
          subtitle={t('register.nicknameHint')}
        />
        <TextField
          label={t('register.nicknameLabel')}
          icon={{ sf: 'person', md: 'person' }}
          placeholder={t('register.nicknamePlaceholder')}
          value={nickname}
          onChangeText={setNickname}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username-new"
          textContentType="nickname"
          maxLength={30}
        />
        <Button
          title={t('account.saveNickname')}
          loading={savingNickname}
          disabled={nickname.trim() === profile?.nickname}
          onPress={saveNickname}
          style={styles.submit}
        />
      </Card>

      <Card>
        <SectionHeader
          icon={{ sf: 'lock', md: 'lock' }}
          title={t('account.passwordTitle')}
          subtitle={t('account.passwordSubtitle')}
        />
        <TextField
          label={t('account.currentPasswordLabel')}
          icon={{ sf: 'lock', md: 'lock' }}
          placeholder={t('login.passwordPlaceholder')}
          secure
          value={current}
          onChangeText={setCurrent}
          autoComplete="current-password"
          textContentType="password"
        />
        <TextField
          label={t('account.newPasswordLabel')}
          icon={{ sf: 'lock.rotation', md: 'lock_reset' }}
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
        <Button title={t('account.savePassword')} loading={savingPassword} onPress={savePassword} style={styles.submit} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  title: {
    marginVertical: spacing.sm,
  },
  submit: {
    alignSelf: 'flex-end',
    borderRadius: radius.pill,
  },
});
