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

export async function invoke<T>(name: string, options: Parameters<typeof supabase.functions.invoke>[1]) {
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
/** get-my-recipes: ricette dell'utente per la griglia del Profilo, bozze e private comprese. */
export type MyRecipe = {
  id: string;
  /** null solo nelle bozze. */
  title: string | null;
  cover_image_url: string | null;
  is_draft: boolean;
  is_private: boolean;
};

export const fetchMyRecipes = async () =>
  (await invoke<{ recipes: MyRecipe[] }>('get-my-recipes', { method: 'GET' })).recipes;
/** get-saved-recipes: ricette salvate ancora visibili, dalla più recente, nella forma della griglia del Profilo. */
export const fetchSavedRecipes = async (): Promise<MyRecipe[]> =>
  (await invoke<{ recipes: { id: string; title: string; cover_image_url: string | null }[] }>('get-saved-recipes', { method: 'GET' })).recipes.map(
    (r) => ({ id: r.id, title: r.title, cover_image_url: r.cover_image_url, is_draft: false, is_private: false }),
  );
/** get-my-posts: post dell'utente per la sezione "Post" del Profilo. community null = Generale. */
export type MyPost = {
  id: string;
  body: string;
  image_url: string | null;
  community: Community | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  liked: boolean;
};

export const fetchMyPosts = async () => (await invoke<{ posts: MyPost[] }>('get-my-posts', { method: 'GET' })).posts;
export const deletePost = (id: string) => invoke<{ deleted: true }>('edit-post', { method: 'POST', body: { id, delete: true } });

type LikeResult = { liked: boolean; likes_count: number };
export const likePost = (postId: string, like: boolean) =>
  invoke<LikeResult>('like-post', { method: 'POST', body: { post_id: postId, like } });

/** get-post-comments: commento di un post, dal più recente. liked = Mi piace dell'utente. */
export type PostComment = {
  id: string;
  body: string;
  created_at: string;
  likes_count: number;
  author: { id: string; nickname: string; avatar_url: string | null };
  liked: boolean;
};

export const fetchPostComments = async (postId: string) =>
  (await invoke<{ comments: PostComment[] }>(`get-post-comments?${new URLSearchParams({ post_id: postId })}`, { method: 'GET' }))
    .comments;
export const addPostComment = (postId: string, body: string) =>
  invoke<{ id: string; comments_count: number }>('create-post-comment', { method: 'POST', body: { post_id: postId, body } });
export const likePostComment = (commentId: string, like: boolean) =>
  invoke<LikeResult>('like-post-comment', { method: 'POST', body: { comment_id: commentId, like } });
export const fetchProfileStats = async () =>
  (await invoke<{ stats: ProfileStats }>('get-profile-stats', { method: 'GET' })).stats;
export const updateNickname = async (nickname: string) =>
  (await invoke<ProfileBody>('update-nickname', { method: 'POST', body: { nickname } })).profile;
export const deleteAccount = () => invoke<{ deleted: true }>('delete-account', { method: 'POST' });

/**
 * Profilo dell'utente loggato, letto dal layout radice.
 * undefined = in caricamento, null = registrazione da completare.
 */
export const ProfileContext = createContext<{
  profile: Profile | null | undefined;
  setProfile: (profile: Profile | null) => void;
}>({ profile: undefined, setProfile: () => {} });

export const useProfile = () => useContext(ProfileContext);
