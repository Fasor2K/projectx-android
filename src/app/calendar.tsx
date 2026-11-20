import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { BackButtonSpace } from '@/components/back-button';
import { Card } from '@/components/card';
import { DateTimeField } from '@/components/date-time-field';
import { DayView } from '@/components/day-view';
import { GlassSurface } from '@/components/glass-surface';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { fromDay, toDay } from '@/lib/diary';
import { t } from '@/lib/i18n';
import { useProfile } from '@/lib/profile';
import { colors, radius, spacing, typography } from '@/theme';

/** Calendario: un giorno qualsiasi del diario; il "+" dei diabetici inserisce glicemia e/o insulina. */
export default function Calendar() {
  const params = useLocalSearchParams<{ day?: string }>();
  const [day, setDay] = useState(params.day ?? toDay(new Date()));
  const diabetic = !!useProfile().profile?.is_diabetic;
  const date = fromDay(day);

  return (
    <Screen back contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <BackButtonSpace />
        {diabetic && (
          <Pressable
            onPress={() => router.push({ pathname: '/glucose-insulin', params: { day } })}
            accessibilityRole="button"
            accessibilityLabel={t('diary.entry.title')}
            hitSlop={spacing.xs}>
            <GlassSurface interactive style={styles.add}>
              <Icon sf="plus" md="add" tintColor={colors.text} />
            </GlassSurface>
          </Pressable>
        )}
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {t('diary.calendar')}
      </Text>

      <Card>
        {Platform.OS === 'ios' ? (
          <DateTimePicker
            value={date}
            mode="date"
            display="inline"
            maximumDate={new Date()}
            onValueChange={(_, next) => setDay(toDay(next))}
            accentColor={colors.primary}
          />
        ) : (
          // Android non ha un calendario inline: il tocco apre il dialog di sistema.
          <DateTimeField
            label={t('diary.calendar')}
            mode="date"
            value={date}
            maximumDate={new Date()}
            onChange={(next) => setDay(toDay(next))}
          />
        )}
      </Card>

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
  title: typography.screenTitle,
  add: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
