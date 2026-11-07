import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { GlucoseInsulinFields } from '@/components/glucose-insulin-fields';
import { onDay, parseGlucoseInsulin, saveGlucoseInsulin, toDay, type GlucoseInsulinForm } from '@/lib/diary';
import { t } from '@/lib/i18n';
import { spacing, typography } from '@/theme';

/** Sheet "Inserisci insulina e/o glicemia" del Calendario (solo diabetici), senza pasto. */
export default function GlucoseInsulinSheet() {
  const { day = toDay(new Date()) } = useLocalSearchParams<{ day?: string }>();
  const [form, setForm] = useState<GlucoseInsulinForm>({
    glucose: '',
    measuredAt: new Date(),
    insulin: '',
    administeredAt: new Date(),
  });
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();

  async function save() {
    const { glucose, insulin } = parseGlucoseInsulin(form);
    if (glucose === null) return Alert.alert(t('diary.errors.title'), t('diary.meal.invalidGlucose'));
    if (insulin === null) return Alert.alert(t('diary.errors.title'), t('diary.meal.invalidInsulin'));
    if (glucose === undefined && insulin === undefined) return Alert.alert(t('diary.errors.title'), t('diary.entry.empty'));

    setSaving(true);
    try {
      await saveGlucoseInsulin({
        ...(glucose !== undefined && { glucose_mg_dl: glucose, measured_at: onDay(day, form.measuredAt).toISOString() }),
        ...(insulin !== undefined && {
          insulin_units: insulin,
          administered_at: onDay(day, form.administeredAt).toISOString(),
        }),
      });
      router.back();
    } catch {
      setSaving(false);
      Alert.alert(t('diary.errors.title'), t('authErrors.generic'));
    }
  }

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
      <Text style={styles.title} accessibilityRole="header">
        {t('diary.entry.title')}
      </Text>
      <GlucoseInsulinFields form={form} onChange={setForm} />
      <Button title={t('diary.entry.save')} loading={saving} onPress={save} />
    </ScrollView>
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
});
