import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radius, shadow, spacing } from '@/theme';

/** Contenitore bianco con bordo e ombra leggera (form, sezioni). */
export function Card({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow,
  },
});
