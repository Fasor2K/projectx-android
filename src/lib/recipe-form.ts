import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { createContext, useContext } from 'react';

import type { Difficulty, IngredientUnit } from '@/lib/food';
import { invoke } from '@/lib/profile';

/** Scelte del menu "Preparazione", in minuti. */
export const prepTimes = [10, 15, 20, 30, 45, 60, 90, 120, 180, 240];

export const units: IngredientUnit[] = ['g', 'kg', 'ml', 'l', 'tablespoon', 'teaspoon', 'to_taste'];

/** Grammi di un'unità: gli stessi valori standard di ingredient_weight_g (DATABASE.md). */
const GRAMS: Record<IngredientUnit, number> = { g: 1, kg: 1000, ml: 1, l: 1000, tablespoon: 15, teaspoon: 5, to_taste: 0 };

export const macroKeys = ['carbs_g', 'fat_g', 'protein_g', 'fiber_g', 'kcal'] as const;
export type Macros = Record<(typeof macroKeys)[number], number>;

export type Photo = { uri: string; base64: string };

export type FormIngredient = {
  name: string;
  product_id: string | null;
  source_recipe_id: string | null;
  /** Testo del campo; ignorato con `to_taste`. */
  quantity: string;
  unit: IngredientUnit;
  /** Valori della fonte per 100 g, per ricalcolare quelli della quantità. */
  per100: Macros;
  /** Valori della quantità: precompilati dalla fonte, modificabili. */
  macros: Macros;
};

export type RecipeForm = {
  cover: Photo | null;
  title: string;
  ingredients: FormIngredient[];
  /** Indice dell'ingrediente guida in `ingredients`. */
  guide: number | null;
  /** Testo dello stepper; "0" = non indicate. */
  servings: string;
  prepMinutes: number | null;
  difficulty: Difficulty | undefined;
  steps: { body: string; photo: Photo | null }[];
  notes: string[];
  tags: string[];
  visibility: 'public' | 'private';
};

export const emptyRecipe: RecipeForm = {
  cover: null,
  title: '',
  ingredients: [],
  guide: null,
  servings: '0',
  prepMinutes: null,
  difficulty: undefined,
  steps: [],
  notes: [],
  tags: [],
  visibility: 'public',
};

/** Valori di `quantity` `unit` di un alimento con questi valori per 100 g. */
export function scaleMacros(per100: Macros, quantity: number, unit: IngredientUnit): Macros {
  const grams = unit === 'to_taste' || !(quantity > 0) ? 0 : quantity * GRAMS[unit];
  return Object.fromEntries(macroKeys.map((k) => [k, Math.round(per100[k] * grams) / 100])) as Macros;
}

/** Ingredienti senza la voce `index`, con l'ingrediente guida che la segue (o tolto se era lei). */
export function removeIngredient(form: RecipeForm, index: number): Pick<RecipeForm, 'ingredients' | 'guide'> {
  const guide = form.guide === null || form.guide === index ? null : form.guide > index ? form.guide - 1 : form.guide;
  return { ingredients: form.ingredients.filter((_, i) => i !== index), guide };
}

/** Body di create-recipe (vedi ENDPOINTS.md). */
export function recipeBody(form: RecipeForm, publish: boolean) {
  const servings = Number(form.servings);
  return {
    publish,
    title: form.title.trim() || null,
    servings: servings > 0 ? servings : null,
    prep_time_minutes: form.prepMinutes,
    difficulty: form.difficulty ?? null,
    visibility: form.visibility,
    cover_image_base64: form.cover?.base64,
    guide_index: form.guide,
    ingredients: form.ingredients.map(({ per100: _per100, quantity, macros, ...i }) => ({
      ...i,
      ...macros,
      quantity: i.unit === 'to_taste' ? null : Number(quantity.replace(',', '.')),
    })),
    steps: form.steps.map((s) => ({ body: s.body, image_base64: s.photo?.base64 })),
    notes: form.notes,
    tags: form.tags,
  };
}

export const createRecipe = (form: RecipeForm, publish: boolean) =>
  invoke<{ id: string; published: boolean }>('create-recipe', { method: 'POST', body: recipeBody(form, publish) });

const PHOTO_WIDTH_PX = 1080;

/** Foto dalla libreria, ridotta a 1080 px di larghezza in JPEG (bucket recipe-images, massimo 2 MB); null se annullata. */
export async function pickRecipePhoto(aspect?: [number, number]): Promise<Photo | null> {
  const result = await launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: !!aspect, aspect });
  if (result.canceled) return null;
  const image = await ImageManipulator.manipulate(result.assets[0].uri).resize({ width: PHOTO_WIDTH_PX }).renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  return { uri: saved.uri, base64: saved.base64! };
}

/** Form della nuova ricetta, condiviso tra la schermata e i suoi sheet (layout `new-recipe`). */
export const RecipeFormContext = createContext<{
  form: RecipeForm;
  update: (changes: Partial<RecipeForm>) => void;
  /** Codice letto dallo scanner dell'ingrediente, consumato dallo sheet Aggiungi ingrediente. */
  barcode: string | undefined;
  setBarcode: (barcode: string | undefined) => void;
}>({ form: emptyRecipe, update: () => {}, barcode: undefined, setBarcode: () => {} });

export const useRecipeForm = () => useContext(RecipeFormContext);
