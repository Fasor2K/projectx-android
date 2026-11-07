import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { DateTimeField } from '@/components/date-time-field';
import { SegmentedControl } from '@/components/segmented-control';
import { fetchDiary, toDay } from '@/lib/diary';
import { shareDiary, type ExportFormat } from '@/lib/diary-export';
import { t } from '@/lib/i18n';
import { spacing, typography } from '@/theme';

const formats: ExportFormat[] = ['pdf', 'csv', 'ods'];
const DAY_MS = 86_400_000;
// = limite di get-diary.
const MAX_DAYS = 366;

/** Sheet "Esporta dati": periodo e formato, poi il file va al foglio di condivisione di sistema. */
export default function DiaryExport() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * DAY_MS));
  const [to, setTo] = useState(() => new Date());
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [exporting, setExporting] = useState(false);
  const insets = useSafeAreaInsets();

  async function exportData() {
    const fromDay = toDay(from);
    const toDayValue = toDay(to);
    const days = Math.round((Date.parse(toDayValue) - Date.parse(fromDay)) / DAY_MS) + 1;
    if (days < 1 || days > MAX_DAYS) return Alert.alert(t('diary.errors.title'), t('diary.exportSheet.invalidRange'));
    if (!(await Sharing.isAvailableAsync())) {
      return Alert.alert(t('diary.errors.title'), t('diary.exportSheet.unavailable'));
    }

    setExporting(true);
    try {
      const { entries } = await fetchDiary(fromDay, toDayValue);
      await shareDiary(entries, fromDay, toDayValue, format);
      router.back();
    } catch {
      setExporting(false);
      Alert.alert(t('diary.errors.title'), t('authErrors.generic'));
    }
  }

  return (
    <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
      <Text style={styles.title} accessibilityRole="header">
        {t('diary.exportSheet.title')}
      </Text>

      <Card>
        <Text style={typography.title}>{t('diary.exportSheet.period')}</Text>
        <DateTimeField label={t('diary.exportSheet.from')} mode="date" value={from} maximumDate={to} onChange={setFrom} />
        <DateTimeField
          label={t('diary.exportSheet.to')}
          mode="date"
          value={to}
          minimumDate={from}
          maximumDate={new Date()}
          onChange={setTo}
        />
      </Card>

      <Card>
        <Text style={typography.title}>{t('diary.exportSheet.format')}</Text>
        <SegmentedControl options={formats} value={format} onChange={setFormat} label={(f) => `.${f}`} />
      </Card>

      <Button title={t('diary.exportSheet.export')} loading={exporting} onPress={exportData} />
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
});
