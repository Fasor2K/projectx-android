import { router, useNavigation, usePreventRemove } from 'expo-router';
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BackButtonSpace } from '@/components/back-button';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { InfoButton, Pill } from '@/components/food-detail';
import { GlassSurface } from '@/components/glass-surface';
import { Icon } from '@/components/icon';
import { Stepper } from '@/components/quantity-field';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { SelectMenu } from '@/components/select-menu';
import { formatIngredient, formatPrepTime, type Difficulty } from '@/lib/food';
import { t } from '@/lib/i18n';
import { ApiError } from '@/lib/profile';
import { createRecipe, emptyRecipe, pickRecipePhoto, prepTimes, useRecipeForm } from '@/lib/recipe-form';
import { colors, radius, shadow, spacing, typography } from '@/theme';

const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
const visibilities = ['public', 'private'] as const;

/** Schermata "Aggiungi ricetta" (dal "+"): si pubblica o si salva in bozza con create-recipe. */
export default function NewRecipe() {
  const { form, update } = useRecipeForm();
  const navigation = useNavigation();
  const [saving, setSaving] = useState<'publish' | 'draft'>();
  const [saved, setSaved] = useState<{ id: string; published: boolean }>();
  const dirty = form !== emptyRecipe;

  // Uscire senza salvare perde la ricetta: si chiede conferma (anche con lo swipe indietro).
  usePreventRemove(dirty && !saved, ({ data }) =>
    Alert.alert(t('newRecipe.discardTitle'), t('newRecipe.discardMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('newRecipe.discard'), style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]),
  );

  // Dopo il salvataggio, quando usePreventRemove non blocca più l'uscita: pubblicata → dettaglio, bozza → Profilo.
  useEffect(() => {
    if (!saved) return;
    if (saved.published) router.replace({ pathname: '/recipe', params: { id: saved.id } });
    else {
      router.dismissTo('/profile');
      Alert.alert(t('newRecipe.draftSaved'));
    }
  }, [saved]);

  async function submit(publish: boolean) {
    const servingsText = form.servings.trim();
    const servings = servingsText === '' || servingsText === '0' ? null : Number(servingsText);
    const problem =
      servings !== null && !(Number.isInteger(servings) && servings >= 1 && servings <= 100)
        ? 'servings'
        : !publish
          ? undefined
          : !form.title.trim()
            ? 'title'
            : servings === null
              ? 'servings'
              : !form.ingredients.length
                ? 'ingredients'
                : undefined;
    if (problem) return Alert.alert(t('newRecipe.missingTitle'), t(`newRecipe.errors.${problem}`));

    setSaving(publish ? 'publish' : 'draft');
    try {
      setSaved(await createRecipe(form, publish));
    } catch (e) {
      const code = e instanceof ApiError ? e.code : undefined;
      const known = code === 'image_too_large' || code === 'ingredient_not_found';
      Alert.alert(t(known ? `newRecipe.errors.${code}` : 'authErrors.generic'));
    } finally {
      setSaving(undefined);
    }
  }

  const guideOptions = [null, ...form.ingredients.map((_, i) => i)];

  return (
    <Screen
      back
      contentContainerStyle={styles.content}
      headerRight={
        <>
          <Pressable
            onPress={() => submit(false)}
            disabled={!!saving}
            accessibilityRole="button"
            accessibilityLabel={t('newRecipe.saveDraft')}
            accessibilityState={{ busy: saving === 'draft' }}
            hitSlop={spacing.xs}>
            <GlassSurface interactive style={styles.draftButton}>
              {saving === 'draft' ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Icon sf="square.and.arrow.down" md="download" tintColor={colors.text} />
              )}
            </GlassSurface>
          </Pressable>
          <Button
            title={t('newRecipe.publish')}
            onPress={() => submit(true)}
            loading={saving === 'publish'}
            disabled={!!saving}
            style={styles.publish}
          />
        </>
      }>
      <BackButtonSpace />

      <TextInput
        value={form.title}
        onChangeText={(title) => update({ title })}
        placeholder={t('newRecipe.name')}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={t('newRecipe.name')}
        maxLength={100}
        style={styles.name}
      />

      <Pressable
        onPress={async () => update({ cover: (await pickRecipePhoto([4, 3])) ?? form.cover })}
        style={styles.cover}
        accessibilityRole="button"
        accessibilityLabel={t('newRecipe.addCover')}>
        {form.cover ? (
          <Image source={{ uri: form.cover.uri }} style={styles.coverImage} accessibilityIgnoresInvertColors />
        ) : (
          <>
            <Icon sf="camera" md="photo_camera" size={28} tintColor={colors.textSecondary} />
            <Text style={typography.caption}>{t('newRecipe.addCover')}</Text>
          </>
        )}
      </Pressable>

      <View style={styles.pair}>
        <Card style={styles.pairCard}>
          <Label icon={{ sf: 'clock', md: 'schedule' }} text={t('newRecipe.prepTime')} />
          <SelectMenu
            options={prepTimes}
            value={form.prepMinutes}
            onChange={(prepMinutes) => update({ prepMinutes })}
            label={formatPrepTime}
            accessibilityLabel={t('newRecipe.prepTime')}
          />
        </Card>
        <Card style={styles.pairCard}>
          <Label icon={{ sf: 'frying.pan', md: 'skillet' }} text={t('newRecipe.difficulty')} />
          <SelectMenu
            options={difficulties}
            value={form.difficulty}
            onChange={(difficulty) => update({ difficulty })}
            label={(d) => t(`foodDetail.difficulties.${d}`)}
            accessibilityLabel={t('newRecipe.difficulty')}
          />
        </Card>
      </View>

      <View style={styles.servingsRow}>
        <View style={styles.servingsText}>
          <Text style={typography.title}>{t('newRecipe.servings')}</Text>
          <Text style={typography.caption}>{t('newRecipe.servingsHint')}</Text>
        </View>
        <Stepper value={form.servings} onChange={(servings) => update({ servings })} step={1} label={t('newRecipe.servings')} />
      </View>

      <Section
        title={t('newRecipe.ingredients')}
        hint={form.ingredients.length ? undefined : t('newRecipe.ingredientsHint')}
        add={t('newRecipe.addIngredient')}
        onAdd={() => router.push('/new-recipe/ingredient')}>
        {form.ingredients.map((ing, i) => (
          <Row
            key={i}
            label={ing.name}
            detail={formatIngredient(ing.unit === 'to_taste' ? null : Number(ing.quantity.replace(',', '.')), ing.unit)}
            onPress={() => router.push({ pathname: '/new-recipe/ingredient', params: { index: i } })}
          />
        ))}
      </Section>

      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Text style={typography.label}>{t('newRecipe.guide')}</Text>
          <InfoButton title={t('newRecipe.guide')} message={t('newRecipe.guideInfo')} />
        </View>
        <SelectMenu
          options={guideOptions}
          value={form.guide}
          onChange={(guide) => update({ guide })}
          label={(i) => (i === null ? t('newRecipe.noGuide') : form.ingredients[i].name)}
          accessibilityLabel={t('newRecipe.guide')}
          style={styles.guide}
        />
      </View>

      <Section
        title={t('newRecipe.method')}
        hint={form.steps.length ? undefined : t('newRecipe.methodHint')}
        add={t('newRecipe.addStep')}
        onAdd={() => router.push({ pathname: '/new-recipe/entry', params: { kind: 'step' } })}>
        {form.steps.map((step, i) => (
          <Row
            key={i}
            label={
              <>
                <Text style={styles.bold}>{i + 1}. </Text>
                {step.body}
              </>
            }
            photo={!!step.photo}
            onPress={() => router.push({ pathname: '/new-recipe/entry', params: { kind: 'step', index: i } })}
          />
        ))}
      </Section>

      <Section
        title={t('newRecipe.notes')}
        hint={form.notes.length ? undefined : t('newRecipe.notesHint')}
        add={t('newRecipe.addNote')}
        onAdd={() => router.push({ pathname: '/new-recipe/entry', params: { kind: 'note' } })}>
        {form.notes.map((note, i) => (
          <Row
            key={i}
            label={`•  ${note}`}
            onPress={() => router.push({ pathname: '/new-recipe/entry', params: { kind: 'note', index: i } })}
          />
        ))}
      </Section>

      <Section
        title={t('newRecipe.tags')}
        hint={form.tags.length ? undefined : t('newRecipe.tagsHint')}
        add={t('newRecipe.addTags')}
        onAdd={() => router.push('/new-recipe/tags')}>
        {form.tags.length > 0 && (
          <View style={styles.chips}>
            {form.tags.map((slug) => (
              <Pill key={slug} label={t(`filters.tags.${slug}`)} />
            ))}
          </View>
        )}
      </Section>

      <View style={styles.field}>
        <Text style={typography.title}>{t('newRecipe.visibility')}</Text>
        <SegmentedControl
          options={visibilities}
          value={form.visibility}
          onChange={(visibility) => update({ visibility })}
          label={(v) => t(`newRecipe.visibilities.${v}`)}
          style={styles.visibility}
        />
      </View>
    </Screen>
  );
}

function Label({ icon, text }: { icon: Pick<ComponentProps<typeof Icon>, 'sf' | 'md'>; text: string }) {
  return (
    <View style={[styles.labelRow, styles.centered]}>
      <Icon {...icon} size={20} tintColor={colors.text} />
      <Text style={typography.label}>{text}</Text>
    </View>
  );
}

/** Card con titolo sopra, suggerimento finché è vuota, voci e pulsante blu "+ Aggiungi …". */
function Section({ title, hint, add, onAdd, children }: { title: string; hint?: string; add: string; onAdd: () => void; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={typography.title}>{title}</Text>
      <Card style={styles.card}>
        {hint && <Text style={typography.caption}>{hint}</Text>}
        {children}
        <Button title={add} icon={{ sf: 'plus', md: 'add' }} onPress={onAdd} style={styles.add} />
      </Card>
    </View>
  );
}

/** Voce di un elenco (ingrediente, step, nota): la matita la modifica. */
function Row({ label, detail, photo, onPress }: { label: ReactNode; detail?: string; photo?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.row} accessibilityRole="button" accessibilityHint={t('newRecipe.editHint')}>
      <Text style={[typography.body, styles.rowLabel]} numberOfLines={4}>
        {label}
      </Text>
      {photo && <Icon sf="photo" md="image" size={16} tintColor={colors.textMuted} />}
      {detail && <Text style={typography.label}>{detail}</Text>}
      <Icon sf="pencil" md="edit" size={18} tintColor={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  draftButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publish: {
    minHeight: 44,
    borderRadius: radius.pill,
  },
  name: {
    ...typography.title,
    fontSize: 20,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadow,
  },
  cover: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.textMuted,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  pair: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  pairCard: {
    flex: 1,
    gap: spacing.sm,
    alignItems: 'stretch',
    padding: spacing.md,
  },
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  servingsText: {
    flex: 1,
    gap: 2,
  },
  field: {
    gap: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  centered: {
    justifyContent: 'center',
  },
  guide: {
    backgroundColor: colors.surface,
  },
  card: {
    gap: spacing.sm,
  },
  add: {
    minHeight: 44,
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
  },
  rowLabel: {
    flex: 1,
    color: colors.text,
  },
  bold: {
    fontWeight: '700',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  visibility: {
    alignSelf: 'flex-start',
  },
});
