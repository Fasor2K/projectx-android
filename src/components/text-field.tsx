import { useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Icon } from '@/components/icon';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme';

type Props = TextInputProps & {
  label: string;
  icon?: Pick<ComponentProps<typeof Icon>, 'sf' | 'md'>;
  hint?: string;
  /** Campo password: nasconde il testo e mostra il pulsante per vederlo. */
  secure?: boolean;
};

/** Campo di testo con etichetta, icona iniziale, nota sotto e toggle per le password. */
export function TextField({ label, icon, hint, secure = false, style, ...props }: Props) {
  const [hidden, setHidden] = useState(secure);

  return (
    <View style={styles.container}>
      <Text style={typography.label}>{label}</Text>
      <View style={styles.field}>
        {icon && <Icon {...icon} />}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={hidden}
          autoCapitalize={secure ? 'none' : props.autoCapitalize}
          accessibilityLabel={label}
          {...props}
        />
        {secure && (
          <Pressable
            onPress={() => setHidden(!hidden)}
            hitSlop={spacing.sm}
            accessibilityRole="button"
            accessibilityLabel={t(hidden ? 'textField.showPassword' : 'textField.hidePassword')}>
            <Icon
              sf={hidden ? 'eye.slash' : 'eye'}
              md={hidden ? 'visibility_off' : 'visibility'}
              tintColor={colors.textMuted}
            />
          </Pressable>
        )}
      </View>
      {hint && <Text style={typography.caption}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBackground,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: spacing.md,
  },
});
