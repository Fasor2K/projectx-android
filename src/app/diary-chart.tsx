import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BackButtonSpace } from '@/components/back-button';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { GlucoseChart, NutritionSummary } from '@/components/diary-summary';
import { Screen } from '@/components/screen';
import { fetchDiary, type Diary } from '@/lib/diary';
import { t } from '@/lib/i18n';
import { useProfile } from '@/lib/profile';
import { colors, spacing, typography } from '@/theme';

/** Diario · Grafico: riepilogo nutrizionale e glicemie del giorno sull'asse delle 24 ore. */
export default function DiaryChart() {
  const { day } = useLocalSearchParams<{ day: string }>();
  const profile = useProfile().profile;
  const [diary, setDiary] = useState<Diary>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    let stale = false;
    fetchDiary(day).then(
      (next) => !stale && setDiary(next),
      () => !stale && setFailed(true),
    );
    return () => {
      stale = true;
    };
  }, [day, attempt]);

  const readings = diary?.entries.filter((e) => e.kind === 'glucose') ?? [];
  const min = profile?.glucose_min_mg_dl ?? null;
  const max = profile?.glucose_max_mg_dl ?? null;

  return (
    <Screen back contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <BackButtonSpace />
        <Text style={styles.title} accessibilityRole="header">
          {t('diary.chart.title')}
        </Text>
      </View>

      {failed ? (
        <>
          <Text style={styles.message}>{t('diary.loadFailed')}</Text>
          <Button
            title={t('common.retry')}
            onPress={() => {
              setFailed(false);
              setAttempt(attempt + 1);
            }}
          />
        </>
      ) : !diary ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <>
          <NutritionSummary nutrition={diary.summary} />
          <Card>
            <Text style={styles.cardTitle}>
              {diary.summary.glucose_avg_mg_dl === null
                ? t('diary.chart.noGlucose')
                : t('diary.chart.glucoseAvg', { value: diary.summary.glucose_avg_mg_dl })}
            </Text>
            <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
              {width > 0 && <GlucoseChart readings={readings} min={min} max={max} width={width} />}
            </View>
            {min !== null && max !== null && <Text style={typography.caption}>{t('diary.chart.range', { min, max })}</Text>}
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    ...typography.display,
    fontWeight: '700',
  },
  cardTitle: {
    ...typography.title,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    textAlign: 'center',
  },
});
