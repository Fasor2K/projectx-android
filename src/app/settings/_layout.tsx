import { Stack } from 'expo-router';
import { useState } from 'react';

import { NotificationsContext, type Notifications } from '@/lib/notifications';

/** Impostazioni e sottoschermate; le notifiche le carica Impostazioni e le condividono tutte. */
export default function SettingsLayout() {
  const [notifications, setNotifications] = useState<Notifications>();

  return (
    <NotificationsContext.Provider value={{ notifications, setNotifications }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="reminder-time"
          options={{ presentation: 'formSheet', sheetAllowedDetents: 'fitToContents', sheetGrabberVisible: true }}
        />
      </Stack>
    </NotificationsContext.Provider>
  );
}
