import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { t } from '@/lib/i18n';
import { pickRecipePhoto, useRecipeForm, type Photo } from '@/lib/recipe-form';
import { colors, radius, spacing, typography } from '@/theme';

/** Sheet "Aggiungi step procedimento" (testo e foto) e "Aggiungi nota"; con `index` modifica la voce. */
export default function RecipeEntry() {
  const params = useLocalSearchParams<{ kind: 'step' | 'note'; index?: string }>();
  const { form, update } = useRecipeForm();
  const isStep = params.kind === 'step';
  const list = isStep ? form.steps : form.notes;
  const index = params.index === undefined ? undefined : Number(params.index);
  const existing = index === undefined ? undefined : form[isStep ? 'steps' : 'notes'][index];
  const [body, setBody] = useState(typeof existing === 'string' ? existing : (existing?.body ?? ''));
  const [photo, setPhoto] = useState<Photo | null>(typeof existing === 'object' ? existing.photo : null);
  const insets = useSafeAreaInsets();
  const position = (index ?? list.length) + 1;

  function save() {
    const text = body.trim();
    if (isStep) {
      const step = { body: text, photo };
      update({ steps: index === undefined ? [...form.steps, step] : form.steps.map((s, i) => (i === index ? step : s)) });
    } else {
      update({ notes: index === undefined ? [...form.notes, text] : form.notes.map((n, i) => (i === index ? text : n)) });
    }
    router.back();
  }

  function remove() {
    if (index !== undefined) {
      if (isStep) update({ steps: form.steps.filter((_, i) => i !== index) });
      else update({ notes: form.notes.filter((_, i) => i !== index) });
    }
    router.back();
  }

  return (
    <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.header}>
        <BackButton close />
        <Text style={styles.title} accessibilityRole="header">
          {t(isStep ? 'newRecipe.stepTitle' : 'newRecipe.noteTitle')}
        </Text>
      </View>
      {isStep && <Text style={styles.number}>{t('newRecipe.stepNumber', { n: position })}</Text>}
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder={t(isStep ? 'newRecipe.stepPlaceholder' : 'newRecipe.notePlaceholder')}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={isStep ? t('newRecipe.stepNumber', { n: position }) : t('newRecipe.note')}
        multiline
        maxLength={isStep ? 1000 : 500}
        style={styles.input}
        autoFocus
      />
      {isStep && (
        <Pressable
          onPress={async () => setPhoto((await pickRecipePhoto()) ?? photo)}
          style={styles.photo}
          accessibilityRole="button"
          accessibilityLabel={t('newRecipe.stepPhoto')}>
          {photo ? (
            <Image source={{ uri: photo.uri }} style={styles.photoImage} accessibilityIgnoresInvertColors />
          ) : (
            <>
              <Icon sf="camera" md="photo_camera" tintColor={colors.textSecondary} />
              <Text style={typography.caption}>{t('newRecipe.stepPhoto')}</Text>
            </>
          )}
        </Pressable>
      )}
      <View style={styles.actions}>
        <Button
          title={t(isStep ? 'newRecipe.deleteStep' : 'newRecipe.deleteNote')}
          onPress={remove}
          style={[styles.action, styles.delete]}
        />
        <Button
          title={t(index !== undefined ? 'newRecipe.save' : isStep ? 'newRecipe.addStep' : 'newRecipe.addNote')}
          onPress={save}
          disabled={!body.trim()}
          style={styles.action}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    gap: spacing.lg,
    padding: spacing.xl,
  },
  header: {
    justifyContent: 'center',
    minHeight: 44,
  },
  title: {
    ...typography.title,
    position: 'absolute',
    alignSelf: 'center',
  },
  number: {
    ...typography.title,
    textAlign: 'center',
  },
  photo: {
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    overflow: 'hidden',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.textMuted,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  input: {
    minHeight: 110,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.border,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  action: {
    flex: 1,
    borderRadius: radius.pill,
  },
  delete: {
    backgroundColor: colors.danger,
  },
});
