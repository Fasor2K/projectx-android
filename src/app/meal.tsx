import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { BackButtonSpace } from '@/components/back-button';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Macros } from '@/components/food-card';
import { Row, Thumbnail } from '@/components/diary-entry';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import {
  confirmMeal,
  fetchMeals,
  formatQuantity,
  formatTime,
  fromDay,
  onDay,
  parseGlucoseInsulin,
  pickMealTime,
  sumNutrition,
  toMacros,
  type GlucoseInsulinForm,
  type Meal,
} from '@/lib/diary';
import { i18n, t } from '@/lib/i18n';
import { mealTypes, type MealType } from '@/lib/notifications';
import { useProfile } from '@/lib/profile';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * Componi pasto: voci di un pasto del giorno e card di riepilogo (totali, glicemia e insulina per i diabetici, conferma).
 * L'orario della dose non si mostra (come nel design): resta quello salvato o l'ora di apertura.
 */
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

  // Riepilogo e conferma fissi in fondo mentre le voci scorrono.
  const summary = !failed && items.length > 0 && (
    <Card>
      <Text style={styles.cardTitle}>{t(`reminders.meals.${type}`)}</Text>
      <Macros nutrition={toMacros(sumNutrition(items))} long />
      {diabetic && form && (
        <>
          <HealthRow
            icon={{ sf: 'drop', md: 'water_drop' }}
            label={t('diary.meal.enterGlucose')}
            suffix="mg/dL"
            value={form.values.glucose}
            onChangeText={(glucose) => setForm({ type, values: { ...form.values, glucose } })}
            keyboardType="number-pad"
            maxLength={3}>
            <TimeLink
              value={form.values.measuredAt}
              onChange={(measuredAt) => setForm({ type, values: { ...form.values, measuredAt } })}
            />
          </HealthRow>
          <HealthRow
            icon={{ sf: 'syringe', md: 'vaccines' }}
            label={t('diary.meal.insulinDose')}
            suffix={t('diary.insulinValue', { value: '' }).trim()}
            value={form.values.insulin}
            onChangeText={(insulin) => setForm({ type, values: { ...form.values, insulin } })}
            keyboardType="decimal-pad"
            maxLength={5}
          />
        </>
      )}
      {meal?.confirmed_at && <Text style={styles.message}>{t('diary.meal.confirmed')}</Text>}
      <Button title={t('diary.meal.confirm')} loading={saving} onPress={confirm} />
    </Card>
  );

  return (
    // Il riepilogo fisso ha i campi glicemia/insulina: su iOS va spinto sopra la tastiera (come in feedback.tsx).
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen back keyboardDismissMode="on-drag" contentContainerStyle={styles.content} footer={summary || undefined}>
        <View style={styles.header}>
          <BackButtonSpace />
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

            {items.length === 0 && <Text style={styles.emptyText}>{t('diary.meal.empty')}</Text>}
          </>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

/** Riga grigia del riepilogo (glicemia, insulina): icona, etichetta e valore a destra. */
function HealthRow({
  icon,
  label,
  suffix,
  children,
  ...input
}: TextInputProps & { icon: Pick<ComponentProps<typeof Icon>, 'sf' | 'md'>; label: string; suffix: string; children?: ReactNode }) {
  return (
    <View style={styles.healthRow}>
      <View style={styles.healthIcon}>
        <Icon {...icon} size={16} />
      </View>
      <View style={styles.healthText}>
        <Text style={typography.label}>{label}</Text>
        {children}
      </View>
      <TextInput
        style={styles.healthInput}
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={label}
        {...input}
      />
      <Text style={styles.suffix}>{suffix}</Text>
    </View>
  );
}

/** "Ore 12:35 · Modifica orario": sheet `meal-time` su iOS, dialog di sistema su Android. */
function TimeLink({ value, onChange }: { value: Date; onChange: (value: Date) => void }) {
  function press() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value, mode: 'time', is24Hour: true, onValueChange: (_, date) => onChange(date) });
    } else {
      pickMealTime(value, onChange);
    }
  }

  return (
    <View style={styles.timeRow}>
      <Text style={typography.caption}>{t('diary.at', { time: formatTime(value) })}</Text>
      <Pressable onPress={press} hitSlop={spacing.md} accessibilityRole="button" accessibilityHint={t('diary.meal.editTimeHint')}>
        <Text style={styles.link}>{t('diary.meal.editTime')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
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
  emptyText: {
    ...typography.title,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  cardTitle: {
    ...typography.title,
    textAlign: 'center',
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.inputBackground,
  },
  healthIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
  },
  healthText: {
    flex: 1,
    gap: spacing.xs,
  },
  healthInput: {
    minWidth: 56,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  suffix: {
    ...typography.caption,
    // Larghezza fissa: "mg/dL" e "UI" lasciano i due campi in colonna.
    width: 44,
  },
  timeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    // Se non c'è spazio "Modifica orario" va a capo invece di finire sotto il campo a destra.
    columnGap: spacing.sm,
  },
  link: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  message: {
    ...typography.body,
    textAlign: 'center',
  },
});
