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
      Alert.alert('Controlla i dati', error);
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
      Alert.alert('Registrazione non riuscita', authErrorMessage(authError.code));
      return;
    }
    Alert.alert(
      'Controlla la tua email',
      `Ti abbiamo inviato un link a ${email.trim()}: aprilo per confermare l'account.`,
      [{ text: 'OK', onPress: () => router.back() }],
    );
  }

  function validate() {
    if (!nickname.trim()) return 'Scegli un nickname.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Inserisci un indirizzo email valido.';
    if (password.length < MIN_PASSWORD_LENGTH) return `La password deve avere almeno ${MIN_PASSWORD_LENGTH} caratteri.`;
    if (password !== confirm) return 'Le password non coincidono.';
    if (!termsAccepted) return 'Per continuare accetta i Termini di servizio.';
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Indietro" hitSlop={spacing.sm}>
        <GlassSurface interactive style={styles.back}>
          <Icon sf="chevron.left" md="arrow_back" tintColor={colors.text} />
        </GlassSurface>
      </Pressable>

      <Text style={[typography.display, styles.title]} accessibilityRole="header">
        Registrazione
      </Text>

      <Card>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Icon sf="person.badge.plus" md="person_add" />
          </View>
          <View style={styles.sectionText}>
            <Text style={typography.title}>Il tuo account</Text>
            <Text style={typography.caption}>Le credenziali che userai per accedere.</Text>
          </View>
        </View>
        <TextField
          label="Nickname"
          icon={{ sf: 'person', md: 'person' }}
          placeholder="Scegli un nickname"
          hint="Sarà il nome mostrato nella community."
          value={nickname}
          onChangeText={setNickname}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username-new"
          textContentType="nickname"
        />
        <TextField
          label="Email"
          icon={{ sf: 'envelope', md: 'mail' }}
          placeholder="nome@esempio.it"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
        />
        <TextField
          label="Password"
          icon={{ sf: 'lock', md: 'lock' }}
          placeholder={`Almeno ${MIN_PASSWORD_LENGTH} caratteri`}
          secure
          value={password}
          onChangeText={setPassword}
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <TextField
          label="Conferma password"
          icon={{ sf: 'person.badge.key', md: 'how_to_reg' }}
          placeholder="Ripeti la password"
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
            Accetto i <Text style={styles.termsLink}>Termini di servizio</Text> e confermo di aver letto
            l&apos;<Text style={styles.termsLink}>Informativa sulla privacy</Text>.
          </Text>
          <Switch
            value={termsAccepted}
            onValueChange={setTermsAccepted}
            trackColor={{ true: colors.primary }}
            accessibilityLabel="Accetto i Termini di servizio e l'Informativa sulla privacy"
          />
        </View>
        <Text style={typography.caption}>
          Foodity supporta la gestione quotidiana, ma non sostituisce il parere del medico.
        </Text>
      </Card>

      <Button title="Conferma" loading={loading} onPress={signUp} style={styles.submit} />
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
