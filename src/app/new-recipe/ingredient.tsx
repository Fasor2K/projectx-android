import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { Button } from '@/components/button';
import { FoodSearch } from '@/components/food-search';
import { isValidQuantity, parseQuantity } from '@/components/quantity-field';
import { SelectMenu } from '@/components/select-menu';
import type { IngredientUnit } from '@/lib/food';
import { t } from '@/lib/i18n';
import { ApiError } from '@/lib/profile';
import {
  macroKeys,
  removeIngredient,
  scaleMacros,
  units,
  useRecipeForm,
  type FormIngredient,
  type Macros,
} from '@/lib/recipe-form';
import { fetchProductByBarcode, type Product, type Recipe } from '@/lib/search';
import { colors, macroColors, radius, spacing, typography } from '@/theme';

type Source = Pick<FormIngredient, 'name' | 'product_id' | 'source_recipe_id' | 'per100'>;
type MacroTexts = Record<keyof Macros, string>;

const MAX_MACRO = { carbs_g: 99999, fat_g: 99999, protein_g: 99999, fiber_g: 99999, kcal: 999999 };
const MACRO_COLORS = { carbs_g: macroColors.carbs, fat_g: macroColors.fat, protein_g: macroColors.protein, fiber_g: macroColors.fiber, kcal: macroColors.kcal };

const toTexts = (m: Macros) => Object.fromEntries(macroKeys.map((k) => [k, String(m[k])])) as MacroTexts;

const productSource = (p: Product): Source => ({
  name: p.name,
  product_id: p.id,
  source_recipe_id: null,
  per100: { carbs_g: p.carbs_g_100, fat_g: p.fat_g_100, protein_g: p.protein_g_100, fiber_g: p.fiber_g_100, kcal: p.kcal_100 },
});

/** null se la ricetta non ha valori per 100 g (peso non noto). */
const recipeSource = (r: Recipe): Source | null =>
  r.carbs_g_100 === null
    ? null
    : {
        name: r.title,
        product_id: null,
        source_recipe_id: r.id,
        // shortcut: con un ingrediente guida i 100 g sono di quell'ingrediente (come in Cerca), non della ricetta intera;
        // per i valori esatti servirebbe il peso totale della ricetta da search-recipes.
        per100: { carbs_g: r.carbs_g_100, fat_g: r.fat_g_100!, protein_g: r.protein_g_100!, fiber_g: r.fiber_g_100!, kcal: r.kcal_100! },
      };

/**
 * Sheet "Aggiungi ingrediente": sopra la ricerca di Cerca (o la scansione), sotto quantità, unità e valori,
 * precompilati in proporzione e modificabili. Con `index` modifica l'ingrediente.
 */
export default function IngredientSheet() {
  const params = useLocalSearchParams<{ index?: string }>();
  const index = params.index === undefined ? undefined : Number(params.index);
  const { form, update, barcode, setBarcode } = useRecipeForm();
  const existing = index === undefined ? undefined : form.ingredients[index];
  const insets = useSafeAreaInsets();

  const [source, setSource] = useState<Source | undefined>(existing);
  const [quantity, setQuantity] = useState(existing?.quantity ?? '100');
  const [unit, setUnit] = useState<IngredientUnit>(existing?.unit ?? 'g');
  const [macros, setMacros] = useState<MacroTexts | undefined>(existing && toTexts(existing.macros));

  // Codice letto dallo scanner di questo sheet.
  useEffect(() => {
    if (!barcode) return;
    setBarcode(undefined);
    fetchProductByBarcode(barcode).then(
      (p) => choose(productSource(p)),
      (e: unknown) => {
        const notFound = e instanceof ApiError && (e.code === 'product_not_found' || e.code === 'invalid_barcode');
        Alert.alert(t(notFound ? 'scanner.notFound' : 'authErrors.generic'));
      },
    );
    // choose usa solo setter e lo stato attuale di quantità e unità.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barcode]);

  function recompute(next: Source | undefined, nextQuantity: string, nextUnit: IngredientUnit) {
    if (next) setMacros(toTexts(scaleMacros(next.per100, parseQuantity(nextQuantity), nextUnit)));
  }

  function choose(next: Source) {
    setSource(next);
    recompute(next, quantity, unit);
  }

  const amount = parseQuantity(quantity);
  const parsed = macros && macroKeys.map((k) => parseQuantity(macros[k] || '0'));
  const valid =
    !!source &&
    (unit === 'to_taste' || isValidQuantity(amount)) &&
    !!parsed?.every((v, i) => v >= 0 && v <= MAX_MACRO[macroKeys[i]]);

  function confirm() {
    const ingredient: FormIngredient = {
      ...source!,
      quantity,
      unit,
      macros: Object.fromEntries(macroKeys.map((k, i) => [k, parsed![i]])) as Macros,
    };
    update({
      ingredients:
        index === undefined ? [...form.ingredients, ingredient] : form.ingredients.map((x, i) => (i === index ? ingredient : x)),
    });
    router.back();
  }

  function remove() {
    if (index !== undefined) update(removeIngredient(form, index));
    router.back();
  }

  return (
    <KeyboardAvoidingView style={styles.sheet} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <BackButton close />
        <Text style={styles.title} accessibilityRole="header">
          {t('newRecipe.ingredient.title')}
        </Text>
      </View>

      <ScrollView style={styles.results} contentContainerStyle={styles.resultsContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <FoodSearch
          selectedId={source?.product_id ?? source?.source_recipe_id ?? undefined}
          onSelectProduct={(p) => choose(productSource(p))}
          onSelectRecipe={(r) => {
            const next = recipeSource(r);
            if (next) choose(next);
            else Alert.alert(t('newRecipe.ingredient.noWeight'));
          }}
          onScan={() => router.push('/new-recipe/scanner')}
        />
      </ScrollView>

      <View style={[styles.form, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Text style={[typography.label, styles.chosen]} numberOfLines={1}>
          {source?.name ?? t('newRecipe.ingredient.choose')}
        </Text>
        <View style={styles.quantityRow}>
          <TextInput
            value={unit === 'to_taste' ? '' : quantity}
            onChangeText={(next) => {
              setQuantity(next);
              recompute(source, next, unit);
            }}
            editable={unit !== 'to_taste'}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={t('newRecipe.ingredient.quantity')}
            maxLength={7}
            style={styles.quantity}
          />
          <SelectMenu
            options={units}
            value={unit}
            onChange={(next) => {
              setUnit(next);
              recompute(source, quantity, next);
            }}
            label={(u) => t(`newRecipe.unitNames.${u}`)}
            accessibilityLabel={t('newRecipe.ingredient.unit')}
          />
        </View>
        <View style={styles.macros}>
          {macroKeys.map((k) => (
            <View key={k} style={styles.macro}>
              <Text style={[styles.macroLabel, { color: k === 'kcal' ? colors.textSecondary : MACRO_COLORS[k].text }]}>
                {t(`newRecipe.ingredient.${k}`)}
              </Text>
              <TextInput
                value={macros?.[k] ?? ''}
                onChangeText={(next) => setMacros({ ...(macros ?? toTexts({ carbs_g: 0, fat_g: 0, protein_g: 0, fiber_g: 0, kcal: 0 })), [k]: next })}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel={t(`newRecipe.ingredient.${k}`)}
                maxLength={9}
                style={[styles.macroInput, { backgroundColor: MACRO_COLORS[k].background }]}
              />
            </View>
          ))}
        </View>
        <View style={styles.actions}>
          <Button title={t('newRecipe.ingredient.delete')} onPress={remove} style={[styles.action, styles.delete]} />
          <Button title={t('filters.confirm')} onPress={confirm} disabled={!valid} style={styles.action} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
  },
  header: {
    justifyContent: 'center',
    minHeight: 44,
    margin: spacing.lg,
    marginBottom: 0,
  },
  title: {
    ...typography.title,
    position: 'absolute',
    alignSelf: 'center',
  },
  results: {
    flex: 1,
  },
  resultsContent: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  // Sotto la linea grigia del design: la scelta dell'ingrediente.
  form: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.inputBorder,
  },
  chosen: {
    textAlign: 'center',
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  quantity: {
    width: 110,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.border,
    fontSize: 17,
    textAlign: 'right',
    color: colors.text,
  },
  macros: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  macro: {
    flex: 1,
    gap: spacing.xs,
  },
  macroLabel: {
    ...typography.caption,
    fontSize: 12,
    textAlign: 'center',
  },
  macroInput: {
    minHeight: 44,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    textAlign: 'right',
    fontSize: 15,
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  action: {
    flex: 1,
    borderRadius: radius.pill,
  },
  delete: {
    backgroundColor: colors.danger,
  },
});
