import { type ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '@/components/icon';
import { colors, radius, shadow, spacing, typography } from '@/theme';

type Props = Omit<PressableProps, 'style'> & {
  title: string;
  /** Icona dopo il testo. */
  icon?: Pick<ComponentProps<typeof Icon>, 'sf' | 'md'>;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Pulsante primario pieno. */
export function Button({ title, icon, loading = false, disabled, style, ...props }: Props) {
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, inactive && styles.disabled, style]}
      {...props}>
      {loading ? (
        <ActivityIndicator color={colors.onPrimary} />
      ) : (
        <>
          <Text style={typography.button}>{title}</Text>
          {icon && <Icon {...icon} size={18} tintColor={colors.onPrimary} />}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 54,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    ...shadow,
  },
  pressed: {
    backgroundColor: colors.primaryPressed,
  },
  disabled: {
    backgroundColor: colors.primaryDisabled,
  },
});
