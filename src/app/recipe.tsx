import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import {
  Cover,
  DetailLayout,
  DetailScreen,
  FeedbackLinks,
  InfoButton,
  Pill,
  PortionNutrition,
  Rating,
  useFocusData,
} from '@/components/food-detail';
import { GlassSurface } from '@/components/glass-surface';
import { Icon } from '@/components/icon';
import { defaultQuantity, isValidQuantity, parseQuantity } from '@/components/quantity-field';
import { SegmentedControl } from '@/components/segmented-control';
import { scaleNutrition, type Food, type QuantityMode } from '@/lib/diary';
import { FollowButton } from '@/components/follow-button';
import { fetchRecipe, formatIngredient, formatPrepTime, portionFactor, servingInfo, type RecipeDetail } from '@/lib/food';
import { t } from '@/lib/i18n';
import { deleteRecipe } from '@/lib/recipe-form';
import { colors, radius, spacing, typography } from '@/theme';

type IngredientsView = 'recipe' | 'mine';

/**
 * Dettaglio ricetta: autore e Segui, bilancio nutrizionale e ingredienti ricalcolati sulla quantità scelta
 * ("mia porzione"), procedimento, note, categorie, recensioni e segnalazioni, Aggiungi a pasto.
 * Sulle proprie ricette, accanto ad Aggiungi a pasto: modifica (riapre Nuova ricetta) ed elimina.
 */
export default function RecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: recipe, error, retry } = useFocusData(() => fetchRecipe(id), id);

  return (
    <DetailScreen loaded={!!recipe} error={error} onRetry={retry}>
      {recipe && <RecipeContent recipe={recipe} />}
    </DetailScreen>
  );
}

function RecipeContent({ recipe: r }: { recipe: RecipeDetail }) {
  const food: Food = {
    title: r.title,
    image_url: r.cover_image_url,
    ...r.nutrition,
  };
  // Senza peso noto la ricetta si misura solo a porzioni (DATABASE.md, recipes).
  const modes: QuantityMode[] = food.per_100g ? ['grams', 'servings'] : ['servings'];
  const [mode, setMode] = useState<QuantityMode>(modes[0]);
  const [quantity, setQuantity] = useState(defaultQuantity(modes[0]));
  const [view, setView] = useState<IngredientsView>('recipe');
  const [deleting, setDeleting] = useState(false);

  const amount = parseQuantity(quantity);
  const valid = isValidQuantity(amount);
  const nutrition = valid ? scaleNutrition(food, amount, mode) : null;
  const factor = valid ? portionFactor(r, amount, mode) : null;
  const mine = view === 'mine' && factor !== null;
  const amountLabel =
    mode === 'grams' ? t('diary.grams', { value: quantity }) : t('diary.servings', { count: amount, value: quantity });

  function confirmDelete() {
    Alert.alert(t('foodDetail.deleteTitle'), t('foodDetail.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('foodDetail.delete'),
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteRecipe(r.id);
            router.back();
          } catch {
            setDeleting(false);
            Alert.alert(t('authErrors.generic'));
          }
        },
      },
    ]);
  }

  return (
    <DetailLayout
      footer={
        <View style={styles.row}>
          {r.is_mine && (
            <>
              <RoundButton
                label={t('foodDetail.edit')}
                onPress={() => router.push({ pathname: '/new-recipe', params: { draft: r.id } })}
                disabled={deleting}>
                <Icon sf="pencil" md="edit" tintColor={colors.text} />
              </RoundButton>
              <RoundButton label={t('foodDetail.delete')} onPress={confirmDelete} disabled={deleting} busy={deleting}>
                {deleting ? <ActivityIndicator color={colors.text} /> : <Icon sf="trash" md="delete" tintColor={colors.danger} />}
              </RoundButton>
            </>
          )}
          <Button
            title={t('diary.item.addTitle')}
            icon={{ sf: 'plus', md: 'add' }}
            disabled={!valid || deleting}
            style={styles.grow}
            onPress={() =>
              router.push({
                pathname: '/meal-item',
                params: { recipe_id: r.id, quantity, mode, guide: r.guide_ingredient_id ? '1' : '' },
              })
            }
          />
        </View>
      }>
      <Cover uri={r.cover_image_url} />
      <View style={styles.heading}>
        <Text style={styles.title} accessibilityRole="header">
          {r.title}
        </Text>
        <View style={styles.row}>
          <Rating value={r.rating_avg} />
          {r.is_private && <Pill label={t('foodDetail.private')} />}
        </View>
        <Author recipe={r} />
        {(r.prep_time_minutes !== null || r.difficulty) && (
          <View style={styles.pills}>
            {r.prep_time_minutes !== null && (
              <Pill
                label={t('foodDetail.prep', {
                  time: formatPrepTime(r.prep_time_minutes),
                })}
              />
            )}
            {r.difficulty && (
              <Pill
                label={t('foodDetail.difficulty', {
                  level: t(`foodDetail.difficulties.${r.difficulty}`),
                })}
              />
            )}
          </View>
        )}
      </View>

      <PortionNutrition
        nutrition={nutrition}
        quantity={quantity}
        onChangeQuantity={setQuantity}
        mode={mode}
        modes={modes}
        onChangeMode={(next) => {
          setMode(next);
          setQuantity(defaultQuantity(next));
        }}
        accessory={<InfoButton title={t('foodDetail.nutrition')} message={t('foodDetail.nutritionInfo')} />}
        servingInfo={servingInfo(food.serving_g, r.guide_ingredient_id ? 'guide' : 'recipe')}
      />

      <Card>
        <Text style={typography.title} accessibilityRole="header">
          {t('foodDetail.ingredients')}
        </Text>
        <SegmentedControl
          options={['recipe', 'mine'] as const}
          value={view}
          onChange={setView}
          label={(v) => t(v === 'recipe' ? 'foodDetail.recipeIngredients' : 'foodDetail.myIngredients')}
        />
        <Text style={styles.note}>
          {view === 'recipe'
            ? t('foodDetail.wholeRecipe', { count: r.servings })
            : factor === null
              ? t('diary.item.unavailable')
              : t('foodDetail.myPortion', { amount: amountLabel })}
        </Text>
        {r.ingredients.map((i) => (
          <View key={i.id} style={styles.ingredient}>
            {i.id === r.guide_ingredient_id && (
              <Icon sf="star.fill" md="star" size={14} tintColor={colors.rating} accessibilityLabel={t('foodDetail.guide')} />
            )}
            <Text style={styles.ingredientName}>{i.name}</Text>
            <Text style={typography.label}>{formatIngredient(i.quantity, i.unit, mine ? factor : 1)}</Text>
          </View>
        ))}
      </Card>

      {r.steps.length > 0 && (
        <Card>
          <View style={styles.row}>
            <Text style={[typography.title, styles.grow]} accessibilityRole="header">
              {t('foodDetail.method')}
            </Text>
            <InfoButton title={t('foodDetail.method')} message={t('foodDetail.methodInfo')} />
          </View>
          {r.steps.map((s, index) => (
            <View key={s.position} style={styles.step}>
              <Text style={styles.stepNumber}>{index + 1}.</Text>
              <View style={styles.grow}>
                <Text style={typography.body}>{s.body}</Text>
                {s.image_url && <Image source={{ uri: s.image_url }} style={styles.stepImage} accessibilityIgnoresInvertColors />}
              </View>
            </View>
          ))}
        </Card>
      )}

      {r.notes.length > 0 && (
        <Card>
          <Text style={typography.title} accessibilityRole="header">
            {t('foodDetail.notes')}
          </Text>
          {r.notes.map((note, index) => (
            <Text key={index} style={typography.body}>
              {`•  ${note}`}
            </Text>
          ))}
        </Card>
      )}

      {r.tags.length > 0 && (
        <Card>
          <Text style={typography.title} accessibilityRole="header">
            {t('foodDetail.categories')}
          </Text>
          <View style={styles.pills}>
            {r.tags.map((tag) => (
              <Pill
                key={tag.slug}
                label={t(`filters.tags.${tag.slug}`, {
                  defaultValue: tag.label,
                })}
              />
            ))}
          </View>
        </Card>
      )}

      <FeedbackLinks
        food={{ recipe_id: r.id }}
        reviewCount={r.review_count}
        reportCount={r.report_count}
        own={r.is_mine}
      />
    </DetailLayout>
  );
}

/** Pulsante tondo in vetro (Liquid Glass su iOS 26+), come quelli dell'header di Nuova ricetta. */
function RoundButton({
  label,
  onPress,
  disabled,
  busy,
  children,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy }}
      hitSlop={spacing.xs}>
      <GlassSurface interactive style={styles.roundButton}>
        {children}
      </GlassSurface>
    </Pressable>
  );
}

/** Autore con foto e "Segui" / "Segui già"; per le proprie ricette niente pulsante. */
function Author({ recipe: r }: { recipe: RecipeDetail }) {
  const [following, setFollowing] = useState(!!r.author?.is_following);
  const author = r.author;

  if (!author) return <Text style={typography.caption}>{t('foodDetail.deletedAuthor')}</Text>;

  return (
    <View style={styles.row}>
      {author.avatar_url ? (
        <Image source={{ uri: author.avatar_url }} style={styles.avatar} accessibilityIgnoresInvertColors />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Icon sf="person.fill" md="person" size={16} />
        </View>
      )}
      <Text style={[typography.label, styles.grow]} numberOfLines={1}>
        {author.nickname}
      </Text>
      {!r.is_mine && <FollowButton userId={author.id} following={following} onChange={setFollowing} />}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    gap: spacing.sm,
  },
  title: {
    ...typography.display,
    fontSize: 26,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  grow: {
    flex: 1,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  // Alto come Button (minHeight 54).
  roundButton: {
    width: 54,
    height: 54,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  note: {
    ...typography.caption,
    textAlign: 'center',
  },
  ingredient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ingredientName: {
    ...typography.body,
    flex: 1,
  },
  step: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stepNumber: {
    ...typography.label,
    fontSize: 15,
    lineHeight: 22,
  },
  stepImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
});
