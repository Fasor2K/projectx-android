import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';

import { en } from '@/locales/en';
import { it } from '@/locales/it';

/** Etichette dell'app nella lingua del dispositivo (italiano o inglese, fallback inglese). */
export const i18n = new I18n({ en, it });

i18n.defaultLocale = 'en';
i18n.enableFallback = true;
// shortcut: lingua letta all'avvio; su Android un cambio lingua con l'app aperta vale dal riavvio successivo (iOS riavvia l'app da sé).
i18n.locale = getLocales()[0]?.languageCode ?? 'en';

export const t = i18n.t.bind(i18n);
