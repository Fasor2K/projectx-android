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

/** Contatori della pagina Profilo (get-profile-stats). rating_avg null = "Nessuna". */
export type ProfileStats = {
  recipes_count: number;
  rating_avg: number | null;
  followers_count: number;
};

async function invoke<T>(name: string, options: Parameters<typeof supabase.functions.invoke>[1]) {
  const { data, error } = await supabase.functions.invoke<T>(name, options);
  if (error) {
    const body = await error.context?.json?.().catch(() => undefined);
    throw new ApiError(body?.error?.code);
  }
  return data!;
}

type ProfileBody = { profile: Profile | null };

export const fetchProfile = async () => (await invoke<ProfileBody>('get-profile', { method: 'GET' })).profile;
export const saveProfile = async (input: ProfileInput) =>
  (await invoke<ProfileBody>('save-profile', { method: 'POST', body: input })).profile;
export const fetchProfileStats = async () =>
  (await invoke<{ stats: ProfileStats }>('get-profile-stats', { method: 'GET' })).stats;

/**
 * Profilo dell'utente loggato, letto dal layout radice.
 * undefined = in caricamento, null = registrazione da completare.
 */
export const ProfileContext = createContext<{
  profile: Profile | null | undefined;
  setProfile: (profile: Profile | null) => void;
}>({ profile: undefined, setProfile: () => {} });

export const useProfile = () => useContext(ProfileContext);
