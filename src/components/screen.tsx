import { ScrollView, StyleSheet, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { backgroundGradient, spacing } from '@/theme';

/**
 * Schermata con lo sfondo a gradiente dell'app e contenuto scrollabile sopra la tastiera.
 * Il contenuto scorre anche sotto le safe area.
 */
export function Screen({ contentContainerStyle, ...props }: ScrollViewProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.root}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
        contentContainerStyle,
      ]}
      scrollIndicatorInsets={{ top: insets.top, bottom: insets.bottom }}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundImage: backgroundGradient,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
  },
});
