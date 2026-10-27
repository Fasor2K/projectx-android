# UI — linee guida

L'app è **una sola codebase React Native (Expo) per Android e iOS**, nonostante il nome della repo. L'obiettivo è che ogni piattaforma sembri nativa: su iOS lo stile di SwiftUI con Liquid Glass (iOS 26+), su Android lo stile di sistema.

Le API Expo cambiano a ogni SDK: prima di toccare uno dei componenti sotto, leggi le docs della versione in `package.json` (vedi AGENTS.md).

## Regola base: prima il componente di sistema

Per ogni elemento di UI scegli la prima opzione che funziona:

1. **Componente di sistema** (navigazione, tab bar, header, sheet, menu): il glass su iOS 26 arriva gratis e il fallback lo gestisce il sistema.
2. **`GlassSurface`** ([src/components/glass-surface.tsx](src/components/glass-surface.tsx)) per superfici custom che devono essere "vetro": barre e pulsanti flottanti, card sopra contenuti.
3. **`@expo/ui` (SwiftUI)**: solo per un controllo SwiftUI specifico che non ha equivalente nei punti 1–2. Non è ancora installato: aggiungilo con `npx expo install @expo/ui` quando serve davvero, e prevedi sempre la variante Android.

Non replicare il glass a mano (blur, gradienti, `opacity`): non è Liquid Glass e invecchia male.

## Navigazione

- Il layout radice [src/app/_layout.tsx](src/app/_layout.tsx) è uno `Stack` che legge la sessione di Supabase Auth e, da loggato, il profilo (`get-profile`, esposto con `useProfile()` di `@/lib/profile`). Con `Stack.Protected` mostra `login`/`register` a chi non è loggato, `profile-setup` a chi è loggato e il gruppo `(tabs)` solo a chi ha completato l'onboarding (`onboarding_completed_at`). L'ordine degli screen conta: chi non ha completato il profilo atterra sul primo disponibile, `profile-setup`. `auth-callback` riceve il link di conferma email (`foodity://auth-callback`).
- `profile-setup/` ("Completa il tuo profilo" → "Range glicemico", solo per i diabetici) è sia l'onboarding sia la modifica del profilo dalle Impostazioni: il form è condiviso tra le due schermate (`@/lib/profile-form`), precompilato dal profilo e salvato tutto insieme alla fine con `save-profile`. Finito l'onboarding il layout reindirizza alla Home; aprendolo dalle Impostazioni, chi lo apre gestisce l'uscita dopo il salvataggio.
- I tab sono **native tabs** (`expo-router/native-tabs`, stabile da SDK 58), layout in [src/app/(tabs)/_layout.tsx](src/app/(tabs)/_layout.tsx).
- Ogni tab è un file in `src/app/(tabs)/` più un `NativeTabs.Trigger` con lo stesso `name` nel layout: i trigger non si aggiungono da soli.
- Icone: `sf` (SF Symbol, iOS) **e** `md` (Material Symbol, Android, via `expo-symbols`) su ogni trigger.
- Massimo 5 tab (limite Android). I tab non si aggiungono/rimuovono a runtime.
- Il layout è avvolto in `ThemeProvider` per evitare il flash bianco al cambio tab su iOS 26: non rimuoverlo.
- Su iOS 26 `backgroundColor`, `blurEffect`, `shadowColor` della tab bar non hanno effetto (è Liquid Glass). Su iOS ≤ 18 la barra diventa trasparente al bordo di scroll: metti lo `ScrollView` come primo figlio dello screen, oppure usa `disableTransparentOnScrollEdge`.
- Su Android lo screen ha solo l'inset inferiore: gli altri inset (status bar) sono a carico dello screen.

## `GlassSurface`

Usa `GlassView` di `expo-glass-effect` solo se tutte queste condizioni sono vere, altrimenti rende una `View` con sfondo pieno (`styles.fallback`):

| Condizione | Perché |
|---|---|
| `Platform.OS === 'ios'` | Liquid Glass esiste solo su iOS |
| `isGlassEffectAPIAvailable()` | alcune beta di iOS 26 non hanno l'API e crashano |
| `isLiquidGlassAvailable()` | iOS ≥ 26, compilato con Xcode 26, niente `UIDesignRequiresCompatibility` |
| "Riduci trasparenza" spento | accessibilità; ascoltato a runtime |

Regole d'uso:

- Dai sempre `borderRadius` e padding tramite `style`: valgono per entrambe le varianti, e il layout non deve dipendere dal glass.
- Il testo sopra deve restare leggibile anche sul fallback e con aspetto chiaro/tinted.
- Non mettere `opacity < 1` sulla superficie o sui suoi genitori: il glass smette di renderizzarsi. Per una dissolvenza anima l'opacità di un wrapper e porta `glassEffectStyle` a `'none'`.
- `interactive` su `GlassView` si legge solo al mount: il componente rimonta la view (via `key`) quando cambia.
- Più superfici vicine che devono fondersi: avvolgile in `GlassContainer` di `expo-glass-effect`.
- Il colore del fallback è `colors.glassFallback` in [src/theme.ts](src/theme.ts).

## Tema e componenti di base

- Colori, gradiente di sfondo, raggi, spaziature, testi e ombra stanno in [src/theme.ts](src/theme.ts): non scrivere colori o misure a mano nelle schermate, aggiungi il token lì.
- Componenti generici in `src/components/`:
  - `Screen`: sfondo a gradiente, safe area, scroll che segue la tastiera.
  - `Card`: contenitore bianco con bordo e ombra.
  - `TextField`: etichetta, icona, unità (`suffix`), nota sotto, `secure` per le password con il toggle mostra/nascondi.
  - `Button`: pulsante primario con icona e stato `loading`.
  - `BackButton`: "indietro" flottante in `GlassSurface`, per le schermate senza header.
  - `SectionHeader`: intestazione delle `Card` (icona, titolo, sottotitolo).
  - `ChoiceButton`: opzione di una scelta singola o multipla; per le scelte con voce esclusiva ("Generico", "Nessuna") usa `toggleChoice` di `@/lib/profile-form`.
  - `Icon`: `sf` (iOS) **e** `md` (Android) come per i tab.

## Verifica di una modifica UI

- `npx tsc --noEmit` e `npx expo lint`.
- Prova su: iOS 26+ (glass), iOS 26+ con Impostazioni → Accessibilità → Display → Riduci trasparenza (fallback), un iOS < 26 o Android (fallback).
- Expo Go basta per `expo-glass-effect`; con librerie native non incluse in Expo Go (es. `@expo/ui`) serve un development build.

## Stato attuale

- `userInterfaceStyle` in `app.json` è `light`: l'app non segue ancora il tema scuro. Se si attiva il dark mode, aggiornare anche il `ThemeProvider` (`DarkTheme`) e il colore del fallback.
- L'unico tab è `index` (Home, segnaposto).
- La registrazione non controlla che il nickname sia libero: se è già preso, `save-profile` risponde `nickname_taken` alla fine dell'onboarding e l'app non offre ancora un modo per cambiarlo.
- Accesso solo con email: il login col nickname richiede un endpoint che traduca nickname → email. "Password dimenticata?" e i link a Termini/Privacy non sono ancora collegati.
