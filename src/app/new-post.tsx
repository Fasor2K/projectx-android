import { router, useNavigation, usePreventRemove } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { t } from '@/lib/i18n';
import { ApiError, invoke, useProfile, type Community } from '@/lib/profile';
import { pickRecipePhoto, type Photo } from '@/lib/recipe-form';
import { colors, radius, spacing, typography } from '@/theme';

const BODY_MAX = 1000;
const AVATAR_SIZE = 36;

/** Nuovo post (dal "+"): testo, foto facoltativa e visibilità tra le community dell'utente e Generale (create-post). */
export default function NewPost() {
  const { profile } = useProfile();
  const navigation = useNavigation();
  const [body, setBody] = useState('');
  const [photo, setPhoto] = useState<Photo | null>(null);
  // null = Generale. Chi non ha community non vede la scelta e pubblica sempre in Generale.
  const [community, setCommunity] = useState<Community | null>(null);
  const [saving, setSaving] = useState(false);
  const [published, setPublished] = useState(false);
  const communities = profile?.communities ?? [];

  // Uscire senza pubblicare perde il post: si chiede conferma (anche con lo swipe indietro).
  usePreventRemove(!published && (!!body.trim() || !!photo), ({ data }) =>
    Alert.alert(t('newPost.discardTitle'), t('newPost.discardMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('newPost.discard'), style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]),
  );

  // Si esce quando usePreventRemove non blocca più.
  useEffect(() => {
    if (!published) return;
    router.back();
    Alert.alert(t('newPost.published'));
  }, [published]);

  async function publish() {
    if (!body.trim()) return Alert.alert(t('newPost.emptyTitle'), t('newPost.emptyMessage'));
    setSaving(true);
    try {
      await invoke<{ id: string }>('create-post', {
        method: 'POST',
        body: { body: body.trim(), community, image_base64: photo?.base64 },
      });
      setPublished(true);
    } catch (e) {
      const code = e instanceof ApiError ? e.code : undefined;
      Alert.alert(t(code === 'image_too_large' ? 'newPost.imageTooLarge' : 'authErrors.generic'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      back
      contentContainerStyle={styles.content}
      headerRight={
        <Button title={t('newPost.publish')} onPress={publish} loading={saving} disabled={saving} style={styles.publish} />
      }>
      {/* Alla stessa altezza dell'indietro e di "Pubblica", fissi sopra. */}
      <View style={styles.titleRow}>
        <Text style={typography.title} accessibilityRole="header">
          {t('newPost.title')}
        </Text>
      </View>

      <Card>
        <View style={styles.author}>
          <View style={styles.avatar}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={StyleSheet.absoluteFill} />
            ) : (
              <Icon sf="person.fill" md="person" size={20} tintColor={colors.textMuted} />
            )}
          </View>
          <Text style={styles.nickname}>{profile?.nickname}</Text>
        </View>

        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder={t('newPost.placeholder')}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={t('newPost.placeholder')}
          maxLength={BODY_MAX}
          multiline
          style={styles.input}
        />
        <Text style={[typography.caption, styles.counter]}>
          {body.length} / {BODY_MAX}
        </Text>

        <Pressable
          onPress={async () => setPhoto((await pickRecipePhoto()) ?? photo)}
          style={styles.photo}
          accessibilityRole="button"
          accessibilityLabel={t('newPost.addPhoto')}>
          {photo ? (
            <Image source={{ uri: photo.uri }} style={styles.photoImage} accessibilityIgnoresInvertColors />
          ) : (
            <>
              <Icon sf="camera" md="photo_camera" size={28} tintColor={colors.textSecondary} />
              <Text style={typography.body}>{t('newPost.addPhoto')}</Text>
            </>
          )}
        </Pressable>
      </Card>

      {communities.length > 0 && (
        <View style={styles.visibility} accessibilityRole="radiogroup">
          <Text style={typography.title}>{t('newPost.visibility')}</Text>
          {[...communities, null].map((c) => (
            <Option
              key={c ?? 'general'}
              title={t(c ? `profileSetup.communities.${c}` : 'newPost.general')}
              description={t(c ? `newPost.communityHints.${c}` : 'newPost.generalHint')}
              selected={community === c}
              onPress={() => setCommunity(c)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

/** Scelta della visibilità: card con radio, bordata di blu quando selezionata. */
function Option({ title, description, selected, onPress }: { title: string; description: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: selected }}>
      <Card style={[styles.option, selected && styles.optionSelected]}>
        <View style={[styles.radio, selected && styles.radioSelected]}>{selected && <View style={styles.radioDot} />}</View>
        <View style={styles.optionText}>
          <Text style={typography.title}>{title}</Text>
          <Text style={typography.body}>{description}</Text>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  publish: {
    minHeight: 44,
    borderRadius: radius.pill,
  },
  titleRow: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  author: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
  },
  nickname: {
    ...typography.label,
    fontSize: 15,
  },
  input: {
    fontSize: 16,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  counter: {
    alignSelf: 'flex-end',
  },
  photo: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.textMuted,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  visibility: {
    gap: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  optionSelected: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  optionText: {
    flex: 1,
    gap: spacing.xs,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
});
