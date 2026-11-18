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

/** Foto nuova (`base64`) o già salvata nella bozza (solo `uri`, l'URL pubblico). */
export type Photo = { uri: string; base64?: string };

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

/** Valori per 100 g ricavati da quelli della quantità (bozze riaperte); zero se il peso è 0 (qb). */
function per100From(macros: Macros, quantity: number | null, unit: IngredientUnit): Macros {
  const grams = (quantity ?? 0) * GRAMS[unit];
  return Object.fromEntries(macroKeys.map((k) => [k, grams > 0 ? (macros[k] * 100) / grams : 0])) as Macros;
}

/** get-recipe-draft (vedi ENDPOINTS.md). */
type Draft = {
  title: string | null;
  cover_image_url: string | null;
  servings: number | null;
  prep_time_minutes: number | null;
  difficulty: Difficulty | null;
  visibility: 'public' | 'private';
  guide_index: number | null;
  ingredients: (Omit<FormIngredient, 'quantity' | 'per100' | 'macros'> & Macros & { quantity: number | null })[];
  steps: { body: string; image_url: string | null }[];
  notes: string[];
  tags: string[];
};

/** Bozza dell'utente come form della schermata Nuova ricetta. */
export async function fetchDraftForm(id: string): Promise<RecipeForm> {
  const { draft: d } = await invoke<{ draft: Draft }>(`get-recipe-draft?id=${id}`, { method: 'GET' });
  return {
    cover: d.cover_image_url ? { uri: d.cover_image_url } : null,
    title: d.title ?? '',
    ingredients: d.ingredients.map(({ name, product_id, source_recipe_id, quantity, unit, ...rest }) => {
      const macros = Object.fromEntries(macroKeys.map((k) => [k, rest[k]])) as Macros;
      return {
        name,
        product_id,
        source_recipe_id,
        quantity: quantity === null ? '' : String(quantity),
        unit,
        per100: per100From(macros, quantity, unit),
        macros,
      };
    }),
    guide: d.guide_index,
    servings: String(d.servings ?? 0),
    prepMinutes: d.prep_time_minutes,
    difficulty: d.difficulty ?? undefined,
    steps: d.steps.map((s) => ({ body: s.body, photo: s.image_url ? { uri: s.image_url } : null })),
    notes: d.notes,
    tags: d.tags,
    visibility: d.visibility,
  };
}

/** Foto per il body: nuova in base64, già salvata come URL. */
const photoFields = (photo: Photo | null, prefix: 'cover_image' | 'image') =>
  photo?.base64 ? { [`${prefix}_base64`]: photo.base64 } : photo ? { [`${prefix}_url`]: photo.uri } : {};

/** Body di create-recipe e update-recipe-draft (vedi ENDPOINTS.md). */
export function recipeBody(form: RecipeForm, publish: boolean) {
  const servings = Number(form.servings);
  return {
    publish,
    title: form.title.trim() || null,
    servings: servings > 0 ? servings : null,
    prep_time_minutes: form.prepMinutes,
    difficulty: form.difficulty ?? null,
    visibility: form.visibility,
    ...photoFields(form.cover, 'cover_image'),
    guide_index: form.guide,
    ingredients: form.ingredients.map(({ per100: _per100, quantity, macros, ...i }) => ({
      ...i,
      ...macros,
      quantity: i.unit === 'to_taste' ? null : Number(quantity.replace(',', '.')),
    })),
    steps: form.steps.map((s) => ({ body: s.body, ...photoFields(s.photo, 'image') })),
    notes: form.notes,
    tags: form.tags,
  };
}

/** Crea la ricetta, o riscrive la bozza `draftId`. */
export const saveRecipe = (form: RecipeForm, publish: boolean, draftId?: string) =>
  invoke<{ id: string; published: boolean }>(draftId ? 'update-recipe-draft' : 'create-recipe', {
    method: 'POST',
    body: { ...recipeBody(form, publish), ...(draftId && { id: draftId }) },
  });

const PHOTO_WIDTH_PX = 1080;

/** Foto dalla libreria, ridotta a 1080 px di larghezza in JPEG (bucket recipe-images, massimo 2 MB); null se annullata. */
export async function pickRecipePhoto(aspect?: [number, number]): Promise<Photo | null> {
  const result = await launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: !!aspect, aspect });
  if (result.canceled) return null;
  const image = await ImageManipulator.manipulate(result.assets[0].uri).resize({ width: PHOTO_WIDTH_PX }).renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  return { uri: saved.uri, base64: saved.base64! };
}

/** Form della nuova ricetta (o della bozza riaperta), condiviso tra la schermata e i suoi sheet (layout `new-recipe`). */
export const RecipeFormContext = createContext<{
  form: RecipeForm;
  update: (changes: Partial<RecipeForm>) => void;
  /** Sostituisce tutto il form (bozza riaperta). */
  reset: (form: RecipeForm) => void;
  /** Codice letto dallo scanner dell'ingrediente, consumato dallo sheet Aggiungi ingrediente. */
  barcode: string | undefined;
  setBarcode: (barcode: string | undefined) => void;
}>({ form: emptyRecipe, update: () => {}, reset: () => {}, barcode: undefined, setBarcode: () => {} });

export const useRecipeForm = () => useContext(RecipeFormContext);
