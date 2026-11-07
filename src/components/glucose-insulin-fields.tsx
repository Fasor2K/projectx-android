import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { DateTimeField } from '@/components/date-time-field';
import { TextField } from '@/components/text-field';
import type { GlucoseInsulinForm } from '@/lib/diary';
import { t } from '@/lib/i18n';
import { spacing } from '@/theme';

/** "Inserisci glicemia" e "Dosi di insulina", ciascuno con il suo orario modificabile. */
export function GlucoseInsulinFields({
  form,
  onChange,
}: {
  form: GlucoseInsulinForm;
  onChange: (form: GlucoseInsulinForm) => void;
}) {
  return (
    <View style={styles.root}>
      <Card>
        <TextField
          label={t('diary.meal.enterGlucose')}
          icon={{ sf: 'drop', md: 'water_drop' }}
          suffix="mg/dL"
          placeholder="0"
          value={form.glucose}
          onChangeText={(glucose) => onChange({ ...form, glucose })}
          keyboardType="number-pad"
          maxLength={3}
        />
        <DateTimeField
          label={t('diary.meal.measuredAt')}
          mode="time"
          value={form.measuredAt}
          onChange={(measuredAt) => onChange({ ...form, measuredAt })}
        />
      </Card>
      <Card>
        <TextField
          label={t('diary.meal.insulinDose')}
          icon={{ sf: 'syringe', md: 'vaccines' }}
          suffix={t('diary.insulinValue', { value: '' }).trim()}
          placeholder="0"
          value={form.insulin}
          onChangeText={(insulin) => onChange({ ...form, insulin })}
          keyboardType="decimal-pad"
          maxLength={5}
        />
        <DateTimeField
          label={t('diary.meal.administeredAt')}
          mode="time"
          value={form.administeredAt}
          onChange={(administeredAt) => onChange({ ...form, administeredAt })}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
  },
});
