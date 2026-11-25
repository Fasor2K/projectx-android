import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { GlassSurface } from '@/components/glass-surface';
import { Icon } from '@/components/icon';
import { PostCard, usePosts } from '@/components/post-card';
import { ProfileEmpty, ProfileSummary, RecipeGrid } from '@/components/profile-summary';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { saveRecipe } from '@/lib/feed';
import { t } from '@/lib/i18n';
import {
  fetchMyPosts,
  fetchMyRecipes,
  fetchSavedRecipes,
  fetchProfileStats,
  useProfile,
  type MyPost,
  type MyRecipe,
  type ProfileStats,
} from '@/lib/profile';
import { colors, radius, spacing, typography } from '@/theme';

const sections = ['recipes', 'saved', 'posts'] as const;
type Section = (typeof sections)[number];

/** Profilo dell'utente loggato: contatori, le sue ricette, le ricette salvate e i suoi post. */
export default function Profile() {
  const { profile } = useProfile();
  const [stats, setStats] = useState<ProfileStats>();
  const [recipes, setRecipes] = useState<MyRecipe[]>();
  const [saved, setSaved] = useState<MyRecipe[]>();
  const { posts, setPosts, toggleLike } = usePosts<MyPost>();
  const [section, setSection] = useState<Section>('recipes');

  // Ricaricati a ogni ritorno sul tab: i contatori cambiano da altre schermate.
  useFocusEffect(
    useCallback(() => {
      fetchProfileStats().then(setStats, () => {});
      fetchMyRecipes().then(setRecipes, () => {});
      fetchSavedRecipes().then(setSaved, () => {});
      fetchMyPosts().then(setPosts, () => {});
    }, [setPosts]),
  );

  // Pressione prolungata su una ricetta salvata: la toglie dai salvati dopo conferma.
  function confirmUnsave(recipe: MyRecipe) {
    Alert.alert(t('profile.unsave.title'), recipe.title ?? undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.unsave.confirm'),
        style: 'destructive',
        onPress: () =>
          saveRecipe(recipe.id, false).then(
            () => setSaved((list) => list?.filter((r) => r.id !== recipe.id)),
            () => Alert.alert(t('home.recipe.saveFailed')),
          ),
      },
    ]);
  }

  if (!profile) return null;

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Text style={typography.screenTitle} accessibilityRole="header">
          {t('profile.title')}
        </Text>
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel={t('profile.settings')}
          hitSlop={spacing.sm}>
          <GlassSurface interactive style={styles.settingsSurface}>
            <Icon sf="gearshape" md="settings" size={24} tintColor={colors.text} />
          </GlassSurface>
        </Pressable>
      </View>

      <ProfileSummary user={profile} stats={stats} />

      <SegmentedControl
        options={sections}
        value={section}
        onChange={setSection}
        label={(value) => t(`profile.sections.${value}`)}
      />

      {section !== 'posts' && (section === 'recipes' ? recipes : saved)?.length ? (
        <RecipeGrid
          recipes={(section === 'recipes' ? recipes : saved)!}
          onLongPress={section === 'saved' ? confirmUnsave : undefined}
        />
      ) : section === 'posts' && posts?.length ? (
        <View style={styles.posts}>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              author={profile}
              showCommunity
              onDeleted={() => setPosts((list) => list?.filter((p) => p.id !== post.id))}
              onLike={() => toggleLike(post)}
            />
          ))}
        </View>
      ) : (
        <ProfileEmpty text={t(`profile.empty.${section}`)} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  settingsSurface: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posts: {
    gap: spacing.lg,
  },
});
