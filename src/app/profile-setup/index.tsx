import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { router } from 'expo-router';
import { Alert, Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ChoiceButton } from '@/components/choice-button';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { TextField } from '@/components/text-field';
import { t } from '@/lib/i18n';
import { useProfile } from '@/lib/profile';
import { toggleChoice, useProfileForm, useSaveProfile, type UserType } from '@/lib/profile-form';
import { colors, radius, spacing, typography } from '@/theme';

const AVATAR_SIZE = 140;
const AVATAR_WIDTH_PX = 512; // keeps the JPEG well under the 2 MB limit of the avatars bucket

const userTypes: { value: UserType; label: string }[] = [
  { value: 'generic', label: 'profileSetup.userTypes.generic' },
  { value: 'diabetic', label: 'profileSetup.userTypes.diabetic' },
  { value: 'celiac', label: 'profileSetup.userTypes.celiac' },
];

const communities = [
  { value: 'none', label: 'profileSetup.communities.none' },
  { value: 'diabetes', label: 'profileSetup.communities.diabetes' },
  { value: 'celiac', label: 'profileSetup.communities.celiac' },
] as const;

export default function CompleteProfile() {
  const { profile } = useProfile();
  const { form, update } = useProfileForm();
  const { save, saving } = useSaveProfile();
  const avatarUri = form.avatar?.uri ?? profile?.avatar_url;
  const isDiabetic = form.userTypes.includes('diabetic');

  async function pickAvatar() {
    const result = await launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1] });
    if (result.canceled) return;
    const image = await ImageManipulator.manipulate(result.assets[0].uri).resize({ width: AVATAR_WIDTH_PX }).renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
    update({ avatar: { uri: saved.uri, base64: saved.base64! } });
  }

  function next() {
    if (!form.userTypes.length) return Alert.alert(t('profileSetup.missingTitle'), t('profileSetup.errors.userType'));
    if (!form.communities.length) return Alert.alert(t('profileSetup.missingTitle'), t('profileSetup.errors.community'));
    // Il range glicemico si chiede solo a chi è diabetico o aiuta un diabetico.
    if (isDiabetic) router.push('/profile-setup/glucose-range');
    else save();
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={typography.display} accessibilityRole="header">
          {t('profileSetup.title')}
        </Text>
        <Text style={typography.body}>{t('profileSetup.subtitle')}</Text>
      </View>

      <Pressable
        onPress={pickAvatar}
        style={styles.avatar}
        accessibilityRole="button"
        accessibilityLabel={t('profileSetup.addPhoto')}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
        ) : (
          <>
            <Icon sf="camera" md="photo_camera" size={26} tintColor={colors.text} />
            <Text style={[typography.caption, styles.avatarText]}>{t('profileSetup.addPhoto')}</Text>
          </>
        )}
      </Pressable>

      <Card>
        <SectionHeader
          icon={{ sf: 'info.circle', md: 'info' }}
          title={t('profileSetup.bioTitle')}
          subtitle={t('profileSetup.bioSubtitle')}
        />
        <TextField
          label={t('profileSetup.bioLabel')}
          placeholder={t('profileSetup.bioPlaceholder')}
          value={form.bio}
          onChangeText={(bio) => update({ bio })}
          multiline
          maxLength={500}
          style={styles.bio}
        />
      </Card>

      <Card>
        <SectionHeader
          icon={{ sf: 'info.circle', md: 'info' }}
          title={t('profileSetup.userTypeTitle')}
          subtitle={t('profileSetup.userTypeSubtitle')}
        />
        <Text style={typography.label}>{t('profileSetup.userTypeLabel')}</Text>
        {userTypes.map(({ value, label }) => (
          <ChoiceButton
            key={value}
            label={t(label)}
            selected={form.userTypes.includes(value)}
            onPress={() => update({ userTypes: toggleChoice(form.userTypes, value, 'generic') })}
          />
        ))}
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={typography.label}>{t('profileSetup.visibilityLabel')}</Text>
            <Text style={typography.caption}>{t('profileSetup.visibilityHint')}</Text>
          </View>
          <Switch
            value={form.userTypePublic}
            onValueChange={(userTypePublic) => update({ userTypePublic })}
            trackColor={{ true: colors.primary }}
            accessibilityLabel={t('profileSetup.visibilityLabel')}
          />
        </View>
      </Card>

      <Card>
        <SectionHeader
          icon={{ sf: 'info.circle', md: 'info' }}
          title={t('profileSetup.communityTitle')}
          subtitle={t('profileSetup.communitySubtitle')}
        />
        <Text style={typography.label}>{t('profileSetup.communityLabel')}</Text>
        {communities.map(({ value, label }) => (
          <ChoiceButton
            key={value}
            label={t(label)}
            selected={form.communities.includes(value)}
            onPress={() => update({ communities: toggleChoice(form.communities, value, 'none') })}
          />
        ))}
      </Card>

      <Button
        title={t(isDiabetic ? 'profileSetup.next' : 'profileSetup.confirm')}
        loading={saving}
        onPress={next}
        style={styles.submit}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  header: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.textMuted,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  avatarImage: {
    ...StyleSheet.absoluteFill,
  },
  avatarText: {
    textAlign: 'center',
    color: colors.text,
  },
  bio: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  switchText: {
    flex: 1,
    gap: 2,
  },
  submit: {
    alignSelf: 'flex-end',
    borderRadius: radius.pill,
  },
});
