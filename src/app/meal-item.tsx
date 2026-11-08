import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Thumbnail } from "@/components/diary-entry";
import { Macros } from "@/components/food-card";
import {
  defaultQuantity,
  isValidQuantity,
  parseQuantity,
  QuantityField,
} from "@/components/quantity-field";
import { servingInfo } from "@/lib/food";
import { SegmentedControl } from "@/components/segmented-control";
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
} from "@/lib/diary";
import { t } from "@/lib/i18n";
import { mealTypes, type MealType } from "@/lib/notifications";
import { ApiError } from "@/lib/profile";
import { colors, radius, spacing, typography } from "@/theme";

const modes: QuantityMode[] = ["grams", "servings"];

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
    per_100g: item.quantity_mode === "grams" ? per(100) : null,
    per_serving: item.quantity_mode === "servings" ? per(1) : null,
  };
}

/**
 * Sheet "Aggiungi a pasto" (dal dettaglio ricetta o prodotto: recipe_id o product_id, con quantity e mode scelti lì)
 * e modifica di una voce di Componi pasto (item, in JSON): pasto, quantità in grammi o porzioni e, in modifica, "Rimuovi".
 */
export default function MealItemSheet() {
  const params = useLocalSearchParams<{
    recipe_id?: string;
    product_id?: string;
    item?: string;
    type?: string;
    quantity?: string;
    mode?: string;
    /** "1" se la ricetta ha l'ingrediente guida (dal dettaglio ricetta). */
    guide?: string;
  }>();
  const item: MealItem | undefined = params.item
    ? JSON.parse(params.item)
    : undefined;
  const source = item
    ? {
        recipe_id: item.recipe_id ?? undefined,
        product_id: item.product_id ?? undefined,
      }
    : { recipe_id: params.recipe_id, product_id: params.product_id };
  const hasSource = !!(source.recipe_id || source.product_id);

  const [food, setFood] = useState<Food>();
  const [loadFailed, setLoadFailed] = useState(false);
  const [mealType, setMealType] = useState<MealType>(
    mealTypes.find((m) => m === params.type) ?? currentMealType(),
  );
  const [mode, setMode] = useState<QuantityMode>(
    item?.quantity_mode ?? "grams",
  );
  const [quantity, setQuantity] = useState(
    item ? String(Number(item.quantity)) : "",
  );
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
          // Quantità scelta nel dettaglio se calcolabile; senza peso noto la ricetta si aggiunge solo a porzioni.
          const chosen = modes.find((m) => m === params.mode);
          const usable =
            chosen &&
            (chosen === "grams" ? next.per_100g : next.per_serving) &&
            isValidQuantity(parseQuantity(params.quantity ?? ""));
          const nextMode = usable
            ? chosen
            : next.per_100g
              ? "grams"
              : "servings";
          setMode(nextMode);
          setQuantity(
            usable
              ? params.quantity!
              : defaultQuantity(nextMode),
          );
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

  const amount = parseQuantity(quantity);
  const validAmount = isValidQuantity(amount);
  const base = item && mode === item.quantity_mode ? itemFood(item) : food;
  const preview =
    base && validAmount ? scaleNutrition(base, amount, mode) : null;
  const title = item?.title ?? food?.title ?? "";
  const loading = !item && !food && !loadFailed;

  function changeMode(next: QuantityMode) {
    setMode(next);
    setQuantity(defaultQuantity(next));
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
        // Dal dettaglio: chiude sheet e schermate sopra i tab e apre Componi pasto sul pasto scelto.
        router.dismissAll();
        router.push({
          pathname: "/meal",
          params: { day: saved.meal_date, type: mealType },
        });
      }
    } catch (e) {
      setSaving(false);
      const unavailable =
        e instanceof ApiError && e.code === "quantity_mode_unavailable";
      Alert.alert(
        t("diary.errors.title"),
        t(unavailable ? "diary.item.gramsUnavailable" : "authErrors.generic"),
      );
    }
  }

  function remove() {
    if (!item) return;
    Alert.alert(t("diary.item.removeTitle"), title, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("diary.item.remove"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMealItem(item.id);
            router.back();
          } catch {
            Alert.alert(t("diary.errors.title"), t("authErrors.generic"));
          }
        },
      },
    ]);
  }

  if (loading)
    return <ActivityIndicator color={colors.primary} style={styles.loading} />;
  if (!item && loadFailed)
    return (
      <Text style={[styles.message, styles.loading]}>
        {t("authErrors.generic")}
      </Text>
    );

  // Cambiare unità richiede l'alimento d'origine: se non c'è più (o non si carica) resta solo l'unità della voce.
  const modeOptions = food
    ? modes.filter(
        (m) =>
          m === item?.quantity_mode ||
          (m === "grams" ? food.per_100g : food.per_serving),
      )
    : [mode];
  const values = preview ? (
    <Macros nutrition={toMacros(preview)} />
  ) : (
    <Text style={typography.caption}>{t("diary.item.unavailable")}</Text>
  );

  return (
    <View
      style={[
        styles.sheet,
        { paddingBottom: Math.max(insets.bottom, spacing.lg) },
      ]}
    >
      <Text style={styles.title} accessibilityRole="header">
        {item ? title : t("diary.item.addTitle")}
      </Text>
      <Text style={styles.subtitle}>
        {t(item ? "diary.item.editSubtitle" : "diary.item.addSubtitle")}
      </Text>

      {!item && (
        <Card style={styles.food}>
          <Thumbnail
            uri={food?.image_url ?? null}
            contain={!!source.product_id}
          />
          <View style={styles.foodText}>
            <Text style={typography.title} numberOfLines={2}>
              {title}
            </Text>
            {values}
          </View>
        </Card>
      )}

      <SegmentedControl
        options={mealTypes}
        value={mealType}
        onChange={setMealType}
        label={(m) => t(`reminders.meals.${m}`)}
      />

      <QuantityField
        quantity={quantity}
        onChangeQuantity={setQuantity}
        mode={mode}
        modes={modeOptions}
        onChangeMode={changeMode}
        info={
          // In modifica di una ricetta non sappiamo se ha l'ingrediente guida: niente testo.
          source.product_id
            ? servingInfo(food?.serving_g, "product")
            : params.guide !== undefined
              ? servingInfo(food?.serving_g, params.guide ? "guide" : "recipe")
              : undefined
        }
      />
      {food && !food.per_100g && (
        <Text style={typography.caption}>
          {t("diary.item.gramsUnavailable")}
        </Text>
      )}
      {/* In modifica i valori stanno sotto la quantità, senza foto (design "Componi pasto · Modifica"). */}
      {item && values}

      <View style={styles.buttons}>
        {item && (
          <Pressable
            onPress={remove}
            accessibilityRole="button"
            style={styles.remove}
          >
            <Text style={styles.removeText}>{t("diary.item.remove")}</Text>
          </Pressable>
        )}
        <Button
          title={t("diary.item.confirm")}
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
    flexGrow: 1,
    gap: spacing.lg,
    padding: spacing.xl,
  },
  loading: {
    margin: spacing.xxl,
  },
  title: {
    ...typography.title,
    textAlign: "center",
  },
  subtitle: {
    ...typography.caption,
    textAlign: "center",
  },
  food: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  foodText: {
    flex: 1,
    gap: spacing.xs,
  },
  // In fondo allo sheet, staccati dai campi sopra.
  buttons: {
    marginTop: "auto",
    paddingTop: spacing.xl,
    flexDirection: "row",
    gap: spacing.md,
  },
  remove: {
    flex: 1,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
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
    textAlign: "center",
  },
});
