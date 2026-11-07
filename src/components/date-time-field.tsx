import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { i18n } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme';

type Props = {
  label: string;
  value: Date;
  onChange: (value: Date) => void;
  mode: 'date' | 'time';
  minimumDate?: Date;
  maximumDate?: Date;
};

/** Riga con etichetta e data o orario: selettore compatto su iOS, dialog di sistema su Android. */
export function DateTimeField({ label, value, onChange, mode, minimumDate, maximumDate }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={value}
          mode={mode}
          display="compact"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onValueChange={(_, date) => onChange(date)}
          accessibilityLabel={label}
        />
      ) : (
        <Pressable
          onPress={() =>
            DateTimePickerAndroid.open({
              value,
              mode,
              is24Hour: true,
              minimumDate,
              maximumDate,
              onValueChange: (_, date) => onChange(date),
            })
          }
          accessibilityRole="button"
          accessibilityLabel={label}
          style={styles.chip}>
          <Text style={styles.chipText}>
            {mode === 'date'
              ? value.toLocaleDateString(i18n.locale, { day: 'numeric', month: 'short', year: 'numeric' })
              : value.toLocaleTimeString(i18n.locale, { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 44,
  },
  label: {
    ...typography.label,
    flex: 1,
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.inputBackground,
  },
  chipText: {
    ...typography.label,
    fontVariant: ['tabular-nums'],
  },
});
