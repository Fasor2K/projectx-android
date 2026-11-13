import { router } from 'expo-router';

import { TagPicker } from '@/components/tag-picker';
import { t } from '@/lib/i18n';
import { useRecipeForm } from '@/lib/recipe-form';

/** Sheet "Seleziona i Tag" della nuova ricetta. */
export default function RecipeTags() {
  const { form, update } = useRecipeForm();
  return (
    <TagPicker
      title={t('newRecipe.tagsTitle')}
      initial={form.tags}
      onConfirm={(tags) => {
        update({ tags });
        router.back();
      }}
    />
  );
}
