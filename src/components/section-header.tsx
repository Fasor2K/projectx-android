import { type ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { colors, radius, spacing, typography } from '@/theme';

type Props = {
  icon: Pick<ComponentProps<typeof Icon>, 'sf' | 'md'>;
  title: string;
  subtitle?: string;
};

/** Intestazione di una Card: icona su fondo tenue, titolo e sottotitolo. */
export function SectionHeader({ icon, title, subtitle }: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.icon}>
        <Icon {...icon} />
      </View>
      <View style={styles.text}>
        <Text style={typography.title} accessibilityRole="header">
          {title}
        </Text>
        {subtitle && <Text style={typography.caption}>{subtitle}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
