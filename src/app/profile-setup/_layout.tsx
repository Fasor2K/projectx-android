import { Redirect, Stack } from 'expo-router';
import { useState } from 'react';

import { useProfile } from '@/lib/profile';
import { initialForm, ProfileFormContext, type ProfileForm } from '@/lib/profile-form';

/**
 * "Completa il tuo profilo" e "Range glicemico": onboarding dopo la registrazione,
 * riapribile dalle Impostazioni per modificare il profilo (form precompilato).
 */
export default function ProfileSetupLayout() {
  const { profile } = useProfile();
  const [onboarding] = useState(!profile?.onboarding_completed_at);
  const [form, setForm] = useState<ProfileForm>(() => initialForm(profile));

  // Onboarding finito: si entra nell'app. In modifica dalle Impostazioni la navigazione resta a chi l'ha aperta.
  if (onboarding && profile?.onboarding_completed_at) return <Redirect href="/" />;

  return (
    <ProfileFormContext.Provider
      value={{ form, update: (patch) => setForm((f) => ({ ...f, ...patch })), editing: !onboarding }}>
      <Stack screenOptions={{ headerShown: false }} />
    </ProfileFormContext.Provider>
  );
}
