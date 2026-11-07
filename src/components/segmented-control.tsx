import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

type Props<T extends string> = {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  label: (value: T) => string;
  style?: StyleProp<ViewStyle>;
};

/** Scelta tra poche opzioni a pillola (sezioni del Profilo, pasti, unità, formati). */
export function SegmentedControl<T extends string>({ options, value, onChange, label, style }: Props<T>) {
  return (
    <View style={[styles.segments, style]} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[styles.segment, selected && styles.segmentSelected]}>
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]} numberOfLines={1}>
              {label(option)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segments: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
  },
  segmentSelected: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    ...typography.label,
    fontSize: 15,
    fontWeight: '500',
  },
  segmentTextSelected: {
    fontWeight: '700',
  },
});
