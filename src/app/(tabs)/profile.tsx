import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { GlassSurface } from '@/components/glass-surface';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { i18n, t } from '@/lib/i18n';
import { fetchProfileStats, useProfile, type ProfileStats } from '@/lib/profile';
import { colors, radius, spacing, typography } from '@/theme';

const AVATAR_SIZE = 96;

const sections = ['recipes', 'saved', 'posts'] as const;
type Section = (typeof sections)[number];

/** Profilo dell'utente loggato. Le griglie di ricette e post non sono ancora collegate: solo empty state. */
export default function Profile() {
  const { profile } = useProfile();
  const [stats, setStats] = useState<ProfileStats>();
  const [section, setSection] = useState<Section>('recipes');

  // Ricaricati a ogni ritorno sul tab: i contatori cambiano da altre schermate.
  useFocusEffect(
    useCallback(() => {
      fetchProfileStats().then(setStats, () => {});
    }, []),
  );

  if (!profile) return null;

  const badges = [
    profile.is_diabetic && 'profile.userTypes.diabetic',
    profile.is_celiac && 'profile.userTypes.celiac',
  ].filter((b): b is string => !!b);
  const number = new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: 1 });
  const compact = new Intl.NumberFormat(i18n.locale, { notation: 'compact', maximumFractionDigits: 1 });

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Text style={typography.label} accessibilityRole="header">
          {t('profile.title')}
        </Text>
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel={t('profile.settings')}
          hitSlop={spacing.sm}
          style={styles.settings}>
          <GlassSurface interactive style={styles.settingsSurface}>
            <Icon sf="gearshape" md="settings" size={24} tintColor={colors.text} />
          </GlassSurface>
        </Pressable>
      </View>

      <View style={styles.identity}>
        <View style={styles.avatar}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={StyleSheet.absoluteFill} />
          ) : (
            <Icon sf="person.fill" md="person" size={40} tintColor={colors.textMuted} />
          )}
        </View>
        <View style={styles.identityText}>
          <Text style={styles.nickname}>{profile.nickname}</Text>
          {profile.bio && <Text style={typography.body}>{profile.bio}</Text>}
          {/* Tipo di utente nascosto a tutti, anche a sé stessi, se user_type_public è false. */}
          {profile.user_type_public && (
            <View style={styles.badges}>
              {(badges.length ? badges : ['profile.userTypes.generic']).map((badge) => (
                <Text key={badge} style={styles.badge}>
                  {t(badge)}
                </Text>
              ))}
            </View>
          )}
        </View>
      </View>

      <Card style={styles.stats}>
        <Stat value={stats && compact.format(stats.recipes_count)} label={t('profile.stats.recipes')} />
        <Stat
          value={
            stats &&
            (stats.rating_avg === null
              ? t('profile.stats.noRating')
              : t('profile.stats.ratingValue', { rating: number.format(stats.rating_avg) }))
          }
          label={t('profile.stats.rating')}
        />
        <Stat value={stats && compact.format(stats.followers_count)} label={t('profile.stats.followers')} />
      </Card>

      <View style={styles.segments} accessibilityRole="tablist">
        {sections.map((value) => {
          const selected = value === section;
          return (
            <Pressable
              key={value}
              onPress={() => setSection(value)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={[styles.segment, selected && styles.segmentSelected]}>
              <Text style={[styles.segmentText, selected && styles.segmentTextSelected]} numberOfLines={1}>
                {t(`profile.sections.${value}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.empty}>
        <Text style={typography.title}>{t(`profile.empty.${section}`)}</Text>
      </View>
    </Screen>
  );
}

/** value undefined = contatori in caricamento. */
function Stat({ value, label }: { value: string | undefined; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={typography.title}>{value ?? '–'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
  },
  topBar: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settings: {
    position: 'absolute',
    right: 0,
  },
  settingsSurface: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  identityText: {
    flex: 1,
    gap: spacing.xs,
  },
  nickname: {
    ...typography.title,
    fontSize: 22,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  badge: {
    ...typography.label,
    color: colors.onPrimary,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  stats: {
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statLabel: {
    ...typography.caption,
    letterSpacing: 0.5,
  },
  segments: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
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
  empty: {
    flex: 1,
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
