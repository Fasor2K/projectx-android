import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { confirmMealTime } from '@/lib/diary';
import { t } from '@/lib/i18n';
import { radius, spacing, typography } from '@/theme';

/** Sheet "Modifica orario" della glicemia in Componi pasto (solo iOS: su Android si apre il dialog di sistema). */
export default function MealTime() {
  const params = useLocalSearchParams<{ value?: string }>();
  const [value, setValue] = useState(() => (params.value ? new Date(params.value) : new Date()));
  const insets = useSafeAreaInsets();

  function confirm() {
    confirmMealTime(value);
    router.back();
  }

  return (
    <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
      <Text style={styles.title} accessibilityRole="header">
        {t('diary.meal.editTime')}
      </Text>
      <Text style={styles.subtitle}>{t('diary.meal.editTimeHint')}</Text>
      <DateTimePicker
        value={value}
        mode="time"
        display="spinner"
        onValueChange={(_, date) => setValue(date)}
        style={styles.picker}
      />
      <Button title={t('diary.item.confirm')} onPress={confirm} style={styles.confirm} />
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
  subtitle: {
    ...typography.caption,
    textAlign: 'center',
  },
  picker: {
    alignSelf: 'center',
  },
  confirm: {
    borderRadius: radius.pill,
  },
});
