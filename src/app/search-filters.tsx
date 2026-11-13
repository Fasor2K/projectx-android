import { router } from 'expo-router';

import { TagPicker } from '@/components/tag-picker';
import { t } from '@/lib/i18n';
import { useSearchFilters } from '@/lib/search';

/** Sheet "Filtri" di Cerca: la scelta vale solo dopo Conferma. */
export default function SearchFilters() {
  const { tags, setTags } = useSearchFilters();
  return (
    <TagPicker
      title={t('filters.title')}
      initial={tags}
      reset
      onConfirm={(selected) => {
        setTags(selected);
        router.back();
      }}
    />
  );
}
