import { useRef, useState, type ComponentRef } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Icon } from '@/components/icon';
import { t } from '@/lib/i18n';
import { colors, radius, shadow, spacing, typography } from '@/theme';

const MENU_MAX_HEIGHT = 280;

type Props<T> = {
  options: readonly T[];
  /** null o undefined = nessuna scelta: mostra `placeholder`. */
  value: T | null | undefined;
  onChange: (value: T) => void;
  label: (value: T) => string;
  /** Testo mostrato finché non c'è una scelta. */
  placeholder?: string;
  /** Nome del campo per VoiceOver e TalkBack. */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Menu a tendina: pillola con valore e freccia che apre l'elenco sotto di sé (sopra, se sotto non c'è spazio).
 * Modal trasparente come il menu del "+", per funzionare uguale su iOS e Android e dentro gli sheet.
 */
export function SelectMenu<T>({ options, value, onChange, label, placeholder, accessibilityLabel, style }: Props<T>) {
  const trigger = useRef<ComponentRef<typeof View>>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number; width: number; height: number }>();
  const window = useWindowDimensions();
  const text = value === undefined || value === null ? (placeholder ?? t('newRecipe.select')) : label(value);
  const empty = value === undefined || value === null;

  const open = () => trigger.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y, width, height }));
  const below = anchor && anchor.y + anchor.height + MENU_MAX_HEIGHT < window.height;

  return (
    <>
      <Pressable
        ref={trigger}
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel}: ${text}`}
        style={[styles.trigger, style]}>
        <Text style={[styles.value, empty && styles.placeholder]} numberOfLines={1}>
          {text}
        </Text>
        <Icon sf="chevron.down" md="expand_more" size={16} tintColor={colors.text} />
      </Pressable>
      <Modal visible={!!anchor} transparent animationType="fade" onRequestClose={() => setAnchor(undefined)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setAnchor(undefined)} accessibilityLabel={t('common.close')} />
        {anchor && (
          <View
            style={[
              styles.menu,
              {
                left: anchor.x,
                minWidth: anchor.width,
                maxWidth: window.width - anchor.x - spacing.lg,
                ...(below ? { top: anchor.y + anchor.height + spacing.xs } : { bottom: window.height - anchor.y + spacing.xs }),
              },
            ]}>
            <ScrollView bounces={false}>
              {options.map((option, i) => {
                const selected = option === value;
                return (
                  <Pressable
                    key={i}
                    onPress={() => {
                      setAnchor(undefined);
                      onChange(option);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
                    <Text style={[styles.itemLabel, selected && styles.itemSelected]}>{label(option)}</Text>
                    {selected && <Icon sf="checkmark" md="check" size={16} tintColor={colors.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  value: {
    ...typography.label,
    flexShrink: 1,
  },
  placeholder: {
    color: colors.textSecondary,
    fontWeight: '400',
  },
  menu: {
    position: 'absolute',
    maxHeight: MENU_MAX_HEIGHT,
    borderRadius: radius.lg,
    paddingVertical: spacing.xs,
    backgroundColor: colors.sheetBackground,
    ...shadow,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 44,
    marginHorizontal: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  itemPressed: {
    backgroundColor: colors.primarySoft,
  },
  itemLabel: {
    ...typography.body,
    flex: 1,
    color: colors.text,
  },
  itemSelected: {
    fontWeight: '600',
  },
});
