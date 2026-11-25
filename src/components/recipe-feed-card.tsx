import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Image, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Macros, recipeNutrition } from '@/components/food-card';
import { FollowButton } from '@/components/follow-button';
import { Icon } from '@/components/icon';
import type { FeedRecipe } from '@/lib/feed';
import { timeAgo } from '@/lib/food';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme';

const AVATAR_SIZE = 32;

type Props = {
  recipe: FeedRecipe;
  /** La ricetta è dell'utente: niente "Segui". */
  own: boolean;
  onFollow: (following: boolean) => void;
  onSave: () => void;
};

/**
 * Ricetta del feed della Home: foto con voto, autore e Segui, titolo, valori per 100 g, Condividi,
 * Aggiungi a pasto (sheet `meal-item`, blu se è già in un pasto di oggi) e Salva. Il tocco apre il dettaglio.
 */
export function RecipeFeedCard({ recipe: r, own, onFollow, onSave }: Props) {
  const nutrition = recipeNutrition(r);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/recipe', params: { id: r.id } })}
      accessibilityRole="button"
      accessibilityLabel={r.title}>
      <Card style={styles.card}>
        <View style={styles.cover}>
          {r.cover_image_url ? (
            <Image source={{ uri: r.cover_image_url }} style={StyleSheet.absoluteFill} accessibilityIgnoresInvertColors />
          ) : (
            <Icon sf="fork.knife" md="restaurant" size={40} tintColor={colors.textSecondary} />
          )}
          {r.rating_avg !== null && (
            <View style={styles.rating}>
              <Icon sf="star" md="star" size={15} tintColor={colors.rating} />
              <Text style={typography.label}>{t('food.rating', { value: r.rating_avg })}</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.author}>
            {r.author ? (
              <>
                <View style={styles.avatar}>
                  {r.author.avatar_url ? (
                    <Image source={{ uri: r.author.avatar_url }} style={StyleSheet.absoluteFill} />
                  ) : (
                    <Icon sf="person.fill" md="person" size={16} tintColor={colors.textMuted} />
                  )}
                </View>
                <View style={styles.grow}>
                  <Text style={styles.nickname} numberOfLines={1}>
                    {r.author.nickname}
                  </Text>
                  <Text style={typography.caption}>{timeAgo(r.published_at)}</Text>
                </View>
                {!own && <FollowButton userId={r.author.id} following={r.author.following} onChange={onFollow} />}
              </>
            ) : (
              <Text style={[typography.caption, styles.grow]}>{t('foodDetail.deletedAuthor')}</Text>
            )}
          </View>

          <Text style={typography.title}>{r.title}</Text>
          {r.guide_name && <Text style={typography.caption}>{t('food.perGuide', { name: r.guide_name })}</Text>}
          {nutrition ? <Macros nutrition={nutrition} /> : <Text style={typography.caption}>{t('food.noNutrition')}</Text>}

          <View style={styles.actions}>
            <Action
              sf="square.and.arrow.up"
              md="share"
              label={t('home.recipe.share')}
              onPress={() => Share.share({ message: r.title })}
            />
            <Action
              sf="fork.knife"
              md="restaurant"
              label={t(r.in_meal_today ? 'home.recipe.addedToMeal' : 'home.recipe.addToMeal')}
              active={r.in_meal_today}
              onPress={() => router.push({ pathname: '/meal-item', params: { recipe_id: r.id, stay: '1' } })}
            />
            <Action
              sf={r.saved ? 'bookmark.fill' : 'bookmark'}
              md="bookmark"
              label={t(r.saved ? 'home.recipe.saved' : 'home.recipe.save')}
              active={r.saved}
              onPress={onSave}
            />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

type ActionProps = Pick<ComponentProps<typeof Icon>, 'sf' | 'md'> & { label: string; active?: boolean; onPress: () => void };

function Action({ sf, md, label, active = false, onPress }: ActionProps) {
  const color = active ? colors.primary : colors.textSecondary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hitSlop={spacing.sm}
      style={styles.action}>
      <Icon sf={sf} md={md} size={18} tintColor={color} />
      <Text style={[styles.actionText, { color }, active && styles.actionTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
    gap: 0,
    overflow: 'hidden',
  },
  cover: {
    aspectRatio: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  rating: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  author: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  grow: {
    flex: 1,
  },
  nickname: {
    ...typography.label,
    fontWeight: '400',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  action: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionText: {
    ...typography.caption,
  },
  actionTextActive: {
    fontWeight: '600',
  },
});
