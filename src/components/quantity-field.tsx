import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { SegmentedControl } from '@/components/segmented-control';
import type { QuantityMode } from '@/lib/diary';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme';

const STEP: Record<QuantityMode, number> = { grams: 10, servings: 0.5 };

/** Quantità come testo (campo modificabile) → numero; NaN se non è un numero. */
export const parseQuantity = (text: string) => Number(text.replace(',', '.'));

/** Quantità valida per gli endpoint (> 0 e ≤ 10000). */
export const isValidQuantity = (amount: number) => amount > 0 && amount <= 10000;

/** Quantità di partenza per un'unità: 100 g o 1 porzione (le due unità sono indipendenti). */
export const defaultQuantity = (mode: QuantityMode) => (mode === 'grams' ? '100' : '1');

type Props = {
  quantity: string;
  onChangeQuantity: (quantity: string) => void;
  mode: QuantityMode;
  modes: QuantityMode[];
  onChangeMode: (mode: QuantityMode) => void;
  /** Testo sotto il selettore, es. a quanti grammi corrisponde una porzione. */
  info?: string;
};

/** Stepper "- 50 +" e scelta "Grammi / Porzioni" (Aggiungi a pasto, dettaglio ricetta e prodotto). */
export function QuantityField({ quantity, onChangeQuantity, mode, modes, onChangeMode, info }: Props) {
  const amount = parseQuantity(quantity);

  function step(direction: 1 | -1) {
    const next = Math.max(STEP[mode], (isValidQuantity(amount) ? amount : 0) + direction * STEP[mode]);
    onChangeQuantity(String(Math.round(next * 100) / 100));
  }

  const field = (
    <View style={styles.row}>
      <View style={styles.stepper}>
        <Pressable
          onPress={() => step(-1)}
          accessibilityRole="button"
          accessibilityLabel={t('diary.item.decrease')}
          style={styles.stepButton}>
          <Icon sf="minus" md="remove" tintColor={colors.text} />
        </Pressable>
        <TextInput
          value={quantity}
          onChangeText={onChangeQuantity}
          keyboardType="decimal-pad"
          accessibilityLabel={t('diary.item.quantity')}
          style={styles.quantity}
          maxLength={7}
        />
        <Pressable
          onPress={() => step(1)}
          accessibilityRole="button"
          accessibilityLabel={t('diary.item.increase')}
          style={styles.stepButton}>
          <Icon sf="plus" md="add" tintColor={colors.text} />
        </Pressable>
      </View>
      <SegmentedControl
        options={modes}
        value={mode}
        onChange={onChangeMode}
        label={(m) => t(`diary.item.${m}`)}
        style={styles.modes}
      />
    </View>
  );
  if (!info) return field;
  return (
    <View style={styles.column}>
      {field}
      <Text style={[typography.caption, styles.info]}>{info}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    gap: spacing.sm,
  },
  info: {
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  stepButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    minWidth: 56,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  modes: {
    flex: 1,
  },
});
