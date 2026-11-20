import { invoke, type Community, type MyPost } from '@/lib/profile';

/** get-post-feed: post della Home, con l'autore (following = l'utente lo segue). */
export type FeedPost = MyPost & {
  author: { id: string; nickname: string; avatar_url: string | null; following: boolean };
};

export const FEED_PAGE_SIZE = 20;

/** community: chip scelto ('general' = Generale); null = tutti i visibili. anchor: quello della prima pagina. */
export async function fetchPostFeed(community: Community | 'general' | null, anchor: string | undefined, offset: number) {
  const params = new URLSearchParams({ offset: String(offset), limit: String(FEED_PAGE_SIZE) });
  if (community) params.set('community', community);
  if (anchor) params.set('anchor', anchor);
  return invoke<{ anchor: string; posts: FeedPost[] }>(`get-post-feed?${params}`, { method: 'GET' });
}

/** mark-feed-seen: al massimo 50 id per chiamata. */
export const markFeedSeen = (postIds: string[]) => invoke<{ ok: true }>('mark-feed-seen', { method: 'POST', body: { post_ids: postIds } });

// La Home ricarica il feed al ritorno se un post è stato pubblicato o modificato altrove (Nuovo post).
let stale = false;
export const markFeedStale = () => {
  stale = true;
};
export function takeFeedStale() {
  const was = stale;
  stale = false;
  return was;
}
