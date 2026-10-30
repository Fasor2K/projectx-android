import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { BackButton } from '@/components/back-button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { SwitchRow } from '@/components/switch-row';
import { t } from '@/lib/i18n';
import { mealIcons } from '@/lib/meal-icons';
import { mealTypes, saveNotificationSettings, useNotifications } from '@/lib/notifications';
import { colors, radius, spacing, typography } from '@/theme';

/** Promemoria glicemici: interruttore generale e orario per ogni pasto. Solo per i diabetici. */
export default function GlucoseReminders() {
  const { notifications, setNotifications } = useNotifications();

  async function toggle(glucose_reminders: boolean) {
    if (!notifications) return;
    setNotifications({ ...notifications, settings: { ...notifications.settings, glucose_reminders } });
    try {
      setNotifications(await saveNotificationSettings({ glucose_reminders }));
    } catch {
      setNotifications(notifications);
      Alert.alert(t('settings.errors.title'), t('authErrors.generic'));
    }
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <BackButton />
      <View style={styles.header}>
        <Text style={typography.display} accessibilityRole="header">
          {t('reminders.title')}
        </Text>
        <Text style={typography.body}>{t('reminders.subtitle')}</Text>
      </View>

      <Card>
        <SwitchRow
          title={t('reminders.enable')}
          subtitle={t('reminders.enableHint')}
          value={notifications?.settings.glucose_reminders ?? false}
          onValueChange={toggle}
          disabled={!notifications}
        />
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={typography.title}>{t('reminders.mealTimes')}</Text>
        <Text style={typography.caption}>{t('reminders.mealTimesHint')}</Text>
      </View>

      <Card style={styles.list}>
        {mealTypes.map((meal, i) => {
          const reminder = notifications?.glucose_reminders.find((r) => r.meal_type === meal);
          return (
            <Pressable
              key={meal}
              onPress={() => router.push({ pathname: '/settings/reminder-time', params: { meal } })}
              disabled={!notifications}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, i > 0 && styles.divider, pressed && styles.pressed]}>
              <View style={styles.icon}>
                <Icon {...mealIcons[meal]} size={18} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.meal}>{t(`reminders.meals.${meal}`)}</Text>
                <Text style={styles.edit}>{t('reminders.editTime')}</Text>
              </View>
              {/* Un pasto senza riga o con enabled false non ha sveglia. */}
              <Text style={reminder?.enabled ? styles.time : styles.noAlarm}>
                {reminder?.enabled ? reminder.time_of_day : t('reminders.noAlarm')}
              </Text>
            </Pressable>
          );
        })}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  header: {
    gap: spacing.sm,
  },
  sectionHeader: {
    gap: 2,
    marginTop: spacing.sm,
  },
  list: {
    gap: 0,
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  meal: {
    ...typography.label,
    fontSize: 15,
  },
  edit: {
    ...typography.caption,
    color: colors.primary,
  },
  time: {
    ...typography.title,
    fontVariant: ['tabular-nums'],
  },
  noAlarm: {
    ...typography.label,
    fontSize: 15,
    fontWeight: '500',
  },
});
