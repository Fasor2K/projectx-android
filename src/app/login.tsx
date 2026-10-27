import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { authErrorMessage } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';
import { colors, spacing, typography } from '@/theme';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signIn() {
    const email = identifier.trim();
    if (!email || !password) {
      Alert.alert('Dati mancanti', 'Inserisci email e password.');
      return;
    }
    // shortcut: Auth accetta solo l'email; il login col nickname richiede un endpoint che traduca nickname → email.
    if (!email.includes('@')) {
      Alert.alert('Accesso col nickname', "L'accesso con il nickname non è ancora disponibile: usa la tua email.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    // Il successo lo gestisce il layout: la nuova sessione sblocca le schermate protette.
    if (error) Alert.alert('Accesso non riuscito', authErrorMessage(error.code));
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={typography.brand}>Foodity</Text>
        <Text style={[typography.eyebrow, styles.eyebrow]}>BENTORNATO</Text>
        <Text style={typography.display}>Prenditi cura di te, un dato alla volta.</Text>
        <Text style={typography.body}>Accedi al tuo profilo e ritrova subito ricette, persone e il tuo diario</Text>
      </View>

      <Card style={styles.card}>
        <TextField
          label="Email o nickname"
          icon={{ sf: 'person.crop.circle', md: 'account_circle' }}
          placeholder="nome@esempio.it"
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          returnKeyType="next"
        />
        <TextField
          label="Password"
          icon={{ sf: 'lock', md: 'lock' }}
          placeholder="Password"
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
          onPress={() => Alert.alert('Password dimenticata', 'Il recupero della password non è ancora disponibile.')}>
          <Text style={styles.link}>Password dimenticata?</Text>
        </Pressable>
        <Button
          title="Accedi"
          icon={{ sf: 'arrow.right', md: 'arrow_forward' }}
          loading={loading}
          onPress={signIn}
        />
      </Card>

      <Text style={[typography.body, styles.signup]}>
        Non hai ancora un account?{' '}
        <Link href="/register" style={styles.signupLink}>
          Registrati
        </Link>
      </Text>

      <View style={styles.footer}>
        <Icon sf="checkmark.shield" md="verified_user" size={16} tintColor={colors.success} />
        <Text style={typography.caption}>I tuoi dati sanitari restano protetti.</Text>
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
