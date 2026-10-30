import { StyleSheet, Switch, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

type Props = {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

/** Riga con titolo, descrizione e interruttore di sistema. */
export function SwitchRow({ title, subtitle, value, onValueChange, disabled }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={typography.caption}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: colors.primary }}
        accessibilityLabel={title}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.label,
    fontSize: 15,
    fontWeight: '500',
  },
});
