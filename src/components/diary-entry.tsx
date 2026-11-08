import type { ComponentProps, ReactNode } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Macros } from '@/components/food-card';
import { Icon } from '@/components/icon';
import { formatQuantity, formatTime, toMacros, type DiaryEntry } from '@/lib/diary';
import { i18n, t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme';

const kindIcons: Record<Exclude<DiaryEntry['kind'], 'food'>, Pick<ComponentProps<typeof Icon>, 'sf' | 'md'>> = {
  glucose: { sf: 'drop', md: 'water_drop' },
  insulin: { sf: 'syringe', md: 'vaccines' },
  activity: { sf: 'figure.run', md: 'directions_run' },
};

const number = (value: number | null) => new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: 1 }).format(Number(value));

/** Voce della timeline del diario: glicemia, insulina, cibo o attività. */
export function DiaryEntryRow({ entry: e }: { entry: DiaryEntry }) {
  const time = t('diary.at', { time: formatTime(e.occurred_at) });
  const meal = e.meal_type && t(`reminders.meals.${e.meal_type}`);
  const subtitle = [time, e.kind === 'activity' ? e.category : meal].filter(Boolean).join(' • ');

  if (e.kind === 'food') {
    return (
      <Row
        leading={<Thumbnail uri={e.image_url} />}
        title={e.title ?? ''}
        subtitle={subtitle}
        value={formatQuantity(Number(e.quantity), e.quantity_mode!)}>
        <Macros nutrition={toMacros(e)} />
      </Row>
    );
  }

  const value =
    e.kind === 'glucose'
      ? t('diary.glucoseValue', { value: e.glucose_mg_dl })
      : e.kind === 'insulin'
        ? t('diary.insulinValue', { value: number(e.insulin_units) })
        : t('diary.minutes', { value: e.duration_minutes });
  const title = e.kind === 'activity' ? (e.title ?? '') : t(`diary.${e.kind}`);

  return (
    <Row
      leading={
        <View style={styles.icon}>
          <Icon {...kindIcons[e.kind]} size={16} />
        </View>
      }
      title={title}
      subtitle={subtitle}
      value={value}
    />
  );
}

/** Riga a card: elemento a sinistra, titolo e sottotitolo, valore a destra, contenuto extra sotto. */
export function Row({
  leading,
  title,
  subtitle,
  value,
  children,
}: {
  leading: ReactNode;
  title: string;
  subtitle?: string;
  value?: string;
  children?: ReactNode;
}) {
  return (
    <Card style={styles.card}>
      {leading}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? <Text style={typography.caption}>{subtitle}</Text> : null}
        {children}
      </View>
      {value ? <Text style={styles.value}>{value}</Text> : null}
    </Card>
  );
}

/** `contain` mostra la foto intera (con bande ai lati) invece di ritagliarla. */
export function Thumbnail({ uri, contain }: { uri: string | null; contain?: boolean }) {
  return uri ? (
    <Image
      source={{ uri }}
      style={styles.thumb}
      resizeMode={contain ? 'contain' : 'cover'}
      accessibilityIgnoresInvertColors
    />
  ) : (
    <View style={[styles.thumb, styles.placeholder]}>
      <Icon sf="fork.knife" md="restaurant" size={18} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.label,
    fontSize: 15,
  },
  value: {
    ...typography.label,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
});
