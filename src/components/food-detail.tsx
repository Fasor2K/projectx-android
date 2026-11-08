import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { BackButtonSpace } from '@/components/back-button';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { NutritionSummary } from '@/components/diary-summary';
import { Icon } from '@/components/icon';
import { QuantityField } from '@/components/quantity-field';
import { Screen } from '@/components/screen';
import type { Nutrition, QuantityMode } from '@/lib/diary';
import type { FoodRef } from '@/lib/food';
import { t } from '@/lib/i18n';
import { ApiError } from '@/lib/profile';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * Dati di un dettaglio, ricaricati a ogni ritorno sulla schermata (i conteggi cambiano dopo un commento).
 * `notFound` per un 404 dell'endpoint, `failed` per gli altri errori.
 */
export function useFocusData<T>(load: () => Promise<T>, key: string) {
  const [data, setData] = useState<{ key: string; value: T }>();
  const [error, setError] = useState<'notFound' | 'failed'>();
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let stale = false;
      setError(undefined);
      load().then(
        (value) => !stale && setData({ key, value }),
        (e: unknown) => {
          if (stale) return;
          setError(e instanceof ApiError && e.code?.endsWith('not_found') ? 'notFound' : 'failed');
        },
      );
      return () => {
        stale = true;
      };
      // load dipende solo da key; attempt rilancia dopo "Riprova".
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, attempt]),
  );

  return {
    data: data?.key === key ? data.value : undefined,
    error,
    retry: () => setAttempt(attempt + 1),
  };
}

/** Schermata di dettaglio: indietro fisso, stato di caricamento o errore; caricata, i figli disegnano il proprio `DetailLayout`. */
export function DetailScreen({
  loaded,
  error,
  onRetry,
  children,
}: {
  loaded: boolean;
  error?: 'notFound' | 'failed';
  onRetry: () => void;
  children: ReactNode;
}) {
  if (loaded) return children;
  return (
    <DetailLayout>
      {error ? (
        <>
          <Text style={styles.message}>{t(error === 'notFound' ? 'foodDetail.notFound' : 'foodDetail.loadFailed')}</Text>
          {error === 'failed' && <Button title={t('common.retry')} onPress={onRetry} />}
        </>
      ) : (
        <ActivityIndicator color={colors.primary} />
      )}
    </DetailLayout>
  );
}

/** Contenuto del dettaglio con indietro fisso in alto e le azioni principali (`footer`) fisse in basso. */
export function DetailLayout({ footer, children }: { footer?: ReactNode; children: ReactNode }) {
  return (
    <Screen back footer={footer} contentContainerStyle={styles.content}>
      <BackButtonSpace />
      {children}
    </Screen>
  );
}

/** Foto di copertina, o segnaposto con l'icona. `contain` la mostra intera (con bande ai lati) invece di ritagliarla. */
export function Cover({ uri, contain }: { uri: string | null; contain?: boolean }) {
  return uri ? (
    <Image source={{ uri }} style={styles.cover} resizeMode={contain ? 'contain' : 'cover'} accessibilityIgnoresInvertColors />
  ) : (
    <View style={[styles.cover, styles.placeholder]}>
      <Icon sf="fork.knife" md="restaurant" size={40} />
    </View>
  );
}

/** Stella e voto medio ("4.2/5", "Nessuna"). */
export function Rating({ value }: { value: number | null }) {
  return (
    <View style={styles.rating}>
      <Icon sf="star.fill" md="star" size={15} tintColor={colors.rating} />
      <Text style={typography.label}>{value === null ? t('food.noRating') : t('food.rating', { value })}</Text>
    </View>
  );
}

/** Icona "i" che apre una spiegazione (popover del design) con un alert di sistema. */
export function InfoButton({ title, message }: { title: string; message: string }) {
  return (
    <Pressable
      onPress={() => Alert.alert(title, message)}
      accessibilityRole="button"
      accessibilityLabel={t('foodDetail.info', { title })}
      hitSlop={spacing.md}>
      <Icon sf="info.circle" md="info" size={20} />
    </Pressable>
  );
}

/** Etichetta a pillola (categorie, tempo, difficoltà). */
export function Pill({ label }: { label: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

/** "Bilancio nutrizionale" della quantità scelta, con stepper e Grammi / Porzioni. */
export function PortionNutrition({
  nutrition,
  quantity,
  onChangeQuantity,
  mode,
  modes,
  onChangeMode,
  accessory,
  extra,
  servingInfo,
}: {
  nutrition: Nutrition | null;
  quantity: string;
  onChangeQuantity: (quantity: string) => void;
  mode: QuantityMode;
  modes: QuantityMode[];
  onChangeMode: (mode: QuantityMode) => void;
  accessory?: ReactNode;
  /** Righe sotto i valori, es. zuccheri e saturi. */
  extra?: string;
  servingInfo?: string;
}) {
  return (
    <NutritionSummary
      title={t('foodDetail.nutrition')}
      nutrition={nutrition ?? { carbs_g: 0, fat_g: 0, protein_g: 0, fiber_g: 0, kcal: 0 }}
      accessory={accessory}>
      {!nutrition && <Text style={typography.caption}>{t('diary.item.unavailable')}</Text>}
      {nutrition && extra ? <Text style={typography.caption}>{extra}</Text> : null}
      <QuantityField
        quantity={quantity}
        onChangeQuantity={onChangeQuantity}
        mode={mode}
        modes={modes}
        onChangeMode={onChangeMode}
        info={servingInfo}
      />
    </NutritionSummary>
  );
}

/** Pulsanti verso commenti o recensioni e segnalazioni, con i conteggi. */
export function FeedbackLinks({ food, reviewCount, reportCount }: { food: FoodRef; reviewCount: number; reportCount: number }) {
  const reviews = 'recipe_id' in food ? 'foodDetail.comments' : 'foodDetail.reviews';
  const open = (kind: 'review' | 'report') => router.push({ pathname: '/feedback', params: { ...food, kind } });

  return (
    <Card>
      <Text style={typography.title} accessibilityRole="header">
        {t('foodDetail.feedbackTitle')}
      </Text>
      <View style={styles.links}>
        <LinkButton label={t(reviews, { count: reviewCount })} onPress={() => open('review')} />
        <LinkButton label={t('foodDetail.reports', { count: reportCount })} onPress={() => open('report')} />
      </View>
    </Card>
  );
}

function LinkButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.link}>
      <Text style={styles.linkText}>{label}</Text>
      <Icon sf="chevron.right" md="chevron_right" size={14} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  message: {
    ...typography.body,
    textAlign: 'center',
  },
  cover: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.lg,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  pillText: {
    ...typography.label,
    color: colors.primary,
  },
  links: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  link: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  linkText: {
    ...typography.label,
    color: colors.primary,
  },
});
