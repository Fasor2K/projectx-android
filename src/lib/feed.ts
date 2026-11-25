import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { invoke, type MyPost } from '@/lib/profile';
import type { Recipe } from '@/lib/search';

type Author = { id: string; nickname: string; avatar_url: string | null; following: boolean };

/** get-post-feed: post della Home, con l'autore (following = l'utente lo segue). */
export type FeedPost = MyPost & { author: Author };

/** get-recipe-feed: card di Cerca più autore (null = account eliminato), salvata e "in un pasto di oggi". */
export type FeedRecipe = Recipe & { published_at: string; author: Author | null; saved: boolean; in_meal_today: boolean };

export type FeedKind = 'post' | 'recipe';

export const FEED_PAGE_SIZE = 20;
const SEEN_BATCH = 10;

const pageParams = (anchor: string | undefined, offset: number) =>
  new URLSearchParams({ offset: String(offset), limit: String(FEED_PAGE_SIZE), ...(anchor && { anchor }) });

/** community: chip scelto (una community o 'general' = Generale); null = tutti i visibili. anchor: quello della prima pagina. */
export async function fetchPostFeed(community: string | null, anchor: string | undefined, offset: number) {
  const params = pageParams(anchor, offset);
  if (community) params.set('community', community);
  const r = await invoke<{ anchor: string; posts: FeedPost[] }>(`get-post-feed?${params}`, { method: 'GET' });
  return { anchor: r.anchor, items: r.posts };
}

/** tags: slug separati da virgola (filtri condivisi con Cerca); null o '' = nessun filtro. */
export async function fetchRecipeFeed(tags: string | null, anchor: string | undefined, offset: number) {
  const params = pageParams(anchor, offset);
  if (tags) params.set('tags', tags);
  const r = await invoke<{ anchor: string; recipes: FeedRecipe[] }>(`get-recipe-feed?${params}`, { method: 'GET' });
  return { anchor: r.anchor, items: r.recipes };
}

/** mark-feed-seen: al massimo 50 id per chiamata. */
const markFeedSeen = (kind: FeedKind, ids: string[]) =>
  invoke<{ ok: true }>('mark-feed-seen', { method: 'POST', body: { [`${kind}_ids`]: ids } });

export const saveRecipe = (recipeId: string, save: boolean) =>
  invoke<{ saved: boolean }>('save-recipe', { method: 'POST', body: { recipe_id: recipeId, save } });

// Segnali per la Home da altre schermate, letti al ritorno sulla Home.
const stale = new Set<FeedKind>();
/** Un post o una ricetta è stato pubblicato o modificato: la Home ricarica quel feed. */
export const markFeedStale = (kind: FeedKind) => stale.add(kind);
export const takeFeedStale = (kind: FeedKind) => stale.delete(kind);

const addedToMeal = new Set<string>();
/** Ricetta aggiunta a un pasto di oggi (Aggiungi a pasto): la sua card diventa "Aggiunto a pasto". */
export const markAddedToMeal = (recipeId: string) => addedToMeal.add(recipeId);
export function takeAddedToMeal() {
  const ids = [...addedToMeal];
  addedToMeal.clear();
  return ids;
}

/**
 * Feed della Home a pagine con lo stesso anchor, per `key` (chip della community o tag): la lista sta in `setItems`
 * del chiamante. `onViewableItemsChanged` manda gli elementi mostrati a mark-feed-seen a gruppi; `flushSeen` i rimasti.
 * `fetchPage` deve essere una funzione stabile (di modulo).
 */
export function useFeed<T extends { id: string }>(
  kind: FeedKind,
  fetchPage: (key: string | null, anchor: string | undefined, offset: number) => Promise<{ anchor: string; items: T[] }>,
  setItems: Dispatch<SetStateAction<T[] | undefined>>,
) {
  const [error, setError] = useState(false);
  // token: le risposte di una lettura superata (filtro cambiato, ricarica) si scartano; 0 = mai letto.
  // key: quella dell'ultima prima pagina, per ricaricare se cambia fuori dalla Home (community, filtri di Cerca).
  const page = useRef({
    anchor: undefined as string | undefined,
    fetched: 0,
    done: false,
    loading: false,
    token: 0,
    key: null as string | null,
  });

  /** reset = prima pagina con un nuovo anchor (e lista svuotata); altrimenti la pagina successiva. */
  const load = useCallback(
    async (key: string | null, reset: boolean) => {
      const p = page.current;
      if (!reset && (p.loading || p.done)) return;
      if (reset) Object.assign(p, { anchor: undefined, fetched: 0, done: false, token: p.token + 1, key });
      const token = p.token;
      p.loading = true;
      try {
        const r = await fetchPage(key, p.anchor, p.fetched);
        if (token !== p.token) return;
        p.anchor = r.anchor;
        p.fetched += r.items.length;
        p.done = r.items.length < FEED_PAGE_SIZE;
        // Tra una pagina e l'altra l'ordine può cambiare di poco: si deduplica per id.
        setItems((list) => (reset || !list ? r.items : [...list, ...r.items.filter((n) => !list.some((o) => o.id === n.id))]));
        setError(false);
      } catch {
        if (token === p.token) setError(true);
      } finally {
        if (token === p.token) p.loading = false;
      }
    },
    [fetchPage, setItems],
  );

  /** Carica la prima pagina se non è mai stata letta, se la chiave è cambiata (lista svuotata) o se il feed è da ricaricare. */
  const refreshIfNeeded = useCallback(
    (key: string | null) => {
      const p = page.current;
      const changed = p.token !== 0 && p.key !== key;
      if (changed) {
        setItems(undefined);
        setError(false);
      }
      if (takeFeedStale(kind) || p.token === 0 || changed) load(key, true);
    },
    [kind, load, setItems],
  );

  const seen = useRef(new Set<string>());
  const pending = useRef<string[]>([]);
  const flushSeen = useCallback(() => {
    const ids = pending.current.splice(0);
    if (ids.length) markFeedSeen(kind, ids).catch(() => {});
  }, [kind]);
  // Deve restare la stessa funzione per tutta la vita della FlatList (flushSeen non cambia).
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { item: T }[] }) => {
      for (const { item } of viewableItems) {
        if (seen.current.has(item.id)) continue;
        seen.current.add(item.id);
        pending.current.push(item.id);
      }
      if (pending.current.length >= SEEN_BATCH) flushSeen();
    },
    [flushSeen],
  );

  return { error, setError, load, refreshIfNeeded, flushSeen, onViewableItemsChanged };
}
