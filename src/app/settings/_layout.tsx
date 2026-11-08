import { Stack } from 'expo-router';
import { useState } from 'react';

import { NotificationsContext, type Notifications } from '@/lib/notifications';
import { colors } from '@/theme';

/** Impostazioni e sottoschermate; le notifiche le carica Impostazioni e le condividono tutte. */
export default function SettingsLayout() {
  const [notifications, setNotifications] = useState<Notifications>();

  return (
    <NotificationsContext.Provider value={{ notifications, setNotifications }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="reminder-time"
          options={{ presentation: 'formSheet', contentStyle: { backgroundColor: colors.sheetBackground }, sheetAllowedDetents: 'fitToContents', sheetGrabberVisible: true }}
        />
      </Stack>
    </NotificationsContext.Provider>
  );
}
