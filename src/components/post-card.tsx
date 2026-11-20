import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, Image, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { timeAgo } from '@/lib/food';
import { t } from '@/lib/i18n';
import { deletePost, likePost, type MyPost } from '@/lib/profile';
import { colors, radius, spacing, typography } from '@/theme';

const AVATAR_SIZE = 36;

type Props = {
  post: MyPost;
  author: { nickname: string; avatar_url: string | null };
  onLike: () => void;
  /** Solo per i propri post: mostra il menu "…" (Modifica, Elimina) ed è chiamata dopo l'eliminazione. */
  onDeleted?: () => void;
  /** In alto a destra al posto del menu (es. "Segui"). */
  action?: ReactNode;
};

/** Post (Profilo, Home): autore, tempo e visibilità, testo, foto, Mi piace, commenti (sheet `feedback`), condividi. */
export function PostCard({ post, author, onLike, onDeleted, action }: Props) {
  const general = post.community === null;

  function confirmDelete() {
    Alert.alert(t('profile.post.deleteTitle'), t('profile.post.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.post.delete'),
        style: 'destructive',
        onPress: () => deletePost(post.id).then(onDeleted, () => Alert.alert(t('profile.post.deleteFailed'), t('authErrors.generic'))),
      },
    ]);
  }

  function openMenu() {
    Alert.alert(t('profile.post.menu'), undefined, [
      {
        text: t('profile.post.edit'),
        onPress: () =>
          router.push({
            pathname: '/new-post',
            params: { id: post.id, body: post.body, community: post.community ?? '', image_url: post.image_url ?? '' },
          }),
      },
      { text: t('profile.post.delete'), style: 'destructive', onPress: confirmDelete },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.avatar}>
          {author.avatar_url ? (
            <Image source={{ uri: author.avatar_url }} style={StyleSheet.absoluteFill} />
          ) : (
            <Icon sf="person.fill" md="person" size={20} tintColor={colors.textMuted} />
          )}
        </View>
        <View style={styles.author}>
          <Text style={styles.nickname}>{author.nickname}</Text>
          <View style={styles.meta}>
            <Text style={typography.caption}>{timeAgo(post.created_at)} • </Text>
            <Icon sf={general ? 'globe' : 'lock'} md={general ? 'public' : 'lock'} size={12} tintColor={colors.textSecondary} />
            <Text style={typography.caption}>
              {t(general ? 'newPost.general' : `profileSetup.communities.${post.community}`)}
            </Text>
          </View>
        </View>
        {onDeleted ? (
          <Pressable onPress={openMenu} accessibilityRole="button" accessibilityLabel={t('profile.post.more')} hitSlop={spacing.md}>
            <Icon sf="ellipsis" md="more_horiz" size={20} tintColor={colors.text} />
          </Pressable>
        ) : (
          action
        )}
      </View>

      <Text style={styles.body}>{post.body}</Text>
      {post.image_url && <Image source={{ uri: post.image_url }} style={styles.image} accessibilityIgnoresInvertColors />}

      <View style={styles.actions}>
        <Pressable
          onPress={onLike}
          accessibilityRole="button"
          accessibilityLabel={t('profile.post.likes', { count: post.likes_count })}
          accessibilityState={{ selected: post.liked }}
          hitSlop={spacing.sm}
          style={styles.count}>
          <Icon
            sf={post.liked ? 'heart.fill' : 'heart'}
            md="favorite"
            size={22}
            tintColor={post.liked ? colors.danger : colors.textSecondary}
          />
          <Text style={typography.caption}>{post.likes_count}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push({ pathname: '/feedback', params: { post_id: post.id } })}
          accessibilityRole="button"
          accessibilityLabel={t('profile.post.comments', { count: post.comments_count })}
          hitSlop={spacing.sm}
          style={styles.count}>
          <Icon sf="bubble.left" md="chat_bubble" size={20} tintColor={colors.textSecondary} />
          <Text style={typography.caption}>{post.comments_count}</Text>
        </Pressable>
        <Pressable
          onPress={() => Share.share({ message: post.body })}
          accessibilityRole="button"
          accessibilityLabel={t('profile.post.share')}
          hitSlop={spacing.md}
          style={styles.share}>
          <Icon sf="paperplane" md="send" size={20} tintColor={colors.textSecondary} />
        </Pressable>
      </View>
    </Card>
  );
}

/** Lista di post con il Mi piace ottimistico: il cuore cambia subito e torna com'era se like-post fallisce. */
export function usePosts<T extends MyPost>() {
  const [posts, setPosts] = useState<T[]>();

  const updatePost = (id: string, changes: Partial<T>) =>
    setPosts((list) => list?.map((p) => (p.id === id ? { ...p, ...changes } : p)));

  function toggleLike(post: T) {
    const liked = !post.liked;
    updatePost(post.id, { liked, likes_count: post.likes_count + (liked ? 1 : -1) } as Partial<T>);
    likePost(post.id, liked).then(
      (r) => updatePost(post.id, r as Partial<T>),
      () => updatePost(post.id, { liked: post.liked, likes_count: post.likes_count } as Partial<T>),
    );
  }

  return { posts, setPosts, toggleLike };
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
  },
  author: {
    flex: 1,
  },
  nickname: {
    ...typography.label,
    fontSize: 15,
    fontWeight: '400',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  body: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 23,
    color: colors.text,
  },
  image: {
    width: '100%',
    aspectRatio: 2,
    borderRadius: radius.md,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  count: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  share: {
    marginLeft: 'auto',
  },
});
