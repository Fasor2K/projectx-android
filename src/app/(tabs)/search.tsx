import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { FoodSearch } from '@/components/food-search';
import { Screen } from '@/components/screen';
import { t } from '@/lib/i18n';
import { spacing, typography } from '@/theme';

/** Pagina Cerca, con tre tab: ricette (testo e filtri), prodotti (testo e scansione) e utenti (testo). */
export default function Search() {
  return (
    <Screen keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
      <Text style={styles.title} accessibilityRole="header">
        {t('search.title')}
      </Text>
      <FoodSearch
        onSelectRecipe={(recipe) => router.push({ pathname: '/recipe', params: { id: recipe.id } })}
        onSelectProduct={(product) => router.push({ pathname: '/product', params: { id: product.id } })}
        onScan={() => router.push('/scanner')}
        users
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  title: typography.screenTitle,
});
