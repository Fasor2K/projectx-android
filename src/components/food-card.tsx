import { Image, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { t } from '@/lib/i18n';
import type { Product, Recipe } from '@/lib/search';
import { colors, macroColors, radius, spacing, typography } from '@/theme';

export type Nutrition = { carbs: number; fat: number; protein: number; fiber: number; kcal: number };

type Props = {
  title: string;
  imageUrl: string | null;
  rating: number | null;
  /** Testo accanto al voto, es. marca e codice a barre. */
  details?: string;
  /** Valori per 100 g; assenti se non si conoscono. */
  nutrition?: Nutrition;
  /** A cosa si riferiscono i valori, se non è ovvio. */
  nutritionNote?: string;
  /** Mostra la foto intera (con bande ai lati) invece di ritagliarla. */
  containImage?: boolean;
};

/** Riga di un risultato: foto, voto, titolo e valori nutrizionali. */
function FoodCard({ title, imageUrl, rating, details, nutrition, nutritionNote, containImage }: Props) {
  return (
    <Card style={styles.card}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode={containImage ? 'contain' : 'cover'}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Icon sf="fork.knife" md="restaurant" size={28} />
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.meta}>
          <Icon sf="star" md="star" size={15} tintColor={colors.rating} />
          <Text style={styles.rating}>
            {rating === null ? t('food.noRating') : t('food.rating', { value: rating })}
          </Text>
          {details && (
            <Text style={styles.details} numberOfLines={1}>
              {details}
            </Text>
          )}
        </View>
        <Text style={typography.title} numberOfLines={1}>
          {title}
        </Text>
        {nutritionNote && (
          <Text style={typography.caption} numberOfLines={1}>
            {nutritionNote}
          </Text>
        )}
        {nutrition ? (
          <Macros nutrition={nutrition} />
        ) : (
          <Text style={typography.caption}>{t('food.noNutrition')}</Text>
        )}
      </View>
      <Icon sf="chevron.right" md="chevron_right" size={16} tintColor={colors.textMuted} />
    </Card>
  );
}

/**
 * Etichette colorate dei valori nutrizionali (risultati di ricerca, voci del diario).
 * `long`: nomi per esteso e centrate, come nel riepilogo di Componi pasto.
 */
export function Macros({ nutrition, long = false }: { nutrition: Nutrition; long?: boolean }) {
  return (
    <View style={[styles.macros, long && styles.centered]}>
      <Macro kind="carbs" value={nutrition.carbs} long={long} />
      <Macro kind="fat" value={nutrition.fat} long={long} />
      <Macro kind="protein" value={nutrition.protein} long={long} />
      <Macro kind="fiber" value={nutrition.fiber} long={long} />
      <Macro kind="kcal" value={nutrition.kcal} long={long} />
    </View>
  );
}

function Macro({ kind, value, long }: { kind: keyof typeof macroColors; value: number; long: boolean }) {
  return (
    <View style={[styles.macro, { backgroundColor: macroColors[kind].background }]}>
      <Text style={[styles.macroText, { color: macroColors[kind].text }]}>
        {t(long && kind !== 'kcal' ? `diary.${kind}Long` : `food.${kind}`, { value: Math.round(value) })}
      </Text>
    </View>
  );
}

export function ProductCard({ product: p }: { product: Product }) {
  const details = [p.brand, p.barcode && t('food.barcode', { code: p.barcode })].filter(Boolean).join(' • ');

  return (
    <FoodCard
      title={p.name}
      imageUrl={p.image_url}
      containImage
      rating={p.rating_avg}
      details={details || undefined}
      nutrition={{
        carbs: p.carbs_g_100,
        fat: p.fat_g_100,
        protein: p.protein_g_100,
        fiber: p.fiber_g_100,
        kcal: p.kcal_100,
      }}
    />
  );
}

export function RecipeCard({ recipe: r }: { recipe: Recipe }) {
  return (
    <FoodCard
      title={r.title}
      imageUrl={r.cover_image_url}
      rating={r.rating_avg}
      nutritionNote={r.guide_name ? t('food.perGuide', { name: r.guide_name }) : undefined}
      nutrition={
        // Il backend li manda tutti insieme: tutti numeri o tutti null.
        r.carbs_g_100 === null
          ? undefined
          : {
              carbs: r.carbs_g_100,
              fat: r.fat_g_100!,
              protein: r.protein_g_100!,
              fiber: r.fiber_g_100!,
              kcal: r.kcal_100!,
            }
      }
    />
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  image: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rating: {
    ...typography.label,
  },
  details: {
    ...typography.caption,
    flex: 1,
    marginLeft: spacing.xs,
  },
  macros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  centered: {
    justifyContent: 'center',
  },
  macro: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  macroText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
