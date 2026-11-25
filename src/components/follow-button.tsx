import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { followUser } from '@/lib/food';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme';

type Props = {
  userId: string;
  following: boolean;
  /** Chiamata subito con il nuovo stato (ottimistico) e di nuovo con quello vecchio se follow-user fallisce. */
  onChange: (following: boolean) => void;
  /** Stile aggiuntivo di "Segui già" (es. sfondo bianco dove primarySoft si confonde). */
  followingStyle?: StyleProp<ViewStyle>;
};

/** "Segui" / "Segui già" (follow-user): dettaglio ricetta e post della Home. */
export function FollowButton({ userId, following, onChange, followingStyle }: Props) {
  const [saving, setSaving] = useState(false);

  async function toggle() {
    const next = !following;
    onChange(next);
    setSaving(true);
    try {
      await followUser(userId, next);
    } catch {
      onChange(!next);
      Alert.alert(t('foodDetail.followFailed'), t('authErrors.generic'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Pressable
      onPress={toggle}
      disabled={saving}
      hitSlop={7}
      accessibilityRole="button"
      accessibilityState={{ selected: following, busy: saving }}
      style={[styles.follow, following && [styles.following, followingStyle]]}>
      <Text style={[styles.followText, following && styles.followingText]}>
        {t(following ? 'foodDetail.following' : 'foodDetail.follow')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  follow: {
    minHeight: 30, // hitSlop keeps the 44pt touch target
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  following: {
    backgroundColor: colors.primarySoft,
  },
  followText: {
    ...typography.label,
    fontSize: 12,
    color: colors.onPrimary,
  },
  followingText: {
    color: colors.primary,
  },
});
