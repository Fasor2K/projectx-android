import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type TextInputInstance,
  type ViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { useFocusData } from '@/components/food-detail';
import { Icon } from '@/components/icon';
import {
  deleteFeedback,
  editFeedback,
  fetchFeedback,
  saveFeedback,
  timeAgo,
  type Feedback,
  type FeedbackKind,
  type FoodRef,
} from '@/lib/food';
import { t } from '@/lib/i18n';
import { colors, radius, reviewColors, spacing, typography } from '@/theme';

const MAX_TEXT = 1000;
const STARS = [1, 2, 3, 4, 5];

/**
 * Sheet "Commenti" (ricette) / "Recensioni" (prodotti) con le stelle, o "Segnalazioni" senza, come nel design:
 * elenco e campo in fondo. Uno per utente e tipo: il proprio sta in cima e si modifica o elimina dal suo menu.
 */
export default function FeedbackSheet() {
  const params = useLocalSearchParams<{
    recipe_id?: string;
    product_id?: string;
    kind?: FeedbackKind;
  }>();
  const food: FoodRef = params.recipe_id ? { recipe_id: params.recipe_id } : { product_id: params.product_id! };
  const kind: FeedbackKind = params.kind === 'report' ? 'report' : 'review';
  const review = kind === 'review';
  const label = review ? ('recipe_id' in food ? 'comments' : 'reviews') : 'reports';
  const insets = useSafeAreaInsets();

  // Android impagina il formSheet sul detent più alto (0.95 in _layout): al primo (0.6) il fondo resta fuori
  // schermo, quindi lo rialziamo della differenza perché il campo si veda come su iOS.
  // Con la tastiera KeyboardAvoidingView sbaglia (usa la y relativa allo sheet): misuriamo noi quanto del contenitore,
  // anche la parte fuori schermo, finisce sotto la tastiera, di nuovo quando lo sheet si ferma (la tastiera lo alza).
  const navigation = useNavigation();
  const { height } = useWindowDimensions();
  const [detent, setDetent] = useState(0);
  const [keyboardOverlap, setKeyboardOverlap] = useState(0);
  const frameRef = useRef<ViewInstance>(null);
  const keyboardTop = useRef<number | null>(null);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const measure = () => {
      const top = keyboardTop.current;
      if (top === null) return setKeyboardOverlap(0);
      // measureInWindow parte da sotto la status bar, la tastiera dallo schermo.
      frameRef.current?.measureInWindow((_x, y, _w, h) =>
        setKeyboardOverlap(Math.max(0, y + (StatusBar.currentHeight ?? 0) + h - top)),
      );
    };
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      keyboardTop.current = e.endCoordinates.screenY;
      measure();
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTop.current = null;
      measure();
    });
    const sheet = navigation.addListener(
      'sheetDetentChange' as never,
      (e: { data: { index: number; stable: boolean } }) => {
        if (!e.data.stable) return;
        setDetent(e.data.index);
        measure();
      },
    );
    return () => {
      show.remove();
      hide.remove();
      sheet();
    };
  }, [navigation]);
  const hiddenBottom = Platform.OS === 'android' && detent === 0 ? (0.95 - 0.6) * height : 0;

  const { data, error, retry } = useFocusData(() => fetchFeedback(food, kind), JSON.stringify(params));
  const mine = data?.find((f) => f.is_mine);
  const items = data && (mine ? [mine, ...data.filter((f) => f !== mine)] : data);

  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<TextInputInstance>(null);
  const canSend = (review ? rating > 0 : !!text.trim()) && !sending;

  function reset() {
    setEditing(false);
    setRating(0);
    setText('');
  }

  async function send() {
    const body = text.trim() || undefined;
    setSending(true);
    try {
      if (editing && mine) await editFeedback(mine.id, review ? rating : undefined, body);
      else
        await saveFeedback({
          ...food,
          kind,
          ...(review && { rating }),
          ...(body && { body }),
        });
      reset();
    } catch {
      Alert.alert(t('feedback.sendFailed'), t('authErrors.generic'));
    } finally {
      setSending(false);
      retry();
    }
  }

  function confirmDelete(item: Feedback) {
    Alert.alert(t(`feedback.${kind}.deleteTitle`), t(`feedback.${kind}.deleteMessage`), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('feedback.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteFeedback(item.id);
            reset();
          } catch {
            Alert.alert(t('feedback.deleteFailed'), t('authErrors.generic'));
          }
          retry();
        },
      },
    ]);
  }

  function openMenu(item: Feedback) {
    Alert.alert(t(`feedback.${kind}.mine`), undefined, [
      {
        text: t('feedback.edit'),
        onPress: () => {
          setRating(item.rating ?? 0);
          setText(item.body ?? '');
          setEditing(true);
        },
      },
      {
        text: t('feedback.delete'),
        style: 'destructive',
        onPress: () => confirmDelete(item),
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  // Chi ha già il suo vede il campo solo mentre lo modifica.
  const showInput = data && (!mine || editing);

  return (
    <KeyboardAvoidingView
      style={[styles.sheet, { paddingBottom: keyboardOverlap || hiddenBottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Riempie anche il padding: misura tutto il contenitore. */}
      {Platform.OS === 'android' && <View ref={frameRef} style={StyleSheet.absoluteFill} pointerEvents="none" />}
      <Text style={styles.title} accessibilityRole="header">
        {t(`feedback.${label}`)}
      </Text>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
        {items?.map((f) => (
          <FeedbackCard key={f.id} item={f} onMenu={f.is_mine ? () => openMenu(f) : undefined} />
        ))}
        {items?.length === 0 && <Text style={styles.message}>{t(`feedback.${label}Empty`)}</Text>}
        {!data && !error && <ActivityIndicator color={colors.primary} />}
        {!data && error && (
          <>
            <Text style={styles.message}>{t('foodDetail.loadFailed')}</Text>
            <Button title={t('common.retry')} onPress={retry} />
          </>
        )}
      </ScrollView>

      {showInput && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          {editing && (
            <View style={styles.editingRow}>
              <Text style={styles.editingText}>{t(`feedback.${kind}.editing`)}</Text>
              <Pressable onPress={reset} accessibilityRole="button" hitSlop={12}>
                <Text style={styles.editingCancel}>{t('common.cancel')}</Text>
              </Pressable>
            </View>
          )}
          {/* Tutto il campo porta al testo, non solo la riga del TextInput; stelle e Invia restano tocchi a sé. */}
          <Pressable style={styles.inputField} onPress={() => inputRef.current?.focus()} accessible={false}>
            <View style={styles.grow}>
              {review && (
                <View style={styles.starsInput}>
                  {STARS.map((value) => (
                    <Pressable
                      key={value}
                      onPress={() => setRating(value)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={t('feedback.stars', { count: value })}
                      accessibilityState={{ selected: value <= rating }}
                      style={styles.starInput}>
                      <Icon
                        sf={value <= rating ? 'star.fill' : 'star'}
                        md="star"
                        size={18}
                        tintColor={value <= rating ? reviewColors.star : reviewColors.time}
                      />
                    </Pressable>
                  ))}
                </View>
              )}
              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={setText}
                placeholder={t(`feedback.${label}Placeholder`)}
                placeholderTextColor={reviewColors.time}
                accessibilityLabel={t(`feedback.${label}Placeholder`)}
                multiline
                maxLength={MAX_TEXT}
                style={styles.input}
              />
            </View>
            <Pressable
              onPress={send}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSend, busy: sending }}
              hitSlop={8}
              style={[styles.send, !canSend && styles.sendDisabled]}>
              {sending ? (
                <ActivityIndicator color={colors.onPrimary} size="small" />
              ) : (
                <Text style={styles.sendText}>{t('feedback.send')}</Text>
              )}
            </Pressable>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

/** Card del design; la riga delle stelle solo per le recensioni. */
function FeedbackCard({ item, onMenu }: { item: Feedback; onMenu?: () => void }) {
  const rating = item.rating;
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {item.author.avatar_url ? (
          <Image source={{ uri: item.author.avatar_url }} style={styles.avatar} accessibilityIgnoresInvertColors />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Icon sf="person.fill" md="person" size={11} />
          </View>
        )}
        <Text style={styles.author} numberOfLines={1}>
          {item.author.nickname}
        </Text>
        <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
        {onMenu && (
          <Pressable
            onPress={onMenu}
            accessibilityRole="button"
            accessibilityLabel={t('feedback.options')}
            hitSlop={12}>
            <Icon sf="ellipsis" md="more_horiz" size={16} tintColor={reviewColors.author} />
          </Pressable>
        )}
      </View>
      {rating !== null && (
        <View style={styles.rating} accessible accessibilityLabel={t('feedback.stars', { count: rating })}>
          {STARS.map((value) => (
            <Icon
              key={value}
              sf={value <= rating ? 'star.fill' : 'star'}
              md="star"
              size={14}
              tintColor={value <= rating ? reviewColors.star : reviewColors.time}
            />
          ))}
          <Text style={styles.ratingValue}>{t('feedback.ratingValue', { value: rating })}</Text>
        </View>
      )}
      {item.body ? <Text style={[styles.body, rating === null && styles.reportBody]}>{item.body}</Text> : null}
    </View>
  );
}

// Misure e colori del design ("Prodotto · Recensioni" e "· Segnalazioni"); lo sfondo resta quello degli altri formSheet.
const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    paddingTop: spacing.xl,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.43,
    color: reviewColors.title,
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  card: {
    padding: spacing.md,
    borderRadius: 12,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  author: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: reviewColors.author,
  },
  time: {
    fontSize: 11,
    color: reviewColors.time,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingValue: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '600',
    color: reviewColors.text,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.13,
    color: reviewColors.text,
  },
  // Nelle segnalazioni del design il testo ha interlinea 16 e niente spaziatura.
  reportBody: {
    lineHeight: 16,
    letterSpacing: 0,
  },
  message: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  editingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  editingText: {
    fontSize: 13,
    color: reviewColors.author,
  },
  editingCancel: {
    fontSize: 13,
    fontWeight: '600',
    color: reviewColors.send,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 75,
    paddingVertical: spacing.md,
    paddingLeft: 18,
    paddingRight: spacing.md,
    borderRadius: 28,
    backgroundColor: colors.surface,
  },
  grow: {
    flex: 1,
    gap: spacing.xs,
  },
  starsInput: {
    flexDirection: 'row',
    gap: 6,
  },
  starInput: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    fontSize: 13,
    color: reviewColors.text,
    maxHeight: 96,
    padding: 0,
    textAlignVertical: 'top',
  },
  send: {
    minWidth: 52,
    height: 28,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: reviewColors.send,
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendText: {
    fontSize: 15,
    letterSpacing: -0.23,
    color: colors.onPrimary,
  },
});
