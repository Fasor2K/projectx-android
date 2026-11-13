import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceButton } from '@/components/choice-button';
import { ProductCard, RecipeCard } from '@/components/food-card';
import { GlassSurface } from '@/components/glass-surface';
import { Icon } from '@/components/icon';
import { t } from '@/lib/i18n';
import {
  quickFilters,
  useFoodSearch,
  useSearchFilters,
  type Product,
  type QuickFilter,
  type Recipe,
  type SearchTab,
} from '@/lib/search';
import { colors, radius, shadow, spacing, typography } from '@/theme';

const tabs: SearchTab[] = ['recipes', 'products'];

type Props = {
  onSelectRecipe: (recipe: Recipe) => void;
  onSelectProduct: (product: Product) => void;
  /** Pulsante di scansione del tab Prodotti. */
  onScan: () => void;
  /** Risultato evidenziato (scelto). */
  selectedId?: string;
};

/**
 * Ricerca di ricette e prodotti: tab, campo, filtri o scansione, chip e risultati.
 * Pagina Cerca e sheet Aggiungi ingrediente; i filtri (tag) sono quelli di `SearchFiltersContext`, condivisi.
 */
export function FoodSearch({ onSelectRecipe, onSelectProduct, onScan, selectedId }: Props) {
  const { tags } = useSearchFilters();
  const [tab, setTab] = useState<SearchTab>('recipes');
  const [text, setText] = useState('');
  const [quick, setQuick] = useState<QuickFilter>();

  // Gli endpoint vogliono almeno 2 caratteri: con meno si mostrano i recenti (o i suggeriti, se non ce ne sono).
  const q = text.trim().length >= 2 ? text.trim() : undefined;
  // Solo "Popolari" ha già i dati: gli altri chip hanno bisogno di ricette e diario, che non esistono ancora.
  const unavailable = quick !== undefined && quick !== 'popular';
  const { recipes, products, recent, loading, failed, retry } = useFoodSearch(tab, q, tags, !unavailable);
  const shownRecipes =
    quick === 'popular' ? [...recipes].sort((a, b) => (b.rating_avg ?? 0) - (a.rating_avg ?? 0)) : recipes;
  const empty = !loading && !failed && shownRecipes.length + products.length === 0;

  return (
    <>
      <GlassSurface style={styles.tabs} accessibilityRole="tablist">
        {tabs.map((name) => (
          <Pressable
            key={name}
            onPress={() => {
              setTab(name);
              setQuick(undefined);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === name }}
            style={[styles.tab, tab === name && styles.tabSelected]}>
            <Text style={[styles.tabLabel, tab === name && styles.tabLabelSelected]}>{t(`search.tabs.${name}`)}</Text>
          </Pressable>
        ))}
      </GlassSurface>

      <View style={styles.searchRow}>
        <View style={styles.searchField}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={t('search.placeholder')}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={t('search.placeholder')}
            autoCorrect={false}
            returnKeyType="search"
          />
          {text ? (
            <Pressable
              onPress={() => setText('')}
              hitSlop={spacing.sm}
              accessibilityRole="button"
              accessibilityLabel={t('search.clear')}>
              <Icon sf="xmark.circle.fill" md="cancel" tintColor={colors.textMuted} />
            </Pressable>
          ) : (
            <Icon sf="magnifyingglass" md="search" tintColor={colors.textMuted} />
          )}
        </View>
        {tab === 'recipes' ? (
          <Pressable
            onPress={() => router.push('/search-filters')}
            accessibilityRole="button"
            accessibilityLabel={t('search.filters', { count: tags.length })}>
            <GlassSurface interactive style={styles.roundButton}>
              <Icon
                sf="line.3.horizontal.decrease"
                md="filter_list"
                tintColor={tags.length ? colors.primary : colors.text}
              />
            </GlassSurface>
          </Pressable>
        ) : (
          <Pressable
            onPress={onScan}
            accessibilityRole="button"
            accessibilityLabel={t('search.scan')}
            style={[styles.roundButton, styles.scanButton]}>
            <Icon sf="barcode.viewfinder" md="barcode_scanner" tintColor={colors.onPrimary} />
          </Pressable>
        )}
      </View>

      <View style={styles.chips}>
        {quickFilters[tab].map((filter) => (
          <ChoiceButton
            key={filter}
            label={t(`search.quick.${filter}`)}
            selected={quick === filter}
            onPress={() => setQuick(quick === filter ? undefined : filter)}
            style={styles.chip}
          />
        ))}
      </View>

      <Text style={styles.sectionTitle}>{t(q ? 'search.results' : recent === false ? 'search.suggested' : 'search.recent')}</Text>

      {shownRecipes.map((recipe) => (
        <Pressable
          key={recipe.id}
          onPress={() => onSelectRecipe(recipe)}
          accessibilityRole="button"
          accessibilityState={{ selected: recipe.id === selectedId }}
          style={recipe.id === selectedId && styles.selected}>
          <RecipeCard recipe={recipe} />
        </Pressable>
      ))}
      {products.map((product) => (
        <Pressable
          key={product.id}
          onPress={() => onSelectProduct(product)}
          accessibilityRole="button"
          accessibilityState={{ selected: product.id === selectedId }}
          style={product.id === selectedId && styles.selected}>
          <ProductCard product={product} />
        </Pressable>
      ))}

      {loading && <ActivityIndicator color={colors.primary} />}
      {failed && (
        <>
          <Text style={styles.message}>{t('search.failed')}</Text>
          <Button title={t('common.retry')} onPress={retry} />
        </>
      )}
      {empty && <Text style={styles.message}>{t(tab === 'recipes' && tags.length ? 'search.emptyFiltered' : 'search.empty')}</Text>}
    </>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: radius.pill,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  tabSelected: {
    backgroundColor: colors.primary,
  },
  tabLabel: {
    ...typography.label,
  },
  tabLabelSelected: {
    color: colors.onPrimary,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    ...shadow,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  roundButton: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanButton: {
    backgroundColor: colors.primary,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 0,
  },
  sectionTitle: {
    ...typography.title,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  message: {
    ...typography.body,
    textAlign: 'center',
  },
  // Bordo blu del risultato scelto (design "Aggiungi ingrediente").
  selected: {
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
  },
});
