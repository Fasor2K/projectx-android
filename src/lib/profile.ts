import { createContext, useContext } from 'react';

import { supabase } from '@/lib/supabase';

export type Community = 'diabetes' | 'celiac';

/** Profilo restituito da get-profile e save-profile (vedi ENDPOINTS.md). */
export type Profile = {
  id: string;
  nickname: string;
  avatar_url: string | null;
  bio: string | null;
  is_diabetic: boolean;
  is_celiac: boolean;
  user_type_public: boolean;
  onboarding_completed_at: string | null;
  communities: Community[];
  glucose_min_mg_dl: number | null;
  glucose_max_mg_dl: number | null;
};

export type ProfileInput = {
  bio: string | null;
  is_diabetic: boolean;
  is_celiac: boolean;
  user_type_public: boolean;
  communities: Community[];
  glucose_min_mg_dl?: number;
  glucose_max_mg_dl?: number;
  /** JPEG in base64; assente = foto invariata. */
  avatar_base64?: string;
};

/** Errore di un endpoint: `code` è quello del body `{ error: { code } }`, undefined se la rete non ha risposto. */
export class ApiError extends Error {
  constructor(readonly code: string | undefined) {
    super(code ?? 'network_error');
  }
}

async function call(name: string, options: Parameters<typeof supabase.functions.invoke>[1]) {
  const { data, error } = await supabase.functions.invoke<{ profile: Profile | null }>(name, options);
  if (error) {
    const body = await error.context?.json?.().catch(() => undefined);
    throw new ApiError(body?.error?.code);
  }
  return data!.profile;
}

export const fetchProfile = () => call('get-profile', { method: 'GET' });
export const saveProfile = (input: ProfileInput) => call('save-profile', { method: 'POST', body: input });

/**
 * Profilo dell'utente loggato, letto dal layout radice.
 * undefined = in caricamento, null = registrazione da completare.
 */
export const ProfileContext = createContext<{
  profile: Profile | null | undefined;
  setProfile: (profile: Profile | null) => void;
}>({ profile: undefined, setProfile: () => {} });

export const useProfile = () => useContext(ProfileContext);
