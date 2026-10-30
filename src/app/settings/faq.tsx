import { StyleSheet, Text, View } from 'react-native';

import { BackButton } from '@/components/back-button';
import { Screen } from '@/components/screen';
import { t } from '@/lib/i18n';
import { spacing, typography } from '@/theme';

/** Domande frequenti: per ora vuota. */
export default function Faq() {
  return (
    <Screen contentContainerStyle={styles.content}>
      <BackButton />
      <Text style={typography.display} accessibilityRole="header">
        {t('faq.title')}
      </Text>
      <View style={styles.empty}>
        <Text style={typography.body}>{t('faq.empty')}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
