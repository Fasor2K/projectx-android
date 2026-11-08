import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { backgroundGradient, spacing } from '@/theme';

type Props = ScrollViewProps & {
  /** Pulsante indietro (o X con `'close'`) fisso in alto a sinistra; nel contenuto metti `BackButtonSpace` dove deve stare. */
  back?: boolean | 'close';
  /** Azioni principali fisse in fondo, sopra la safe area. */
  footer?: ReactNode;
};

/**
 * Schermata con lo sfondo a gradiente dell'app e contenuto scrollabile sopra la tastiera.
 * Il contenuto scorre anche sotto le safe area; indietro e `footer` restano fissi.
 */
export function Screen({ back, footer, contentContainerStyle, ...props }: Props) {
  const insets = useSafeAreaInsets();
  const bottom = footer ? spacing.xl : insets.bottom + spacing.xl;

  const fixed = !!back || !!footer;
  const scroll = (
    <ScrollView
      style={fixed ? styles.scroll : styles.root}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.xl, paddingBottom: bottom },
        contentContainerStyle,
      ]}
      scrollIndicatorInsets={{
        top: insets.top,
        bottom: footer ? 0 : insets.bottom,
      }}
      {...props}
    />
  );
  // Senza parti fisse lo ScrollView resta il primo figlio dello screen: serve alla tab bar su iOS ≤ 18 (UI.md).
  if (!fixed) return scroll;

  return (
    <View style={styles.root}>
      {back && (
        <View style={[styles.back, { top: insets.top + spacing.xl }]}>
          <BackButton close={back === 'close'} />
        </View>
      )}
      {scroll}
      {footer && <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>{footer}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundImage: backgroundGradient,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
  },
  // Prima dello ScrollView per l'ordine di VoiceOver/TalkBack, sopra grazie a zIndex.
  back: {
    position: 'absolute',
    left: spacing.xl,
    zIndex: 1,
  },
  footer: {
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
});
