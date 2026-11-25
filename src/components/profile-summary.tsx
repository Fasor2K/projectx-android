import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { i18n, t } from '@/lib/i18n';
import { useProfile, type MyRecipe, type ProfileStats } from '@/lib/profile';
import { colors, radius, spacing, typography } from '@/theme';

const AVATAR_SIZE = 96;

type SummaryUser = {
  nickname: string;
  avatar_url: string | null;
  bio: string | null;
  /** null se il tipo di utente non è pubblico (get-user-profile). */
  is_diabetic: boolean | null;
  is_celiac: boolean | null;
  user_type_public: boolean;
};

/** Testata del Profilo e del Profilo utente: foto, nickname, descrizione, badge del tipo di utente e contatori. */
export function ProfileSummary({ user, stats }: { user: SummaryUser; stats: ProfileStats | undefined }) {
  const badges = [user.is_diabetic && 'profile.userTypes.diabetic', user.is_celiac && 'profile.userTypes.celiac'].filter(
    (b): b is string => !!b,
  );
  const number = new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: 1 });
  const compact = new Intl.NumberFormat(i18n.locale, { notation: 'compact', maximumFractionDigits: 1 });

  return (
    <>
      <View style={styles.identity}>
        <View style={styles.avatar}>
          {user.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={StyleSheet.absoluteFill} />
          ) : (
            <Icon sf="person.fill" md="person" size={40} tintColor={colors.textMuted} />
          )}
        </View>
        <View style={styles.identityText}>
          <Text style={styles.nickname}>{user.nickname}</Text>
          {user.bio && <Text style={typography.body}>{user.bio}</Text>}
          {/* Tipo di utente nascosto a tutti, anche a sé stessi, se user_type_public è false. */}
          {user.user_type_public && (
            <View style={styles.badges}>
              {(badges.length ? badges : ['profile.userTypes.generic']).map((badge) => (
                <Text key={badge} style={styles.badge}>
                  {t(badge)}
                </Text>
              ))}
            </View>
          )}
        </View>
      </View>

      <Card style={styles.stats}>
        <Stat value={stats && compact.format(stats.recipes_count)} label={t('profile.stats.recipes')} />
        <Stat
          value={
            stats &&
            (stats.rating_avg === null
              ? t('profile.stats.noRating')
              : t('profile.stats.ratingValue', { rating: number.format(stats.rating_avg) }))
          }
          label={t('profile.stats.rating')}
        />
        <Stat value={stats && compact.format(stats.followers_count)} label={t('profile.stats.followers')} />
      </Card>
    </>
  );
}

/** value undefined = contatori in caricamento. */
function Stat({ value, label }: { value: string | undefined; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={typography.title}>{value ?? '–'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** Griglia a tre colonne di ricette (Profilo, Profilo utente). */
export function RecipeGrid({ recipes, onLongPress }: { recipes: MyRecipe[]; onLongPress?: (recipe: MyRecipe) => void }) {
  return (
    <View style={styles.grid}>
      {recipes.map((recipe) => (
        <RecipeTile key={recipe.id} recipe={recipe} onLongPress={onLongPress && (() => onLongPress(recipe))} />
      ))}
    </View>
  );
}

/** Ricetta della griglia: foto (o fotocamera), icona bozza o lucchetto; le pubblicate aprono il dettaglio, le bozze il form. */
function RecipeTile({ recipe, onLongPress }: { recipe: MyRecipe; onLongPress?: () => void }) {
  const badge = recipe.is_draft
    ? ({ sf: 'doc.text', md: 'edit_note', label: t('profile.draft') } as const)
    : recipe.is_private
      ? ({ sf: 'lock', md: 'lock', label: t('profile.private') } as const)
      : undefined;
  const title: string = recipe.title ?? t('profile.untitled');
  return (
    <Pressable
      onPress={() =>
        recipe.is_draft
          ? router.push({ pathname: '/new-recipe', params: { draft: recipe.id } })
          : router.push({ pathname: '/recipe', params: { id: recipe.id } })
      }
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${title}, ${badge.label}` : title}
      accessibilityHint={onLongPress && t('profile.unsave.hint')}
      accessibilityActions={onLongPress && [{ name: 'longpress', label: t('profile.unsave.confirm') }]}
      onAccessibilityAction={onLongPress}
      style={styles.tile}>
      {recipe.cover_image_url ? (
        <Image source={{ uri: recipe.cover_image_url }} style={StyleSheet.absoluteFill} accessibilityIgnoresInvertColors />
      ) : (
        <Icon sf="camera" md="photo_camera" size={32} tintColor={colors.textSecondary} />
      )}
      {badge && (
        <View style={styles.tileBadge}>
          <Icon sf={badge.sf} md={badge.md} size={16} tintColor={colors.text} />
        </View>
      )}
    </Pressable>
  );
}

/** Testo centrato degli stati vuoti del Profilo ("Nessuna ricetta pubblicata"). */
export function ProfileEmpty({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={typography.title}>{text}</Text>
    </View>
  );
}

/**
 * Autore cliccabile (foto e nome): apre il Profilo utente, o il tab Profilo se è l'utente loggato.
 * `dismiss` chiude prima lo sheet da cui parte (es. `feedback`), così il profilo si apre sopra la schermata sotto.
 */
export function UserLink({
  userId,
  dismiss,
  style,
  children,
}: {
  userId: string;
  dismiss?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const { profile } = useProfile();
  return (
    <Pressable
      onPress={() => {
        if (dismiss) router.back();
        if (userId === profile?.id) router.navigate('/profile');
        else router.push({ pathname: '/user', params: { id: userId } });
      }}
      accessibilityRole="link"
      hitSlop={spacing.xs}
      style={[styles.userLink, style]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  identityText: {
    flex: 1,
    gap: spacing.xs,
  },
  nickname: {
    ...typography.title,
    fontSize: 22,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  badge: {
    ...typography.label,
    color: colors.onPrimary,
    backgroundColor: "#1d8acf",
    borderRadius: radius.pill,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  stats: {
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statLabel: {
    ...typography.caption,
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    // Tre per riga: (100% - 2 spazi) / 3.
    width: '31.5%',
    aspectRatio: 0.85,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.inputBorder,
  },
  tileBadge: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  empty: {
    flex: 1,
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 44,
  },
});
