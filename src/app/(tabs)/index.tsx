import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ChoiceButton } from '@/components/choice-button';
import { FollowButton } from '@/components/follow-button';
import { PostCard, usePosts } from '@/components/post-card';
import { SegmentedControl } from '@/components/segmented-control';
import { FEED_PAGE_SIZE, fetchPostFeed, markFeedSeen, takeFeedStale, type FeedPost } from '@/lib/feed';
import { t } from '@/lib/i18n';
import { useProfile, type Community } from '@/lib/profile';
import { backgroundGradient, colors, radius, spacing, typography } from '@/theme';

const sections = ['recipes', 'posts'] as const;
type Section = (typeof sections)[number];
type Chip = Community | 'general';

const SEEN_BATCH = 10;

/**
 * Home: tab Ricette (vuoto per ora) e Post, il feed personalizzato (get-post-feed) a pagine con lo stesso anchor.
 * Chi ha community sceglie con i chip una sua community o Generale; chi non ne ha vede solo Generale, senza chip.
 * I post mostrati sullo schermo si mandano a mark-feed-seen a gruppi.
 */
export default function Home() {
  const { profile } = useProfile();
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState<Section>('posts');
  const chips: Chip[] = profile?.communities.length ? [...profile.communities, 'general'] : [];
  const [chip, setChip] = useState<Chip>();
  // Il chip scelto può sparire se l'utente lascia la community dalle Impostazioni: si torna al primo.
  const selected = chip && chips.includes(chip) ? chip : chips[0];
  const community = selected ?? null;

  const { posts, setPosts, toggleLike } = usePosts<FeedPost>();
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // token: le risposte di una lettura superata (chip cambiato, ricarica) si scartano; 0 = mai letto.
  // community: quella dell'ultima prima pagina, per ricaricare se l'utente cambia community dalle Impostazioni.
  const page = useRef({
    anchor: undefined as string | undefined,
    fetched: 0,
    done: false,
    loading: false,
    token: 0,
    community: null as Chip | null,
  });

  /** reset = prima pagina con un nuovo anchor; altrimenti la pagina successiva. */
  const load = useCallback(
    async (feedCommunity: Chip | null, reset: boolean) => {
      const p = page.current;
      if (!reset && (p.loading || p.done)) return;
      if (reset) Object.assign(p, { anchor: undefined, fetched: 0, done: false, token: p.token + 1, community: feedCommunity });
      const token = p.token;
      p.loading = true;
      try {
        const r = await fetchPostFeed(feedCommunity, p.anchor, p.fetched);
        if (token !== p.token) return;
        p.anchor = r.anchor;
        p.fetched += r.posts.length;
        p.done = r.posts.length < FEED_PAGE_SIZE;
        // Tra una pagina e l'altra l'ordine può cambiare di poco: si deduplica per id.
        setPosts((list) => (reset || !list ? r.posts : [...list, ...r.posts.filter((n) => !list.some((o) => o.id === n.id))]));
        setError(false);
      } catch {
        if (token === p.token) setError(true);
      } finally {
        if (token === p.token) p.loading = false;
      }
    },
    [setPosts],
  );

  const seen = useRef(new Set<string>());
  const pending = useRef<string[]>([]);
  const flushSeen = useCallback(() => {
    const ids = pending.current.splice(0);
    if (ids.length) markFeedSeen(ids).catch(() => {});
  }, []);
  // Deve restare la stessa funzione per tutta la vita della FlatList (flushSeen non cambia).
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { item: FeedPost }[] }) => {
      for (const { item } of viewableItems) {
        if (seen.current.has(item.id)) continue;
        seen.current.add(item.id);
        pending.current.push(item.id);
      }
      if (pending.current.length >= SEEN_BATCH) flushSeen();
    },
    [flushSeen],
  );

  // Prima lettura, e al ritorno sulla Home se un post è stato pubblicato o modificato o sono cambiate le community;
  // uscendo manda i visti rimasti.
  useFocusEffect(
    useCallback(() => {
      const p = page.current;
      if (takeFeedStale() || p.token === 0 || p.community !== community) load(community, true);
      return flushSeen;
    }, [load, flushSeen, community]),
  );

  function selectChip(value: Chip) {
    if (value === selected) return;
    setChip(value);
    setPosts(undefined);
    setError(false);
    load(value, true);
  }

  async function refresh() {
    setRefreshing(true);
    await load(community, true);
    setRefreshing(false);
  }

  function setFollowing(authorId: string, following: boolean) {
    setPosts((list) => list?.map((p) => (p.author.id === authorId ? { ...p, author: { ...p.author, following } } : p)));
  }

  const showPosts = section === 'posts';

  return (
    <FlatList
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}
      scrollIndicatorInsets={{ top: insets.top, bottom: insets.bottom }}
      data={showPosts ? posts : []}
      keyExtractor={(post) => post.id}
      renderItem={({ item }) => {
        const own = item.author.id === profile?.id;
        return (
          <PostCard
            post={item}
            author={item.author}
            onLike={() => toggleLike(item)}
            onDeleted={own ? () => setPosts((list) => list?.filter((p) => p.id !== item.id)) : undefined}
            action={
              !own && (
                <FollowButton
                  userId={item.author.id}
                  following={item.author.following}
                  onChange={(following) => setFollowing(item.author.id, following)}
                />
              )
            }
          />
        );
      }}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={{ itemVisiblePercentThreshold: 60, minimumViewTime: 500 }}
      onEndReached={() => showPosts && posts && load(community, false)}
      onEndReachedThreshold={0.5}
      refreshing={refreshing}
      onRefresh={showPosts ? refresh : undefined}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.topBar}>
            <Text style={typography.brand} accessibilityRole="header">
              Foodity
            </Text>
          </View>
          <SegmentedControl options={sections} value={section} onChange={setSection} label={(value) => t(`home.sections.${value}`)} />
          {showPosts && chips.length > 0 && (
            <View style={styles.chips}>
              {chips.map((value) => (
                <ChoiceButton
                  key={value}
                  label={t(value === 'general' ? 'newPost.general' : `profileSetup.communities.${value}`)}
                  selected={value === selected}
                  onPress={() => selectChip(value)}
                  style={styles.chip}
                />
              ))}
            </View>
          )}
        </View>
      }
      ListEmptyComponent={
        !showPosts ? undefined : error ? (
          <View style={styles.empty}>
            <Text style={styles.message}>{t('home.loadFailed')}</Text>
            <Button title={t('common.retry')} onPress={() => load(community, true)} />
          </View>
        ) : posts ? (
          <View style={styles.empty}>
            <Text style={typography.title}>{t('home.noPosts')}</Text>
          </View>
        ) : (
          <ActivityIndicator style={styles.empty} color={colors.primary} />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundImage: backgroundGradient,
  },
  content: {
    flexGrow: 1,
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  header: {
    gap: spacing.lg,
  },
  topBar: {
    minHeight: 48,
    justifyContent: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 0,
  },
  empty: {
    flex: 1,
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  message: {
    ...typography.body,
    textAlign: 'center',
  },
});
