import { i18n, t } from '@/lib/i18n';
import { invoke } from '@/lib/profile';
import type { MealType } from '@/lib/notifications';

export type QuantityMode = 'grams' | 'servings';

export type Nutrition = { carbs_g: number; fat_g: number; protein_g: number; fiber_g: number; kcal: number };

/** Voce della timeline (get-diary): i campi che non riguardano il tipo sono null. */
export type DiaryEntry = Nutrition & {
  kind: 'food' | 'glucose' | 'insulin' | 'activity';
  id: string;
  day: string;
  occurred_at: string;
  meal_type: MealType | null;
  title: string | null;
  image_url: string | null;
  recipe_id: string | null;
  product_id: string | null;
  quantity: number | null;
  quantity_mode: QuantityMode | null;
  glucose_mg_dl: number | null;
  insulin_units: number | null;
  category: string | null;
  duration_minutes: number | null;
};

export type DiarySummary = Nutrition & { glucose_avg_mg_dl: number | null; insulin_units: number | null };

export type Diary = { entries: DiaryEntry[]; summary: DiarySummary };

export type MealItem = Nutrition & {
  id: string;
  recipe_id: string | null;
  product_id: string | null;
  title: string;
  quantity: number;
  quantity_mode: QuantityMode;
  eaten_at: string;
  image_url: string | null;
};

export type Meal = {
  meal_type: MealType;
  confirmed_at: string | null;
  items: MealItem[];
  glucose: { id: string; glucose_mg_dl: number; measured_at: string } | null;
  insulin: { id: string; units: number; administered_at: string } | null;
};

/** get-food-nutrition: valori per 100 g e per porzione; null se non calcolabili. */
export type Food = {
  title: string;
  image_url: string | null;
  serving_g: number | null;
  per_100g: Nutrition | null;
  per_serving: Nutrition | null;
};

export const fetchDiary = (from: string, to = from) =>
  invoke<Diary>(`get-diary?${new URLSearchParams({ from, to })}`, { method: 'GET' });
export const fetchMeals = async (date: string) =>
  (await invoke<{ meals: Meal[] }>(`get-meals?date=${date}`, { method: 'GET' })).meals;
export const fetchFood = async (food: { recipe_id?: string; product_id?: string }) =>
  (await invoke<{ food: Food }>(`get-food-nutrition?${new URLSearchParams(food)}`, { method: 'GET' })).food;
export const saveMealItem = (body: {
  id?: string;
  recipe_id?: string;
  product_id?: string;
  meal_type: MealType;
  quantity: number;
  quantity_mode: QuantityMode;
}) => invoke<{ item_id: string; meal_date: string }>('save-meal-item', { method: 'POST', body });
export const deleteMealItem = (id: string) => invoke<{ deleted: true }>('delete-meal-item', { method: 'POST', body: { id } });
export const confirmMeal = (body: {
  meal_date: string;
  meal_type: MealType;
  glucose_mg_dl?: number;
  measured_at?: string;
  insulin_units?: number;
  administered_at?: string;
}) => invoke<{ confirmed: true }>('confirm-meal', { method: 'POST', body });
export const saveGlucoseInsulin = (body: {
  glucose_mg_dl?: number;
  measured_at?: string;
  insulin_units?: number;
  administered_at?: string;
}) => invoke<{ saved: true }>('save-glucose-insulin', { method: 'POST', body });

const pad = (n: number) => String(n).padStart(2, '0');

/** Giorno locale "YYYY-MM-DD" di una data. */
export const toDay = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Mezzanotte locale di un giorno "YYYY-MM-DD". */
export const fromDay = (day: string) => new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));

/** `time` spostato sul giorno `day`, con ore e minuti invariati. */
export function onDay(day: string, time: Date) {
  const date = fromDay(day);
  date.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return date;
}

/** Pasto proposto in base all'ora: colazione fino alle 11, pranzo fino alle 15, snack fino alle 18, poi cena. */
export function currentMealType(now = new Date()): MealType {
  const hour = now.getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 18) return 'snack';
  return 'dinner';
}

/** Valori di `food` per una quantità; null se l'unità non è calcolabile. */
export function scaleNutrition(food: Food, quantity: number, mode: QuantityMode): Nutrition | null {
  const base = mode === 'grams' ? food.per_100g : food.per_serving;
  if (!base) return null;
  const factor = mode === 'grams' ? quantity / 100 : quantity;
  return {
    carbs_g: base.carbs_g * factor,
    fat_g: base.fat_g * factor,
    protein_g: base.protein_g * factor,
    fiber_g: base.fiber_g * factor,
    kcal: base.kcal * factor,
  };
}

/** Somma dei valori nutrizionali (Riepilogo nutrizionale di un pasto). */
export const sumNutrition = (items: Nutrition[]): Nutrition =>
  items.reduce(
    (sum, x) => ({
      carbs_g: sum.carbs_g + Number(x.carbs_g),
      fat_g: sum.fat_g + Number(x.fat_g),
      protein_g: sum.protein_g + Number(x.protein_g),
      fiber_g: sum.fiber_g + Number(x.fiber_g),
      kcal: sum.kcal + Number(x.kcal),
    }),
    { carbs_g: 0, fat_g: 0, protein_g: 0, fiber_g: 0, kcal: 0 },
  );

/** Valori nel formato delle etichette di FoodCard. */
export const toMacros = (n: Nutrition) => ({
  carbs: Number(n.carbs_g),
  fat: Number(n.fat_g),
  protein: Number(n.protein_g),
  fiber: Number(n.fiber_g),
  kcal: Number(n.kcal),
});

/** "12:45" nella lingua dell'app. */
export const formatTime = (iso: string | Date) =>
  new Date(iso).toLocaleTimeString(i18n.locale, { hour: '2-digit', minute: '2-digit' });

/** "50 gr" o "1 porz". */
export const formatQuantity = (quantity: number, mode: QuantityMode) => {
  const value = new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: 2 }).format(quantity);
  return mode === 'grams' ? t('diary.grams', { value }) : t('diary.servings', { count: quantity, value });
};

/** Campi "Inserisci glicemia" e "Dosi di insulina" con i loro orari (Componi pasto e Calendario). */
export type GlucoseInsulinForm = { glucose: string; measuredAt: Date; insulin: string; administeredAt: Date };

/**
 * Valori dei campi per gli endpoint: undefined = campo vuoto, null = valore non valido.
 * Glicemia intera 1–999, insulina > 0 e ≤ 999 con un decimale (virgola o punto), come gli endpoint.
 */
export function parseGlucoseInsulin(form: GlucoseInsulinForm) {
  const glucoseText = form.glucose.trim();
  const insulinText = form.insulin.trim().replace(',', '.');
  const glucose = glucoseText === '' ? undefined : /^\d{1,3}$/.test(glucoseText) && Number(glucoseText) > 0 ? Number(glucoseText) : null;
  const insulin =
    insulinText === '' ? undefined : /^\d{1,3}(\.\d)?$/.test(insulinText) && Number(insulinText) > 0 ? Number(insulinText) : null;
  return { glucose, insulin };
}
