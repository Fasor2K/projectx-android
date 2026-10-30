import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { t } from '@/lib/i18n';
import { mealIcons } from '@/lib/meal-icons';
import { defaultReminderTime, mealTypes, saveGlucoseReminder, useNotifications, type MealType } from '@/lib/notifications';
import { colors, radius, spacing, typography } from '@/theme';

const toDate = (time: string) => {
  const date = new Date();
  date.setHours(Number(time.slice(0, 2)), Number(time.slice(3, 5)), 0, 0);
  return date;
};
const toTime = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

/** Sheet "Modifica orario" di un pasto, aperto da Promemoria glicemici. */
export default function ReminderTime() {
  const { meal: param } = useLocalSearchParams<{ meal: string }>();
  const meal: MealType = mealTypes.find((m) => m === param) ?? 'breakfast';
  const { notifications, setNotifications } = useNotifications();
  const reminder = notifications?.glucose_reminders.find((r) => r.meal_type === meal);
  const [time, setTime] = useState(reminder?.time_of_day ?? defaultReminderTime[meal]);
  // Interruttore acceso = notifica attiva; acceso anche per un pasto mai configurato.
  const [enabled, setEnabled] = useState(reminder?.enabled ?? true);
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();

  async function confirm() {
    if (!notifications) return;
    setSaving(true);
    try {
      const saved = await saveGlucoseReminder({ meal_type: meal, time_of_day: time, enabled });
      setNotifications({
        ...notifications,
        glucose_reminders: [...notifications.glucose_reminders.filter((r) => r.meal_type !== meal), saved],
      });
      router.back();
    } catch {
      setSaving(false);
      Alert.alert(t('settings.errors.title'), t('authErrors.generic'));
    }
  }

  return (
    <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
      <Text style={styles.title} accessibilityRole="header">
        {t('reminders.sheetTitle')}
      </Text>

      <View style={styles.meal}>
        <View style={styles.icon}>
          <Icon {...mealIcons[meal]} size={18} />
        </View>
        <View style={styles.mealText}>
          <Text style={typography.title}>{t(`reminders.meals.${meal}`)}</Text>
          <Text style={typography.caption}>{t('reminders.repeat')}</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={setEnabled}
          trackColor={{ true: colors.primary }}
          accessibilityLabel={t('reminders.enable')}
        />
      </View>

      {enabled &&
        (Platform.OS === 'ios' ? (
          <DateTimePicker
            value={toDate(time)}
            mode="time"
            display="spinner"
            onValueChange={(_, date) => setTime(toTime(date))}
            style={styles.picker}
          />
        ) : (
          // Android non ha una ruota inline: il tocco apre il selettore orario di sistema.
          <Pressable
            onPress={() =>
              DateTimePickerAndroid.open({
                value: toDate(time),
                mode: 'time',
                is24Hour: true,
                onValueChange: (_, date) => setTime(toTime(date)),
              })
            }
            accessibilityRole="button"
            accessibilityLabel={t('reminders.editTime')}
            style={styles.androidTime}>
            <Text style={styles.androidTimeText}>{time}</Text>
          </Pressable>
        ))}

      <Button title={t('reminders.confirm')} loading={saving} onPress={confirm} style={styles.confirm} />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    gap: spacing.lg,
    padding: spacing.xl,
  },
  title: {
    ...typography.title,
    textAlign: 'center',
  },
  meal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  mealText: {
    flex: 1,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  picker: {
    alignSelf: 'center',
  },
  androidTime: {
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  androidTimeText: {
    fontSize: 34,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  confirm: {
    borderRadius: radius.pill,
  },
});
