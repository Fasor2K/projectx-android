import { createContext, useContext } from 'react';

import { invoke } from '@/lib/profile';

/** Prodotto di search-products e get-product-by-barcode; valori per 100 g (vedi ENDPOINTS.md). */
export type Product = {
  id: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  image_url: string | null;
  carbs_g_100: number;
  fat_g_100: number;
  protein_g_100: number;
  fiber_g_100: number;
  kcal_100: number;
  rating_avg: number | null;
};

/** Ricetta di search-recipes; valori per 100 g, null se il peso della ricetta non è noto. */
export type Recipe = {
  id: string;
  title: string;
  cover_image_url: string | null;
  carbs_g_100: number | null;
  fat_g_100: number | null;
  protein_g_100: number | null;
  fiber_g_100: number | null;
  kcal_100: number | null;
  /** Ingrediente guida a cui si riferiscono i 100 g; null = somma degli ingredienti. */
  guide_name: string | null;
  rating_avg: number | null;
};

/** Filtri dello sheet: slug di `tags`, elenco chiuso (DATABASE.md); le etichette stanno in filters.tags. */
export const tagSections = {
  meal: ['breakfast', 'lunch', 'dinner', 'snack'],
  glycemic_nutritional: ['low-gi', 'no-added-sugar', 'high-fiber', 'high-protein'],
  dietary_needs: ['gluten-free', 'vegan', 'lactose-free', 'vegetarian'],
  difficulty_prep: ['quick', 'no-cook'],
  dish_type: ['one-dish', 'appetizer', 'first-course', 'second-course', 'side-dish', 'baked-goods', 'savory', 'sweet'],
} as const;

export type QuickFilter = 'mine' | 'frequent' | 'popular';

export type SearchTab = 'recipes' | 'products';

export const quickFilters: Record<SearchTab, QuickFilter[]> = {
  recipes: ['mine', 'frequent', 'popular'],
  products: ['frequent'],
};

/** `recent`: senza testo, gli alimenti usati di recente nei pasti invece dei suggeriti. */
export const searchProducts = async (q?: string, recent = false) => {
  const params = new URLSearchParams({ ...(q && { q }), ...(recent && { recent: 'true' }) });
  return (await invoke<{ products: Product[] }>(`search-products?${params}`, { method: 'GET' })).products;
};

export const searchRecipes = async (q: string | undefined, tags: string[], recent = false) => {
  const params = new URLSearchParams({
    ...(q && { q }),
    ...(tags.length && { tags: tags.join(',') }),
    ...(recent && { recent: 'true' }),
  });
  return (await invoke<{ recipes: Recipe[] }>(`search-recipes?${params}`, { method: 'GET' })).recipes;
};

export const fetchProductByBarcode = async (barcode: string) =>
  (await invoke<{ product: Product }>(`get-product-by-barcode?barcode=${barcode}`, { method: 'GET' })).product;

/** Filtri scelti nello sheet e usati da Cerca: schermate diverse, stato nel layout radice. */
export const SearchFiltersContext = createContext<{
  tags: string[];
  setTags: (tags: string[]) => void;
}>({ tags: [], setTags: () => {} });

export const useSearchFilters = () => useContext(SearchFiltersContext);
