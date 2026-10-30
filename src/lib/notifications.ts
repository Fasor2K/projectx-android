import { createContext, useContext } from 'react';

import { invoke } from '@/lib/profile';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/** Interruttori di user_notification_settings (vedi ENDPOINTS.md, get-notification-settings). */
export type NotificationSettings = {
  recipe_feedback: boolean;
  post_comments: boolean;
  app_updates: boolean;
  glucose_reminders: boolean;
};

/** time_of_day = "HH:MM", ora locale. */
export type GlucoseReminder = { meal_type: MealType; time_of_day: string; enabled: boolean };

export type Notifications = { settings: NotificationSettings; glucose_reminders: GlucoseReminder[] };

export const fetchNotifications = () => invoke<Notifications>('get-notification-settings', { method: 'GET' });
export const saveNotificationSettings = (changes: Partial<NotificationSettings>) =>
  invoke<Notifications>('save-notification-settings', { method: 'POST', body: changes });
export const saveGlucoseReminder = async (reminder: GlucoseReminder) =>
  (await invoke<{ glucose_reminder: GlucoseReminder }>('save-glucose-reminder', { method: 'POST', body: reminder }))
    .glucose_reminder;

/** Orario proposto nel selettore per i pasti senza promemoria. */
export const defaultReminderTime: Record<MealType, string> = {
  breakfast: '08:00',
  lunch: '13:00',
  dinner: '20:00',
  snack: '16:00',
};

/** Notifiche lette dal layout di settings, condivise da Impostazioni, Promemoria glicemici e Modifica orario. */
export const NotificationsContext = createContext<{
  notifications: Notifications | undefined;
  setNotifications: (next: Notifications) => void;
}>({ notifications: undefined, setNotifications: () => {} });

export const useNotifications = () => useContext(NotificationsContext);
