import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DayView } from '@/components/day-view';
import { GlassSurface } from '@/components/glass-surface';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { currentMealType, fromDay, toDay } from '@/lib/diary';
import { i18n, t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme';

/** Tab Diario: settimana corrente, riepilogo e timeline del giorno scelto. */
export default function Diary() {
  const today = toDay(new Date());
  const [day, setDay] = useState(today);

  // Settimana da lunedì a domenica che contiene oggi.
  const monday = fromDay(today);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });

  const actions: { label: string; icon: Pick<ComponentProps<typeof Icon>, 'sf' | 'md'>; onPress: () => void }[] = [
    {
      label: t('diary.composeMeal'),
      icon: { sf: 'fork.knife', md: 'restaurant' },
      onPress: () => router.push({ pathname: '/meal', params: { day, type: currentMealType() } }),
    },
    {
      label: t('diary.calendar'),
      icon: { sf: 'calendar', md: 'calendar_month' },
      onPress: () => router.push({ pathname: '/calendar', params: { day } }),
    },
    {
      label: t('diary.export'),
      icon: { sf: 'square.and.arrow.up', md: 'ios_share' },
      onPress: () => router.push('/diary-export'),
    },
  ];

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          {t('diary.title')}
        </Text>
        <View style={styles.actions}>
          {actions.map((action) => (
            <Pressable
              key={action.label}
              onPress={action.onPress}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              hitSlop={spacing.xs}>
              <GlassSurface interactive style={styles.action}>
                <Icon {...action.icon} tintColor={colors.text} />
              </GlassSurface>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.week} accessibilityRole="tablist">
        {week.map((date) => {
          const value = toDay(date);
          const selected = value === day;
          const name = date.toLocaleDateString(i18n.locale, { weekday: 'short' });
          return (
            <Pressable
              key={value}
              onPress={() => setDay(value)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={date.toLocaleDateString(i18n.locale, { weekday: 'long', day: 'numeric', month: 'long' })}
              style={[styles.dayPill, selected && styles.dayPillSelected]}>
              <Text style={[styles.dayName, selected && styles.selectedText]}>{name}</Text>
              <Text style={[styles.dayNumber, selected && styles.selectedText]}>{date.getDate()}</Text>
            </Pressable>
          );
        })}
      </View>

      <DayView day={day} />
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
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    ...typography.display,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  week: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayPill: {
    minWidth: 44,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  dayPillSelected: {
    backgroundColor: colors.primary,
  },
  dayName: {
    ...typography.caption,
    textTransform: 'capitalize',
  },
  dayNumber: {
    ...typography.title,
    fontVariant: ['tabular-nums'],
  },
  selectedText: {
    color: colors.onPrimary,
  },
});
