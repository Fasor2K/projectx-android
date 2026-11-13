import { createContext, useContext, useEffect, useState } from 'react';

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

const SEARCH_DELAY_MS = 300;

type Results = { key: string; tab: SearchTab; recipes: Recipe[]; products: Product[]; recent?: boolean; failed?: boolean };

/**
 * Ricerca di Cerca e di Aggiungi ingrediente, con un ritardo mentre si scrive. Senza testo (`q` assente) mostra i
 * recenti e, se non ce ne sono, i suggeriti (`recent` = false). `enabled` false: nessuna richiesta e nessun risultato.
 */
export function useFoodSearch(tab: SearchTab, q: string | undefined, tags: string[], enabled = true) {
  const [attempt, setAttempt] = useState(0);
  const [results, setResults] = useState<Results>();
  const key = JSON.stringify([tab, q, tab === 'recipes' ? tags : [], attempt]);

  useEffect(() => {
    if (!enabled) return;
    let stale = false;
    const timer = setTimeout(async () => {
      try {
        const run = async (recent: boolean) => ({
          recipes: tab === 'recipes' ? await searchRecipes(q, tags, recent) : [],
          products: tab === 'products' ? await searchProducts(q, recent) : [],
        });
        let recent = !q;
        let found = await run(recent);
        if (recent && found.recipes.length + found.products.length === 0) {
          recent = false;
          found = await run(false);
        }
        if (!stale) setResults({ key, tab, ...found, recent });
      } catch {
        if (!stale) setResults({ key, tab, recipes: [], products: [], failed: true });
      }
    }, SEARCH_DELAY_MS);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
    // key contiene già tab, q, tags e attempt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  // I risultati dell'altro tab non si mostrano mentre arrivano quelli nuovi.
  const current = results?.tab === tab && enabled ? results : undefined;
  const loading = enabled && results?.key !== key;
  return {
    recipes: current?.recipes ?? [],
    products: current?.products ?? [],
    recent: current?.recent,
    loading,
    failed: enabled && !loading && !!results?.failed,
    retry: () => setAttempt((a) => a + 1),
  };
}
