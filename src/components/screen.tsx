import { ScrollView, StyleSheet, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { backgroundGradient, spacing } from '@/theme';

/** Schermata con lo sfondo a gradiente dell'app, safe area e contenuto scrollabile sopra la tastiera. */
export function Screen({ contentContainerStyle, ...props }: ScrollViewProps) {
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[styles.content, contentContainerStyle]}
        {...props}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundImage: backgroundGradient,
  },
  content: {
    flexGrow: 1,
    padding: spacing.xl,
  },
});
