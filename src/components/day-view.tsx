import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { DaySummary, NutritionSummary } from '@/components/diary-summary';
import { DiaryEntryRow } from '@/components/diary-entry';
import { fetchDiary, type Diary } from '@/lib/diary';
import { t } from '@/lib/i18n';
import { useProfile } from '@/lib/profile';
import { colors, radius, spacing, typography } from '@/theme';

/** Riepilogo e timeline di un giorno del diario (Diario e Calendario), ricaricati a ogni ritorno sulla schermata. */
export function DayView({ day }: { day: string }) {
  const diabetic = !!useProfile().profile?.is_diabetic;
  const [loaded, setLoaded] = useState<{ day: string; diary?: Diary; failed?: boolean }>();
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState(0);
  const [width, setWidth] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let stale = false;
      fetchDiary(day).then(
        (diary) => !stale && setLoaded({ day, diary }),
        () => !stale && setLoaded({ day, failed: true }),
      );
      return () => {
        stale = true;
      };
      // attempt rilancia il caricamento dopo "Riprova".
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [day, attempt]),
  );

  const current = loaded?.day === day ? loaded : undefined;
  if (!current) return <ActivityIndicator color={colors.primary} style={styles.loading} />;
  if (current.failed || !current.diary) {
    return (
      <View style={styles.failed}>
        <Text style={styles.message}>{t('diary.loadFailed')}</Text>
        <Button title={t('common.retry')} onPress={() => setAttempt(attempt + 1)} />
      </View>
    );
  }

  const { entries, summary } = current.diary;
  const openChart = () => router.push({ pathname: '/diary-chart', params: { day } });

  return (
    <View style={styles.root}>
      {diabetic ? (
        <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {/* Schede scorrevoli come nel design: riepilogo giornata e nutrizionale; il tocco apre il grafico. */}
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => width && setPage(Math.round(e.nativeEvent.contentOffset.x / width))}>
            {[
              <DaySummary key="day" glucoseAvg={summary.glucose_avg_mg_dl} insulin={summary.insulin_units} />,
              <NutritionSummary key="nutrition" nutrition={summary} />,
            ].map((card, i) => (
              <Pressable
                key={i}
                onPress={openChart}
                accessibilityRole="button"
                accessibilityHint={t('diary.chart.title')}
                style={{ width }}>
                {card}
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.dots} accessible accessibilityLabel={t('diary.page', { page: page + 1, count: 2 })}>
            {[0, 1].map((i) => (
              <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
            ))}
          </View>
        </View>
      ) : (
        <NutritionSummary nutrition={summary} />
      )}

      {entries.map((entry) => (
        <DiaryEntryRow key={`${entry.kind}-${entry.id}`} entry={entry} />
      ))}
      {entries.length === 0 && <Text style={styles.message}>{t('diary.empty')}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
  },
  loading: {
    marginTop: spacing.xl,
  },
  failed: {
    gap: spacing.lg,
    marginTop: spacing.xl,
  },
  message: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.text,
  },
});
