import { Alert, StyleSheet, Text, View } from 'react-native';

import { BackButton } from '@/components/back-button';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { TextField } from '@/components/text-field';
import { t } from '@/lib/i18n';
import { useProfileForm, useSaveProfile } from '@/lib/profile-form';
import { colors, radius, spacing, typography } from '@/theme';

// = GLUCOSE_MIN/GLUCOSE_MAX in projectx-be/supabase/functions/save-profile
const GLUCOSE_MIN = 20;
const GLUCOSE_MAX = 600;

const isGlucose = (value: string) => /^\d+$/.test(value) && +value >= GLUCOSE_MIN && +value <= GLUCOSE_MAX;

/** Mostrata solo a chi è diabetico o aiuta un diabetico: i due valori sono obbligatori. */
export default function GlucoseRange() {
  const { form, update } = useProfileForm();
  const { save, saving } = useSaveProfile();

  function confirm() {
    if (!isGlucose(form.glucoseMin) || !isGlucose(form.glucoseMax)) {
      return Alert.alert(
        t('profileSetup.missingTitle'),
        t('profileSetup.errors.glucoseValues', { min: GLUCOSE_MIN, max: GLUCOSE_MAX }),
      );
    }
    if (+form.glucoseMax <= +form.glucoseMin) {
      return Alert.alert(t('profileSetup.missingTitle'), t('profileSetup.errors.glucoseRange'));
    }
    save();
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <BackButton />

      <Card>
        <SectionHeader
          icon={{ sf: 'chart.line.uptrend.xyaxis', md: 'show_chart' }}
          title={t('glucoseRange.title')}
          subtitle={t('glucoseRange.subtitle')}
        />
        <View style={styles.fields}>
          <View style={styles.field}>
            <TextField
              label={t('glucoseRange.minLabel')}
              icon={{ sf: 'arrow.down', md: 'arrow_downward' }}
              suffix="mg/dL"
              placeholder="70"
              value={form.glucoseMin}
              onChangeText={(glucoseMin) => update({ glucoseMin })}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
          <View style={styles.field}>
            <TextField
              label={t('glucoseRange.maxLabel')}
              icon={{ sf: 'arrow.up', md: 'arrow_upward' }}
              suffix="mg/dL"
              placeholder="180"
              value={form.glucoseMax}
              onChangeText={(glucoseMax) => update({ glucoseMax })}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
        </View>
        <View style={styles.note}>
          <Icon sf="questionmark.circle" md="help" size={16} />
          <Text style={[typography.caption, styles.noteText]}>{t('glucoseRange.note')}</Text>
        </View>
      </Card>

      <Button title={t('glucoseRange.confirm')} loading={saving} onPress={confirm} style={styles.submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  fields: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  field: {
    flex: 1,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
  },
  noteText: {
    flex: 1,
  },
  submit: {
    alignSelf: 'flex-end',
    borderRadius: radius.pill,
  },
});
