import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import {
  Cover,
  DetailLayout,
  DetailScreen,
  FeedbackLinks,
  PortionNutrition,
  Rating,
  useFocusData,
} from '@/components/food-detail';
import { defaultQuantity, isValidQuantity, parseQuantity } from '@/components/quantity-field';
import { scaleNutrition, type QuantityMode } from '@/lib/diary';
import { fetchProduct, productFood, productGrams, servingInfo, type ProductDetail } from '@/lib/food';
import { i18n, t } from '@/lib/i18n';
import { spacing, typography } from '@/theme';

const modes: QuantityMode[] = ['grams', 'servings'];

const number = (value: number) => new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: 1 }).format(value);

/** Dettaglio prodotto: dati, bilancio nutrizionale della quantità scelta, recensioni e segnalazioni, Aggiungi a pasto. */
export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: product, error, retry } = useFocusData(() => fetchProduct(id), id);

  return (
    <DetailScreen loaded={!!product} error={error} onRetry={retry}>
      {product && <ProductContent product={product} />}
    </DetailScreen>
  );
}

function ProductContent({ product: p }: { product: ProductDetail }) {
  const [mode, setMode] = useState<QuantityMode>('grams');
  const [quantity, setQuantity] = useState('100');
  const amount = parseQuantity(quantity);
  const valid = isValidQuantity(amount);
  const nutrition = valid ? scaleNutrition(productFood(p), amount, mode) : null;

  // Zuccheri e saturi solo se la fonte li riporta (DATABASE.md, products).
  const grams = productGrams(p, amount, mode);
  const extra = [
    p.sugars_g_100 !== null && t('foodDetail.sugars', { value: number((p.sugars_g_100 * grams) / 100) }),
    p.saturated_fat_g_100 !== null &&
      t('foodDetail.saturatedFat', {
        value: number((p.saturated_fat_g_100 * grams) / 100),
      }),
  ]
    .filter(Boolean)
    .join(' · ');
  const details = [p.brand, p.barcode && t('food.barcode', { code: p.barcode })].filter(Boolean).join(' • ');

  return (
    <DetailLayout
      footer={
        <Button
          title={t('diary.item.addTitle')}
          icon={{ sf: 'plus', md: 'add' }}
          disabled={!valid}
          onPress={() =>
            router.push({
              pathname: '/meal-item',
              params: { product_id: p.id, quantity, mode },
            })
          }
        />
      }>
      <Cover uri={p.image_url} contain />
      <View style={styles.heading}>
        <Text style={styles.title} accessibilityRole="header">
          {p.name}
        </Text>
        {details ? <Text style={typography.caption}>{details}</Text> : null}
        <Rating value={p.rating_avg} />
      </View>

      <PortionNutrition
        nutrition={nutrition}
        extra={extra}
        servingInfo={servingInfo(p.serving_size_g, 'product')}
        quantity={quantity}
        onChangeQuantity={setQuantity}
        mode={mode}
        modes={modes}
        onChangeMode={(next) => {
          setMode(next);
          setQuantity(defaultQuantity(next));
        }}
      />

      <FeedbackLinks food={{ product_id: p.id }} reviewCount={p.review_count} reportCount={p.report_count} />
    </DetailLayout>
  );
}

const styles = StyleSheet.create({
  heading: {
    gap: spacing.xs,
  },
  title: {
    ...typography.display,
    fontSize: 26,
  },
});
