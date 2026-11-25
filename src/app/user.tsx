import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DetailLayout, DetailScreen, useFocusData } from '@/components/food-detail';
import { FollowButton } from '@/components/follow-button';
import { PostCard, usePosts } from '@/components/post-card';
import { ProfileEmpty, ProfileSummary, RecipeGrid } from '@/components/profile-summary';
import { SegmentedControl } from '@/components/segmented-control';
import { t } from '@/lib/i18n';
import { fetchUserProfile, type UserProfile } from '@/lib/profile';
import { spacing } from '@/theme';

const sections = ['recipes', 'posts'] as const;
type Section = (typeof sections)[number];

/** Profilo utente visto dagli altri (get-user-profile): Segui, contatori, ricette pubbliche e post visibili. */
export default function UserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, retry } = useFocusData(() => fetchUserProfile(id), id);

  return (
    <DetailScreen loaded={!!data} error={error} onRetry={retry}>
      {/* key: se "Segui" è cambiato in un'altra schermata, riparte dallo stato ricaricato. */}
      {data && <UserContent key={String(data.profile.is_following)} data={data} />}
    </DetailScreen>
  );
}

function UserContent({ data }: { data: UserProfile }) {
  const { profile } = data;
  const [section, setSection] = useState<Section>('recipes');
  const [following, setFollowing] = useState(profile.is_following);
  const { posts, setPosts, toggleLike } = usePosts();

  // Ricaricati a ogni focus (useFocusData): Mi piace e commenti cambiano nella sheet `feedback`.
  useEffect(() => setPosts(data.posts), [data, setPosts]);

  // Il contatore segue il pulsante subito, come lo stato di "Segui".
  const followers = data.stats.followers_count + Number(following) - Number(profile.is_following);
  const recipes = data.recipes.map((r) => ({ ...r, is_draft: false, is_private: false }));

  return (
    <DetailLayout>
      {/* Accanto al pulsante indietro fisso di DetailLayout. */}
      <View style={styles.topBar}>
        {!profile.is_me && <FollowButton userId={profile.id} following={following} onChange={setFollowing} />}
      </View>

      <ProfileSummary user={profile} stats={{ ...data.stats, followers_count: followers }} />

      <SegmentedControl
        options={sections}
        value={section}
        onChange={setSection}
        label={(value) => t(`userProfile.sections.${value}`)}
      />

      {section === 'recipes' && recipes.length ? (
        <RecipeGrid recipes={recipes} />
      ) : section === 'posts' && posts?.length ? (
        <View style={styles.posts}>
          {posts.map((post) => (
            // Senza id: l'autore è già il profilo aperto.
            <PostCard
              key={post.id}
              post={post}
              author={{ nickname: profile.nickname, avatar_url: profile.avatar_url }}
              onLike={() => toggleLike(post)}
            />
          ))}
        </View>
      ) : (
        <ProfileEmpty text={t(`profile.empty.${section}`)} />
      )}
    </DetailLayout>
  );
}

const styles = StyleSheet.create({
  topBar: {
    // Sovrapposta allo spazio del pulsante indietro (BackButtonSpace, alto 44).
    marginTop: -44 - spacing.lg,
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  posts: {
    gap: spacing.lg,
  },
});
