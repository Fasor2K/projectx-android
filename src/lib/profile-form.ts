import { createContext, useContext, useState } from 'react';
import { Alert } from 'react-native';

import { t } from '@/lib/i18n';
import { ApiError, saveProfile, useProfile, type Community, type Profile, type ProfileInput } from '@/lib/profile';

export type UserType = 'generic' | 'diabetic' | 'celiac';

/** Stato condiviso dalle schermate di profile-setup: si salva tutto insieme alla fine. */
export type ProfileForm = {
  /** Foto scelta ora (uri locale + JPEG base64); null = foto invariata. */
  avatar: { uri: string; base64: string } | null;
  bio: string;
  /** [] = non ancora scelto; 'generic' esclude gli altri. */
  userTypes: UserType[];
  userTypePublic: boolean;
  /** [] = non ancora scelto; 'none' esclude gli altri. */
  communities: (Community | 'none')[];
  glucoseMin: string;
  glucoseMax: string;
};

export function initialForm(profile: Profile | null | undefined): ProfileForm {
  if (!profile?.onboarding_completed_at) {
    return { avatar: null, bio: '', userTypes: [], userTypePublic: true, communities: [], glucoseMin: '', glucoseMax: '' };
  }
  const userTypes: UserType[] = [];
  if (profile.is_diabetic) userTypes.push('diabetic');
  if (profile.is_celiac) userTypes.push('celiac');
  return {
    avatar: null,
    bio: profile.bio ?? '',
    userTypes: userTypes.length ? userTypes : ['generic'],
    userTypePublic: profile.user_type_public,
    communities: profile.communities.length ? profile.communities : ['none'],
    glucoseMin: profile.glucose_min_mg_dl?.toString() ?? '',
    glucoseMax: profile.glucose_max_mg_dl?.toString() ?? '',
  };
}

/** Selezione multipla dove `exclusive` ("Generico", "Nessuna") esclude tutte le altre voci. */
export function toggleChoice<T>(selected: T[], value: T, exclusive: T): T[] {
  if (value === exclusive) return selected.includes(value) ? [] : [value];
  const rest = selected.filter((v) => v !== exclusive);
  return rest.includes(value) ? rest.filter((v) => v !== value) : [...rest, value];
}

export function toInput(form: ProfileForm): ProfileInput {
  const isDiabetic = form.userTypes.includes('diabetic');
  return {
    bio: form.bio.trim() || null,
    is_diabetic: isDiabetic,
    is_celiac: form.userTypes.includes('celiac'),
    user_type_public: form.userTypePublic,
    communities: form.communities.filter((c): c is Community => c !== 'none'),
    ...(isDiabetic && { glucose_min_mg_dl: Number(form.glucoseMin), glucose_max_mg_dl: Number(form.glucoseMax) }),
    ...(form.avatar && { avatar_base64: form.avatar.base64 }),
  };
}

export const ProfileFormContext = createContext<{
  form: ProfileForm;
  update: (patch: Partial<ProfileForm>) => void;
}>({ form: initialForm(null), update: () => {} });

export const useProfileForm = () => useContext(ProfileFormContext);

const saveErrors: Record<string, string> = {
  nickname_taken: 'profileSetup.errors.nicknameTaken',
  registration_incomplete: 'profileSetup.errors.registrationIncomplete',
  invalid_glucose_range: 'profileSetup.errors.glucoseRange',
  avatar_too_large: 'profileSetup.errors.avatarTooLarge',
};

/** Salva il form con save-profile e aggiorna il profilo del layout radice. */
export function useSaveProfile() {
  const { form } = useProfileForm();
  const { setProfile } = useProfile();
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      setProfile(await saveProfile(toInput(form)));
    } catch (e) {
      const code = e instanceof ApiError ? e.code : undefined;
      Alert.alert(t('profileSetup.errors.title'), t((code && saveErrors[code]) || 'authErrors.generic'));
    } finally {
      setSaving(false);
    }
  }

  return { save, saving };
}
