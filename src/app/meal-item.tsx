import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Thumbnail } from '@/components/diary-entry';
import { Macros } from '@/components/food-card';
import { Icon } from '@/components/icon';
import { SegmentedControl } from '@/components/segmented-control';
import {
  currentMealType,
  deleteMealItem,
  fetchFood,
  saveMealItem,
  scaleNutrition,
  toMacros,
  type Food,
  type MealItem,
  type QuantityMode,
} from '@/lib/diary';
import { t } from '@/lib/i18n';
import { mealTypes, type MealType } from '@/lib/notifications';
import { ApiError } from '@/lib/profile';
import { colors, radius, spacing, typography } from '@/theme';

const modes: QuantityMode[] = ['grams', 'servings'];
const STEP: Record<QuantityMode, number> = { grams: 10, servings: 0.5 };

/** Valori dell'alimento ricavati dalla voce salvata: per la stessa unità il backend scala questi, non la ricetta attuale. */
function itemFood(item: MealItem): Food {
  const q = Number(item.quantity);
  const per = (factor: number) => ({
    carbs_g: (Number(item.carbs_g) / q) * factor,
    fat_g: (Number(item.fat_g) / q) * factor,
    protein_g: (Number(item.protein_g) / q) * factor,
    fiber_g: (Number(item.fiber_g) / q) * factor,
    kcal: (Number(item.kcal) / q) * factor,
  });
  return {
    title: item.title,
    image_url: item.image_url,
    serving_g: null,
    per_100g: item.quantity_mode === 'grams' ? per(100) : null,
    per_serving: item.quantity_mode === 'servings' ? per(1) : null,
  };
}

/**
 * Sheet "Aggiungi a pasto" (da Cerca o dalla scansione: recipe_id o product_id) e modifica di una voce di
 * Componi pasto (item, in JSON): pasto, quantità in grammi o porzioni e, in modifica, "Rimuovi".
 */
export default function MealItemSheet() {
  const params = useLocalSearchParams<{ recipe_id?: string; product_id?: string; item?: string; type?: string }>();
  const item: MealItem | undefined = params.item ? JSON.parse(params.item) : undefined;
  const source = item
    ? { recipe_id: item.recipe_id ?? undefined, product_id: item.product_id ?? undefined }
    : { recipe_id: params.recipe_id, product_id: params.product_id };
  const hasSource = !!(source.recipe_id || source.product_id);

  const [food, setFood] = useState<Food>();
  const [loadFailed, setLoadFailed] = useState(false);
  const [mealType, setMealType] = useState<MealType>(
    mealTypes.find((m) => m === params.type) ?? currentMealType(),
  );
  const [mode, setMode] = useState<QuantityMode>(item?.quantity_mode ?? 'grams');
  const [quantity, setQuantity] = useState(item ? String(Number(item.quantity)) : '');
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!hasSource) return;
    let stale = false;
    fetchFood(source).then(
      (next) => {
        if (stale) return;
        setFood(next);
        if (!item) {
          // Senza peso noto la ricetta si aggiunge solo a porzioni.
          const grams = !!next.per_100g;
          setMode(grams ? 'grams' : 'servings');
          setQuantity(grams ? String(Math.round(next.serving_g ?? 100)) : '1');
        }
      },
      () => !stale && setLoadFailed(true),
    );
    return () => {
      stale = true;
    };
    // source dipende solo dai parametri della route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.recipe_id, source.product_id]);

  const amount = Number(quantity.replace(',', '.'));
  const validAmount = amount > 0 && amount <= 10000;
  const base = item && mode === item.quantity_mode ? itemFood(item) : food;
  const preview = base && validAmount ? scaleNutrition(base, amount, mode) : null;
  const title = item?.title ?? food?.title ?? '';
  const loading = !item && !food && !loadFailed;

  function step(direction: 1 | -1) {
    const next = Math.max(STEP[mode], (validAmount ? amount : 0) + direction * STEP[mode]);
    setQuantity(String(Math.round(next * 100) / 100));
  }

  function changeMode(next: QuantityMode) {
    setMode(next);
    setQuantity(next === 'grams' ? String(Math.round(food?.serving_g ?? 100)) : '1');
  }

  async function confirm() {
    setSaving(true);
    try {
      const saved = await saveMealItem({
        ...(item ? { id: item.id } : source),
        meal_type: mealType,
        quantity: Math.round(amount * 100) / 100,
        quantity_mode: mode,
      });
      if (item) {
        router.back();
      } else {
        // Da Cerca o dallo scanner: chiude sheet e modali e apre Componi pasto sul pasto scelto.
        router.dismissAll();
        router.push({ pathname: '/meal', params: { day: saved.meal_date, type: mealType } });
      }
    } catch (e) {
      setSaving(false);
      const unavailable = e instanceof ApiError && e.code === 'quantity_mode_unavailable';
      Alert.alert(t('diary.errors.title'), t(unavailable ? 'diary.item.gramsUnavailable' : 'authErrors.generic'));
    }
  }

  function remove() {
    if (!item) return;
    Alert.alert(t('diary.item.removeTitle'), title, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('diary.item.remove'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMealItem(item.id);
            router.back();
          } catch {
            Alert.alert(t('diary.errors.title'), t('authErrors.generic'));
          }
        },
      },
    ]);
  }

  if (loading) return <ActivityIndicator color={colors.primary} style={styles.loading} />;
  if (!item && loadFailed) return <Text style={[styles.message, styles.loading]}>{t('authErrors.generic')}</Text>;

  // Cambiare unità richiede l'alimento d'origine: se non c'è più (o non si carica) resta solo l'unità della voce.
  const modeOptions = food
    ? modes.filter((m) => m === item?.quantity_mode || (m === 'grams' ? food.per_100g : food.per_serving))
    : [mode];

  return (
    <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
      <Text style={styles.title} accessibilityRole="header">
        {item ? title : t('diary.item.addTitle')}
      </Text>
      <Text style={styles.subtitle}>{t(item ? 'diary.item.editSubtitle' : 'diary.item.addSubtitle')}</Text>

      <View style={styles.food}>
        <Thumbnail uri={item?.image_url ?? food?.image_url ?? null} />
        <View style={styles.foodText}>
          {!item && (
            <Text style={typography.title} numberOfLines={2}>
              {title}
            </Text>
          )}
          {preview ? (
            <Macros nutrition={toMacros(preview)} />
          ) : (
            <Text style={typography.caption}>{t('diary.item.unavailable')}</Text>
          )}
        </View>
      </View>

      <SegmentedControl options={mealTypes} value={mealType} onChange={setMealType} label={(m) => t(`reminders.meals.${m}`)} />

      <View style={styles.quantityRow}>
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
            onChangeText={setQuantity}
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
          options={modeOptions}
          value={mode}
          onChange={changeMode}
          label={(m) => t(`diary.item.${m}`)}
          style={styles.modes}
        />
      </View>
      {food && !food.per_100g && <Text style={typography.caption}>{t('diary.item.gramsUnavailable')}</Text>}

      <View style={styles.buttons}>
        {item && (
          <Pressable onPress={remove} accessibilityRole="button" style={styles.remove}>
            <Text style={styles.removeText}>{t('diary.item.remove')}</Text>
          </Pressable>
        )}
        <Button
          title={t('diary.item.confirm')}
          loading={saving}
          disabled={!preview}
          onPress={confirm}
          style={styles.confirm}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    gap: spacing.lg,
    padding: spacing.xl,
  },
  loading: {
    margin: spacing.xxl,
  },
  title: {
    ...typography.title,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.caption,
    textAlign: 'center',
  },
  food: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  foodText: {
    flex: 1,
    gap: spacing.xs,
  },
  quantityRow: {
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
  buttons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  remove: {
    flex: 1,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
  removeText: {
    ...typography.button,
    color: colors.danger,
  },
  confirm: {
    flex: 1,
  },
  message: {
    ...typography.body,
    textAlign: 'center',
  },
});
