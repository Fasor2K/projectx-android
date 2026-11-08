import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { Card } from '@/components/card';
import type { DiaryEntry, Nutrition } from '@/lib/diary';
import { i18n, t } from '@/lib/i18n';
import { colors, macroColors, spacing, typography } from '@/theme';

const DONUT = 112;
const STROKE = 16;
const R = (DONUT - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

const macros = [
  { key: 'carbs_g', color: macroColors.carbs.text, label: 'diary.carbsLong' },
  { key: 'fat_g', color: macroColors.fat.text, label: 'diary.fatLong' },
  { key: 'protein_g', color: macroColors.protein.text, label: 'diary.proteinLong' },
  { key: 'fiber_g', color: macroColors.fiber.text, label: 'diary.fiberLong' },
] as const;

const format = (value: number | null, digits = 0) =>
  new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: digits }).format(Number(value));

/**
 * "Riepilogo nutrizionale": torta dei grammi di macronutrienti e valori del giorno o del pasto.
 * Nel dettaglio ricetta e prodotto ("Bilancio nutrizionale") `accessory` sta accanto al titolo e `children` in fondo.
 */
export function NutritionSummary({
  nutrition,
  title = t('diary.nutritionSummary'),
  accessory,
  children,
}: {
  nutrition: Nutrition;
  title?: string;
  accessory?: ReactNode;
  children?: ReactNode;
}) {
  const total = macros.reduce((sum, m) => sum + Number(nutrition[m.key]), 0);
  let offset = 0;

  return (
    <Card style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, styles.rowTitle]}>{title}</Text>
        {accessory}
      </View>
      <View style={styles.nutrition}>
        <Svg width={DONUT} height={DONUT} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Circle cx={DONUT / 2} cy={DONUT / 2} r={R} stroke={colors.border} strokeWidth={STROKE} fill="none" />
          {total > 0 &&
            macros.map((m) => {
              const length = (Number(nutrition[m.key]) / total) * CIRCUMFERENCE;
              const circle = (
                <Circle
                  key={m.key}
                  cx={DONUT / 2}
                  cy={DONUT / 2}
                  r={R}
                  stroke={m.color}
                  strokeWidth={STROKE}
                  fill="none"
                  strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${DONUT / 2} ${DONUT / 2})`}
                />
              );
              offset += length;
              return circle;
            })}
        </Svg>
        <View style={styles.list}>
          {macros.map((m) => (
            <View key={m.key} style={styles.legend}>
              <View style={[styles.dot, { backgroundColor: m.color }]} />
              <Text style={typography.caption}>
                {t(m.label, { value: format(nutrition[m.key], 1) })}
                {total > 0 && ` · ${format((Number(nutrition[m.key]) / total) * 100)}%`}
              </Text>
            </View>
          ))}
          <Text style={typography.label}>{t('diary.kcal', { value: format(nutrition.kcal) })}</Text>
        </View>
      </View>
      {children}
    </Card>
  );
}

/** "Riepilogo giornata" dei diabetici: glicemia media e insulina totale. */
export function DaySummary({ glucoseAvg, insulin }: { glucoseAvg: number | null; insulin: number | null }) {
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>{t('diary.daySummary')}</Text>
      <View style={styles.stats}>
        <Stat
          label={t('diary.glucoseAvg')}
          value={glucoseAvg === null ? t('diary.noValue') : t('diary.glucoseValue', { value: glucoseAvg })}
        />
        <Stat
          label={t('diary.insulinTotal')}
          value={insulin === null ? t('diary.noValue') : t('diary.insulinValue', { value: format(insulin, 1) })}
        />
      </View>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={typography.caption}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const CHART_HEIGHT = 160;
const HOURS = [0, 6, 12, 18, 24];

/**
 * Glicemie del giorno sull'asse delle 24 ore, con le linee tratteggiate del range dell'utente.
 * L'asse verticale va da 40 mg/dL al massimo tra le letture e il range (+20).
 */
export function GlucoseChart({
  readings,
  min,
  max,
  width,
}: {
  readings: DiaryEntry[];
  min: number | null;
  max: number | null;
  width: number;
}) {
  const values = readings.map((r) => Number(r.glucose_mg_dl));
  const top = Math.max(...values, max ?? 0, 200) + 20;
  const bottom = 40;
  const y = (value: number) => CHART_HEIGHT - ((Math.max(value, bottom) - bottom) / (top - bottom)) * CHART_HEIGHT;
  const x = (iso: string) => {
    const d = new Date(iso);
    return ((d.getHours() * 60 + d.getMinutes()) / (24 * 60)) * width;
  };
  const points = readings.map((r) => ({ x: x(r.occurred_at), y: y(Number(r.glucose_mg_dl)) }));

  return (
    <View accessible accessibilityLabel={t('diary.chart.a11y', { count: readings.length })}>
      <Svg width={width} height={CHART_HEIGHT}>
        {[min, max].map((limit) =>
          limit === null ? null : (
            <Line
              key={limit}
              x1={0}
              x2={width}
              y1={y(limit)}
              y2={y(limit)}
              stroke={colors.textMuted}
              strokeDasharray="4 4"
              strokeWidth={1}
            />
          ),
        )}
        {points.length > 1 && (
          <Polyline
            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={colors.primary}
            strokeWidth={2.5}
          />
        )}
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={4} fill={colors.primary} />
        ))}
      </Svg>
      <View style={styles.axis}>
        {HOURS.map((h) => (
          <Text key={h} style={styles.axisLabel}>
            {`${String(h).padStart(2, '0')}:00`}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  card: {
    gap: spacing.md,
  },
  title: {
    ...typography.title,
    textAlign: 'center',
  },
  rowTitle: {
    flex: 1,
  },
  nutrition: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  list: {
    flex: 1,
    gap: spacing.xs,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stats: {
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    ...typography.title,
    fontVariant: ['tabular-nums'],
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  axisLabel: {
    ...typography.caption,
    fontSize: 11,
  },
});
