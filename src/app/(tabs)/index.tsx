import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ChoiceButton } from '@/components/choice-button';
import { FollowButton } from '@/components/follow-button';
import { GlassSurface } from '@/components/glass-surface';
import { Icon } from '@/components/icon';
import { PostCard, usePosts } from '@/components/post-card';
import { RecipeFeedCard } from '@/components/recipe-feed-card';
import { SegmentedControl } from '@/components/segmented-control';
import {
  fetchPostFeed,
  fetchRecipeFeed,
  saveRecipe,
  takeAddedToMeal,
  useFeed,
  type FeedPost,
  type FeedRecipe,
} from '@/lib/feed';
import { t } from '@/lib/i18n';
import { useProfile, type Community } from '@/lib/profile';
import { useSearchFilters } from '@/lib/search';
import { backgroundGradient, colors, radius, spacing, tabBarHeight, typography } from '@/theme';

const sections = ['recipes', 'posts'] as const;
type Section = (typeof sections)[number];
type Chip = Community | 'general';

/**
 * Home: tab Ricette e Post, due feed personalizzati (get-recipe-feed, get-post-feed) a pagine con lo stesso anchor.
 * Ricette: filtri per tag condivisi con Cerca (sheet `search-filters`). Post: chi ha community sceglie con i chip una
 * sua community o Generale; chi non ne ha vede solo Generale, senza chip. Gli elementi mostrati vanno a mark-feed-seen.
 */
export default function Home() {
  const { profile } = useProfile();
  const insets = useSafeAreaInsets();
  const { tags } = useSearchFilters();
  const [section, setSection] = useState<Section>('recipes');
  const chips: Chip[] = profile?.communities.length ? [...profile.communities, 'general'] : [];
  const [chip, setChip] = useState<Chip>();
  // Il chip scelto può sparire se l'utente lascia la community dalle Impostazioni: si torna al primo.
  const selected = chip && chips.includes(chip) ? chip : chips[0];

  const { posts, setPosts, toggleLike } = usePosts<FeedPost>();
  const [recipes, setRecipes] = useState<FeedRecipe[]>();
  const postFeed = useFeed('post', fetchPostFeed, setPosts);
  const recipeFeed = useFeed('recipe', fetchRecipeFeed, setRecipes);
  const [refreshing, setRefreshing] = useState(false);

  const showPosts = section === 'posts';
  const feed = showPosts ? postFeed : recipeFeed;
  const items: (FeedPost | FeedRecipe)[] | undefined = showPosts ? posts : recipes;
  // Chiave del feed mostrato: cambiarla (chip, filtri) ricarica da capo.
  const key = showPosts ? (selected ?? null) : tags.join(',') || null;

  const { refreshIfNeeded } = feed;
  const flushPosts = postFeed.flushSeen;
  const flushRecipes = recipeFeed.flushSeen;
  // Al focus e a ogni cambio di tab o di chiave: prima lettura o ricarica se serve, e le ricette aggiunte a un pasto
  // altrove diventano "Aggiunto a pasto". Uscendo si mandano i visti rimasti.
  useFocusEffect(
    useCallback(() => {
      const added = takeAddedToMeal();
      if (added.length) setRecipes((list) => list?.map((r) => (added.includes(r.id) ? { ...r, in_meal_today: true } : r)));
      refreshIfNeeded(key);
      return () => {
        flushPosts();
        flushRecipes();
      };
    }, [refreshIfNeeded, key, flushPosts, flushRecipes]),
  );

  async function refresh() {
    setRefreshing(true);
    await feed.load(key, true);
    setRefreshing(false);
  }

  // Seguire un autore vale per tutti i suoi post e le sue ricette.
  function setFollowing(authorId: string, following: boolean) {
    const update = <T extends FeedPost | FeedRecipe>(list: T[] | undefined) =>
      list?.map((item) => (item.author?.id === authorId ? { ...item, author: { ...item.author, following } } : item));
    setPosts(update);
    setRecipes(update);
  }

  // Ottimistico: torna com'era se save-recipe fallisce.
  function toggleSave(recipe: FeedRecipe) {
    const setSaved = (saved: boolean) => setRecipes((list) => list?.map((r) => (r.id === recipe.id ? { ...r, saved } : r)));
    setSaved(!recipe.saved);
    saveRecipe(recipe.id, !recipe.saved).catch(() => {
      setSaved(recipe.saved);
      Alert.alert(t('home.recipe.saveFailed'), t('authErrors.generic'));
    });
  }

  function renderItem({ item }: { item: FeedPost | FeedRecipe }) {
    const own = item.author?.id === profile?.id;
    if (!('body' in item)) {
      return (
        <RecipeFeedCard
          recipe={item}
          own={own}
          onFollow={(following) => setFollowing(item.author!.id, following)}
          onSave={() => toggleSave(item)}
        />
      );
    }
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
  }

  // Su iOS il tab Home non ha gli inset automatici (_layout.tsx): la tab bar è a carico della lista.
  const bottomInset = insets.bottom + (Platform.OS === 'ios' ? tabBarHeight : 0);

  return (
    <FlatList
      // Una lista per tab: onViewableItemsChanged non può cambiare sulla stessa FlatList.
      key={section}
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl, paddingBottom: bottomInset + spacing.xl }]}
      scrollIndicatorInsets={{ top: insets.top, bottom: bottomInset }}
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      onViewableItemsChanged={feed.onViewableItemsChanged}
      viewabilityConfig={{ itemVisiblePercentThreshold: 60, minimumViewTime: 500 }}
      onEndReached={() => items && feed.load(key, false)}
      onEndReachedThreshold={0.5}
      refreshing={refreshing}
      onRefresh={refresh}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.topBar}>
            <Text style={typography.screenTitle} accessibilityRole="header">
              Foodity
            </Text>
            {!showPosts && (
              <Pressable
                onPress={() => router.push('/search-filters')}
                accessibilityRole="button"
                accessibilityLabel={t('search.filters', { count: tags.length })}
                hitSlop={spacing.sm}>
                <GlassSurface interactive style={styles.roundButton}>
                  <Icon sf="line.3.horizontal.decrease" md="filter_list" size={24} tintColor={tags.length ? colors.primary : colors.text} />
                </GlassSurface>
              </Pressable>
            )}
          </View>
          <SegmentedControl options={sections} value={section} onChange={setSection} label={(value) => t(`home.sections.${value}`)} />
          {showPosts && chips.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsScroll}
              contentContainerStyle={styles.chips}>
              {chips.map((value) => (
                <ChoiceButton
                  key={value}
                  label={t(value === 'general' ? 'newPost.general' : `profileSetup.communities.${value}`)}
                  selected={value === selected}
                  onPress={() => setChip(value)}
                  style={styles.chip}
                />
              ))}
            </ScrollView>
          )}
        </View>
      }
      ListEmptyComponent={
        feed.error ? (
          <View style={styles.empty}>
            <Text style={styles.message}>{t(showPosts ? 'home.loadFailed' : 'home.recipesLoadFailed')}</Text>
            <Button title={t('common.retry')} onPress={() => feed.load(key, true)} />
          </View>
        ) : items ? (
          <View style={styles.empty}>
            <Text style={typography.title}>{t(showPosts ? 'home.noPosts' : 'home.noRecipes')}</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  roundButton: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Riga unica: su schermi stretti scorre, sbordando nel padding della lista fino ai bordi.
  chipsScroll: {
    marginHorizontal: -spacing.xl,
  },
  chips: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
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
