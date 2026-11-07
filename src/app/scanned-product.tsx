import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BackButton } from '@/components/back-button';
import { Button } from '@/components/button';
import { ProductCard } from '@/components/food-card';
import { t } from '@/lib/i18n';
import { ApiError } from '@/lib/profile';
import { fetchProductByBarcode, type Product } from '@/lib/search';
import { colors, spacing, typography } from '@/theme';

/** Sheet "Prodotto" sopra lo scanner: chiudendolo la scansione riprende. */
export default function ScannedProduct() {
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const [product, setProduct] = useState<Product>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let stale = false;
    fetchProductByBarcode(barcode).then(
      (next) => {
        if (!stale) setProduct(next);
      },
      (e: unknown) => {
        if (stale) return;
        const notFound = e instanceof ApiError && (e.code === 'product_not_found' || e.code === 'invalid_barcode');
        setError(t(notFound ? 'scanner.notFound' : 'authErrors.generic'));
      },
    );
    return () => {
      stale = true;
    };
  }, [barcode]);

  return (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <BackButton close />
        <Text style={styles.title} accessibilityRole="header">
          {t('scanner.product')}
        </Text>
      </View>
      {product && (
        <>
          <ProductCard product={product} />
          <Button
            title={t('diary.item.addTitle')}
            onPress={() => router.push({ pathname: '/meal-item', params: { product_id: product.id } })}
          />
        </>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
      {!product && !error && <ActivityIndicator color={colors.primary} />}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  header: {
    justifyContent: 'center',
    minHeight: 44,
  },
  title: {
    ...typography.title,
    position: 'absolute',
    alignSelf: 'center',
  },
  error: {
    ...typography.body,
    textAlign: 'center',
  },
});
