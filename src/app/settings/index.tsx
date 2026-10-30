import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState, type ComponentProps } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { BackButton } from '@/components/back-button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { SwitchRow } from '@/components/switch-row';
import { t } from '@/lib/i18n';
import { fetchNotifications, saveNotificationSettings, useNotifications, type NotificationSettings } from '@/lib/notifications';
import { deleteAccount, useProfile } from '@/lib/profile';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing, typography } from '@/theme';

const SUPPORT_EMAIL = 'info@foodity.it';

type IconName = Pick<ComponentProps<typeof Icon>, 'sf' | 'md'>;

const toggles = ['recipe_feedback', 'post_comments', 'app_updates'] as const;

export default function Settings() {
  const { profile } = useProfile();
  const { notifications, setNotifications } = useNotifications();
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!notifications) fetchNotifications().then(setNotifications, () => {});
    }, [notifications, setNotifications]),
  );

  // Salvataggio a ogni tocco: l'interruttore cambia subito e torna indietro se il salvataggio fallisce.
  async function toggle(key: keyof NotificationSettings, value: boolean) {
    if (!notifications) return;
    setNotifications({ ...notifications, settings: { ...notifications.settings, [key]: value } });
    try {
      setNotifications(await saveNotificationSettings({ [key]: value }));
    } catch {
      setNotifications(notifications);
      Alert.alert(t('settings.errors.title'), t('authErrors.generic'));
    }
  }

  function confirmDelete() {
    Alert.alert(t('settings.deleteTitle'), t('settings.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.deleteConfirm'),
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteAccount();
            // Il token non è più valido: si chiude solo la sessione locale, il layout torna al login.
            await supabase.auth.signOut({ scope: 'local' });
          } catch {
            setDeleting(false);
            Alert.alert(t('settings.errors.title'), t('authErrors.generic'));
          }
        },
      },
    ]);
  }

  const unavailable = () => Alert.alert(t('settings.unavailableTitle'), t('settings.unavailableMessage'));

  return (
    <Screen contentContainerStyle={styles.content}>
      <BackButton />
      <View style={styles.header}>
        <Text style={typography.display} accessibilityRole="header">
          {t('settings.title')}
        </Text>
        <Text style={typography.body}>{t('settings.subtitle')}</Text>
      </View>

      <NavCard
        icon={{ sf: 'person.badge.key', md: 'manage_accounts' }}
        title={t('settings.account.title')}
        subtitle={t('settings.account.subtitle')}
        href="/settings/account"
      />
      <NavCard
        icon={{ sf: 'person.crop.circle', md: 'account_circle' }}
        title={t('settings.profile.title')}
        subtitle={t('settings.profile.subtitle')}
        href="/profile-setup"
      />

      <Card>
        <SectionHeader
          icon={{ sf: 'bell', md: 'notifications' }}
          title={t('settings.notifications.title')}
          subtitle={t('settings.notifications.subtitle')}
        />
        {toggles.map((key) => (
          <SwitchRow
            key={key}
            title={t(`settings.notifications.${key}.title`)}
            subtitle={t(`settings.notifications.${key}.subtitle`)}
            value={notifications?.settings[key] ?? false}
            onValueChange={(value) => toggle(key, value)}
            disabled={!notifications}
          />
        ))}
        {/* Promemoria glicemici: solo per i diabetici (DATABASE.md, "Tipo di utente"). */}
        {profile?.is_diabetic && (
          <LinkRow
            icon={{ sf: 'alarm', md: 'alarm' }}
            title={t('settings.notifications.reminders.title')}
            subtitle={t('settings.notifications.reminders.subtitle')}
            onPress={() => router.push('/settings/glucose-reminders')}
          />
        )}
      </Card>

      <Card>
        <SectionHeader
          icon={{ sf: 'checkmark.shield', md: 'verified_user' }}
          title={t('settings.legal.title')}
          subtitle={t('settings.legal.subtitle')}
        />
        {/* shortcut: Termini e Privacy non esistono ancora; collegarli quando ci sono i testi. */}
        <LinkRow icon={{ sf: 'doc.text', md: 'description' }} title={t('settings.legal.terms')} onPress={unavailable} />
        <LinkRow icon={{ sf: 'hand.raised', md: 'privacy_tip' }} title={t('settings.legal.privacy')} onPress={unavailable} />
      </Card>

      <Card>
        <SectionHeader
          icon={{ sf: 'questionmark.circle', md: 'help' }}
          title={t('settings.support.title')}
          subtitle={t('settings.support.subtitle')}
        />
        <Text style={typography.label}>{t('settings.support.faqLabel')}</Text>
        <LinkRow
          icon={{ sf: 'questionmark.bubble', md: 'quiz' }}
          title={t('settings.support.faq')}
          onPress={() => router.push('/settings/faq')}
        />
        <Text style={typography.label}>{t('settings.support.contactLabel')}</Text>
        <LinkRow
          icon={{ sf: 'envelope', md: 'mail' }}
          title={SUPPORT_EMAIL}
          onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {})}
        />
      </Card>

      <View style={styles.footer}>
        <Text style={typography.body}>
          {t('settings.deletePrompt')}{' '}
          <Text style={styles.delete} onPress={deleting ? undefined : confirmDelete} accessibilityRole="button">
            {t('settings.deleteLink')}
          </Text>
        </Text>
        <Pressable onPress={() => supabase.auth.signOut()} accessibilityRole="button" hitSlop={spacing.sm}>
          <Text style={styles.signOut}>{t('settings.signOut')}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

/** Card che apre una sottoschermata. */
function NavCard({ icon, title, subtitle, href }: { icon: IconName; title: string; subtitle: string; href: Href }) {
  return (
    <Pressable onPress={() => router.push(href)} accessibilityRole="button" accessibilityLabel={title}>
      {({ pressed }) => (
        <Card style={[styles.navCard, pressed && styles.pressed]}>
          <View style={styles.navCardText}>
            <SectionHeader icon={icon} title={title} subtitle={subtitle} />
          </View>
          <Icon sf="chevron.right" md="chevron_right" size={16} tintColor={colors.textMuted} />
        </Card>
      )}
    </Pressable>
  );
}

/** Riga con bordo dentro una Card, con freccia. */
function LinkRow({ icon, title, subtitle, onPress }: { icon: IconName; title: string; subtitle?: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}>
      <Icon {...icon} size={18} />
      <View style={styles.linkText}>
        <Text style={styles.linkTitle}>{title}</Text>
        {subtitle && <Text style={typography.caption}>{subtitle}</Text>}
      </View>
      <Icon sf="chevron.right" md="chevron_right" size={16} tintColor={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  header: {
    gap: spacing.sm,
  },
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  navCardText: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkText: {
    flex: 1,
    gap: 2,
  },
  linkTitle: {
    ...typography.label,
    fontSize: 15,
    fontWeight: '500',
  },
  footer: {
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  delete: {
    color: colors.danger,
    fontWeight: '700',
  },
  signOut: {
    ...typography.label,
    fontSize: 15,
    color: colors.primary,
  },
});
