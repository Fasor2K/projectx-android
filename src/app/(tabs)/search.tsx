import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceButton } from '@/components/choice-button';
import { ProductCard, RecipeCard } from '@/components/food-card';
import { GlassSurface } from '@/components/glass-surface';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { t } from '@/lib/i18n';
import {
  quickFilters,
  searchProducts,
  searchRecipes,
  useSearchFilters,
  type Product,
  type QuickFilter,
  type Recipe,
  type SearchTab,
} from '@/lib/search';
import { colors, radius, shadow, spacing, typography } from '@/theme';

type Results = { key: string; tab: SearchTab; recipes: Recipe[]; products: Product[]; failed?: boolean };

const SEARCH_DELAY_MS = 300;

const tabs: SearchTab[] = ['recipes', 'products'];

/** Pagina Cerca, con due tab: ricette (testo e filtri) e prodotti (testo e scansione). */
export default function Search() {
  const { tags } = useSearchFilters();
  const [tab, setTab] = useState<SearchTab>('recipes');
  const [text, setText] = useState('');
  const [quick, setQuick] = useState<QuickFilter>();
  const [attempt, setAttempt] = useState(0);
  const [results, setResults] = useState<Results>();

  // Gli endpoint vogliono almeno 2 caratteri: con meno si resta sui risultati suggeriti.
  const q = text.trim().length >= 2 ? text.trim() : undefined;
  // Solo "Popolari" ha già i dati: gli altri chip hanno bisogno di ricette e diario, che non esistono ancora.
  const unavailable = quick !== undefined && quick !== 'popular';
  const key = JSON.stringify([tab, q, tab === 'recipes' ? tags : [], attempt]);

  useEffect(() => {
    if (unavailable) return;
    let stale = false;
    const timer = setTimeout(async () => {
      try {
        const recipes = tab === 'recipes' ? await searchRecipes(q, tags) : [];
        const products = tab === 'products' ? await searchProducts(q) : [];
        if (!stale) setResults({ key, tab, recipes, products });
      } catch {
        if (!stale) setResults({ key, tab, recipes: [], products: [], failed: true });
      }
    }, SEARCH_DELAY_MS);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
    // key contiene già tab, q, tags e attempt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, unavailable]);

  // I risultati dell'altro tab non si mostrano mentre arrivano quelli nuovi.
  const current = results?.tab === tab && !unavailable ? results : undefined;
  const recipes = current?.recipes ?? [];
  const products = current?.products ?? [];
  const shownRecipes =
    quick === 'popular' ? [...recipes].sort((a, b) => (b.rating_avg ?? 0) - (a.rating_avg ?? 0)) : recipes;
  const loading = !unavailable && results?.key !== key;
  const failed = !unavailable && !loading && results?.failed;
  const empty = !loading && !failed && shownRecipes.length + products.length === 0;

  return (
    <Screen keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
      <Text style={styles.title} accessibilityRole="header">
        {t('search.title')}
      </Text>

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
          <Icon sf="magnifyingglass" md="search" tintColor={colors.textMuted} />
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
            onPress={() => router.push('/scanner')}
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

      <Text style={styles.sectionTitle}>{t(q ? 'search.results' : 'search.suggested')}</Text>

      {shownRecipes.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} />
      ))}
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}

      {loading && <ActivityIndicator color={colors.primary} />}
      {failed && (
        <>
          <Text style={styles.message}>{t('search.failed')}</Text>
          <Button title={t('common.retry')} onPress={() => setAttempt(attempt + 1)} />
        </>
      )}
      {empty && <Text style={styles.message}>{t(tab === 'recipes' && tags.length ? 'search.emptyFiltered' : 'search.empty')}</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...typography.display,
    fontWeight: '700',
  },
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
});
