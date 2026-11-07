import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { BackButton } from '@/components/back-button';
import { Button } from '@/components/button';
import { Macros } from '@/components/food-card';
import { GlucoseInsulinFields } from '@/components/glucose-insulin-fields';
import { Row, Thumbnail } from '@/components/diary-entry';
import { NutritionSummary } from '@/components/diary-summary';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import {
  confirmMeal,
  fetchMeals,
  formatQuantity,
  fromDay,
  onDay,
  parseGlucoseInsulin,
  sumNutrition,
  toMacros,
  type GlucoseInsulinForm,
  type Meal,
} from '@/lib/diary';
import { i18n, t } from '@/lib/i18n';
import { mealTypes, type MealType } from '@/lib/notifications';
import { useProfile } from '@/lib/profile';
import { colors, spacing, typography } from '@/theme';

/** Componi pasto: voci di un pasto del giorno, glicemia e insulina per i diabetici, conferma nel diario. */
export default function ComposeMeal() {
  const params = useLocalSearchParams<{ day: string; type?: string }>();
  const day = params.day;
  const [type, setType] = useState<MealType>(mealTypes.find((m) => m === params.type) ?? 'breakfast');
  const diabetic = !!useProfile().profile?.is_diabetic;
  const [meals, setMeals] = useState<Meal[]>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [form, setForm] = useState<{ type: MealType; values: GlucoseInsulinForm }>();
  const [saving, setSaving] = useState(false);

  // Ricaricati a ogni ritorno: lo sheet di modifica cambia o rimuove le voci.
  useFocusEffect(
    useCallback(() => {
      let stale = false;
      fetchMeals(day).then(
        (next) => {
          if (stale) return;
          setMeals(next);
          setFailed(false);
        },
        () => !stale && setFailed(true),
      );
      return () => {
        stale = true;
      };
      // attempt rilancia il caricamento dopo "Riprova".
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [day, attempt]),
  );

  const meal = meals?.find((m) => m.meal_type === type);
  const items = meal?.items ?? [];

  // Campi riempiti con i valori del pasto solo al caricamento e al cambio di pasto, non a ogni ritorno sulla schermata.
  if (meals && form?.type !== type) {
    setForm({
      type,
      values: {
        glucose: meal?.glucose ? String(meal.glucose.glucose_mg_dl) : '',
        measuredAt: meal?.glucose ? new Date(meal.glucose.measured_at) : new Date(),
        insulin: meal?.insulin ? String(meal.insulin.units) : '',
        administeredAt: meal?.insulin ? new Date(meal.insulin.administered_at) : new Date(),
      },
    });
  }

  async function confirm() {
    let health = {};
    if (diabetic && form) {
      const { glucose, insulin } = parseGlucoseInsulin(form.values);
      if (glucose === null) return Alert.alert(t('diary.errors.title'), t('diary.meal.invalidGlucose'));
      if (insulin === null) return Alert.alert(t('diary.errors.title'), t('diary.meal.invalidInsulin'));
      health = {
        ...(glucose !== undefined && {
          glucose_mg_dl: glucose,
          measured_at: onDay(day, form.values.measuredAt).toISOString(),
        }),
        ...(insulin !== undefined && {
          insulin_units: insulin,
          administered_at: onDay(day, form.values.administeredAt).toISOString(),
        }),
      };
    }
    setSaving(true);
    try {
      await confirmMeal({ meal_date: day, meal_type: type, ...health });
      router.back();
    } catch {
      setSaving(false);
      Alert.alert(t('diary.errors.title'), t('authErrors.generic'));
    }
  }

  const date = fromDay(day).toLocaleDateString(i18n.locale, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Screen keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <BackButton />
        <View style={styles.headerText}>
          <Text style={styles.title} accessibilityRole="header">
            {t('diary.meal.title')}
          </Text>
          <Text style={styles.date}>{date}</Text>
        </View>
      </View>

      <SegmentedControl options={mealTypes} value={type} onChange={setType} label={(m) => t(`reminders.meals.${m}`)} />

      {failed ? (
        <>
          <Text style={styles.message}>{t('diary.loadFailed')}</Text>
          <Button title={t('common.retry')} onPress={() => setAttempt(attempt + 1)} />
        </>
      ) : !meals ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <>
          <Text style={typography.title}>{t(`reminders.meals.${type}`)}</Text>

          {items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => router.push({ pathname: '/meal-item', params: { item: JSON.stringify(item), type } })}
              accessibilityRole="button">
              <Row
                leading={<Thumbnail uri={item.image_url} />}
                title={item.title}
                value={formatQuantity(Number(item.quantity), item.quantity_mode)}>
                <Macros nutrition={toMacros(item)} />
              </Row>
            </Pressable>
          ))}

          {items.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t('diary.meal.empty')}</Text>
              <Button title={t('diary.meal.findFood')} onPress={() => router.navigate('/search')} />
            </View>
          ) : (
            <>
              <NutritionSummary nutrition={sumNutrition(items)} title={t('diary.nutritionSummary')} />
              {diabetic && form && (
                <GlucoseInsulinFields form={form.values} onChange={(values) => setForm({ type, values })} />
              )}
              {meal?.confirmed_at && <Text style={styles.message}>{t('diary.meal.confirmed')}</Text>}
              <Button title={t('diary.meal.confirm')} loading={saving} onPress={confirm} />
            </>
          )}
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
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.display,
    fontWeight: '700',
  },
  date: {
    ...typography.body,
    textTransform: 'capitalize',
  },
  empty: {
    gap: spacing.lg,
    marginTop: spacing.xl,
  },
  emptyText: {
    ...typography.title,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    textAlign: 'center',
  },
});
