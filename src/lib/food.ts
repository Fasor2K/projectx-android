import type { Food, QuantityMode } from '@/lib/diary';
import { i18n, t } from '@/lib/i18n';
import { invoke } from '@/lib/profile';
import type { Product } from '@/lib/search';

/** get-product: prodotto con zuccheri, saturi, porzione e conteggi dei feedback (vedi ENDPOINTS.md). */
export type ProductDetail = Product & {
  sugars_g_100: number | null;
  saturated_fat_g_100: number | null;
  serving_size_g: number;
  rating_count: number;
  review_count: number;
  report_count: number;
};

export type IngredientUnit = 'g' | 'kg' | 'ml' | 'l' | 'tablespoon' | 'teaspoon' | 'to_taste';

export type Difficulty = 'easy' | 'medium' | 'hard';

/** get-recipe: ricetta completa; valori in `nutrition` come get-food-nutrition. */
export type RecipeDetail = {
  id: string;
  title: string;
  cover_image_url: string | null;
  servings: number;
  prep_time_minutes: number | null;
  difficulty: Difficulty | null;
  guide_ingredient_id: string | null;
  rating_avg: number | null;
  rating_count: number;
  is_mine: boolean;
  is_private: boolean;
  /** null = account eliminato. */
  author: { id: string; nickname: string; avatar_url: string | null; is_following: boolean } | null;
  ingredients: {
    id: string;
    name: string;
    product_id: string | null;
    source_recipe_id: string | null;
    quantity: number | null;
    unit: IngredientUnit;
  }[];
  steps: { position: number; body: string; image_url: string | null }[];
  notes: string[];
  tags: { slug: string; label: string; category: string }[];
  nutrition: Pick<Food, 'serving_g' | 'per_100g' | 'per_serving'>;
  review_count: number;
  report_count: number;
};

export type FeedbackKind = 'review' | 'report';

export type Feedback = {
  id: string;
  rating: number | null;
  body: string | null;
  created_at: string;
  author: { id: string; nickname: string; avatar_url: string | null };
  /** Scritto dall'utente (al massimo uno per tipo ed elemento): si può modificare ed eliminare. */
  is_mine: boolean;
};

/** Ricetta o prodotto a cui si riferisce un feedback. */
export type FoodRef = { recipe_id: string } | { product_id: string };

export const fetchProduct = async (id: string) =>
  (await invoke<{ product: ProductDetail }>(`get-product?id=${id}`, { method: 'GET' })).product;
export const fetchRecipe = async (id: string) =>
  (await invoke<{ recipe: RecipeDetail }>(`get-recipe?id=${id}`, { method: 'GET' })).recipe;
export const fetchFeedback = async (food: FoodRef, kind: FeedbackKind) =>
  (await invoke<{ feedback: Feedback[] }>(`get-feedback?${new URLSearchParams({ ...food, kind })}`, { method: 'GET' }))
    .feedback;
export const saveFeedback = (body: FoodRef & { kind: FeedbackKind; rating?: number; body?: string }) =>
  invoke<{ id: string }>('save-feedback', { method: 'POST', body });
/** Modifica la propria recensione (voto e testo) o segnalazione (solo testo, `rating` assente) con edit-review. */
export const editFeedback = (id: string, rating: number | undefined, body?: string) =>
  invoke<{ id: string }>('edit-review', { method: 'POST', body: { id, rating, body } });
export const deleteFeedback = (id: string) =>
  invoke<{ deleted: true }>('edit-review', { method: 'POST', body: { id, delete: true } });
export const followUser = (userId: string, follow: boolean) =>
  invoke<{ following: boolean }>('follow-user', { method: 'POST', body: { user_id: userId, follow } });

/** Valori di un prodotto nel formato di get-food-nutrition, per scaleNutrition. */
export function productFood(p: ProductDetail): Food {
  const per = (grams: number) => ({
    carbs_g: (p.carbs_g_100 * grams) / 100,
    fat_g: (p.fat_g_100 * grams) / 100,
    protein_g: (p.protein_g_100 * grams) / 100,
    fiber_g: (p.fiber_g_100 * grams) / 100,
    kcal: (p.kcal_100 * grams) / 100,
  });
  return { title: p.name, image_url: p.image_url, serving_g: p.serving_size_g, per_100g: per(100), per_serving: per(p.serving_size_g) };
}

/** Grammi di prodotto corrispondenti a una quantità (per zuccheri e saturi). */
export const productGrams = (p: ProductDetail, quantity: number, mode: QuantityMode) =>
  mode === 'grams' ? quantity : quantity * p.serving_size_g;

/**
 * Fattore per cui moltiplicare le dosi della ricetta per avere quelle della porzione scelta ("mia porzione").
 * Porzioni: n / porzioni della ricetta. Grammi: g / peso di riferimento (ingrediente guida o somma degli
 * ingredienti a crudo, = serving_g × porzioni, vedi food_nutrition). null se il peso non è noto.
 */
export function portionFactor(recipe: Pick<RecipeDetail, 'servings' | 'nutrition'>, quantity: number, mode: QuantityMode) {
  if (mode === 'servings') return quantity / recipe.servings;
  const servingG = recipe.nutrition.serving_g;
  return servingG ? quantity / (servingG * recipe.servings) : null;
}

const number = (value: number) => new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: 1 }).format(value);

/** "Una porzione corrisponde a 30 grammi di …": prodotto, ingrediente guida a crudo o ricetta a crudo. */
export const servingInfo = (grams: number | null | undefined, kind: 'product' | 'guide' | 'recipe') =>
  grams ? t(`foodDetail.servingInfo.${kind}`, { grams: number(grams) }) : undefined;

/** "150 g", "2 cucchiai", "q.b."; dose moltiplicata per `factor`. */
export function formatIngredient(quantity: number | null, unit: IngredientUnit, factor = 1) {
  if (unit === 'to_taste' || quantity === null) return t('foodDetail.units.to_taste');
  const value = quantity * factor;
  return t(`foodDetail.units.${unit}`, { count: value, value: number(value) });
}

/** "adesso", "2 ore fa", "3 giorni fa"; dopo una settimana la data. */
export function timeAgo(iso: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 60_000));
  if (minutes < 1) return t('timeAgo.now');
  if (minutes < 60) return t('timeAgo.minutes', { count: minutes });
  if (minutes < 24 * 60) return t('timeAgo.hours', { count: Math.floor(minutes / 60) });
  if (minutes < 7 * 24 * 60) return t('timeAgo.days', { count: Math.floor(minutes / (24 * 60)) });
  return new Date(iso).toLocaleDateString(i18n.locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "45 min", "2 h", "1 h 30 min". */
export function formatPrepTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return t('foodDetail.minutes', { value: m });
  return m ? t('foodDetail.hoursMinutes', { h, m }) : t('foodDetail.hours', { value: h });
}
