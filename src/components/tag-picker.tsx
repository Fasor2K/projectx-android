import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ChoiceButton } from '@/components/choice-button';
import { t } from '@/lib/i18n';
import { tagSections } from '@/lib/search';
import { colors, radius, spacing, typography } from '@/theme';

const sections = Object.keys(tagSections) as (keyof typeof tagSections)[];

type Props = {
  title: string;
  initial: string[];
  /** Riceve gli slug scelti; la scelta vale solo dopo Conferma. */
  onConfirm: (tags: string[]) => void;
  /** Mostra "Azzera" accanto a Conferma. */
  reset?: boolean;
};

/** Contenuto di uno sheet di tag per sezione (Filtri di Cerca, Tag della nuova ricetta). */
export function TagPicker({ title, initial, onConfirm, reset = false }: Props) {
  const [selected, setSelected] = useState(initial);
  const insets = useSafeAreaInsets();

  const toggle = (slug: string) =>
    setSelected(selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug]);

  return (
    <View style={styles.sheet}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {sections.map((section) => (
          <View key={section} style={styles.section}>
            <Text style={styles.sectionTitle}>{t(`filters.sections.${section}`)}</Text>
            <View style={styles.chips}>
              {tagSections[section].map((slug) => (
                <ChoiceButton
                  key={slug}
                  label={t(`filters.tags.${slug}`)}
                  selected={selected.includes(slug)}
                  onPress={() => toggle(slug)}
                  style={styles.chip}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.lg }]}>
        {reset && <Button title={t('filters.reset')} onPress={() => setSelected([])} style={[styles.action, styles.reset]} />}
        <Button title={t('filters.confirm')} onPress={() => onConfirm(selected)} style={styles.action} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.xl,
  },
  title: {
    ...typography.title,
    textAlign: 'center',
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 0,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  action: {
    flex: 1,
    borderRadius: radius.pill,
  },
  reset: {
    backgroundColor: colors.danger,
  },
});
