import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { GlassSurface } from '@/components/glass-surface';
import { Icon } from '@/components/icon';
import { t } from '@/lib/i18n';
import { colors, radius, spacing } from '@/theme';

/** Pulsante "indietro" flottante in vetro, per le schermate senza header. */
export function BackButton() {
  return (
    <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('common.back')} hitSlop={spacing.sm}>
      <GlassSurface interactive style={styles.back}>
        <Icon sf="chevron.left" md="arrow_back" tintColor={colors.text} />
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
