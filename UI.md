# UI — linee guida

L'app è **una sola codebase React Native (Expo) per Android e iOS**, nonostante il nome della repo. L'obiettivo è che ogni piattaforma sembri nativa: su iOS lo stile di SwiftUI con Liquid Glass (iOS 26+), su Android lo stile di sistema.

Le API Expo cambiano a ogni SDK: prima di toccare uno dei componenti sotto, leggi le docs della versione in `package.json` (vedi AGENTS.md).

## Implementare dal design

Il design delle schermate è il canvas Claude Design "ProjectX – App senza suggerimento insulina" (https://claude.ai/artifact/2YEon9fcwUMhZTeEBRGK9n): le pagine "Prototipo · Diabetico / Generico / Celiaco" collegano le schermate e mostrano i flussi. Quando un elemento del design è diverso da un componente già implementato nell'app (stile di card, segmenti, pulsanti, campi, header), **vince il componente già implementato**: si riusa quello, e il design vale per contenuti, flussi e disposizione. Le parti del design che dipendono da schermate non ancora implementate si collegano a ciò che c'è e si annotano in "Stato attuale".

## Regola base: prima il componente di sistema

Per ogni elemento di UI scegli la prima opzione che funziona:

1. **Componente di sistema** (navigazione, tab bar, header, sheet, menu): il glass su iOS 26 arriva gratis e il fallback lo gestisce il sistema. Eccezione: i `formSheet` hanno `contentStyle: { backgroundColor: colors.sheetBackground }` (grigio chiaro quasi opaco, come gli sheet raggruppati di iOS), perché il vetro da solo è troppo scuro e trasparente per leggere; le `Card` bianche restano visibili sopra.
2. **`GlassSurface`** ([src/components/glass-surface.tsx](src/components/glass-surface.tsx)) per superfici custom che devono essere "vetro": barre e pulsanti flottanti, card sopra contenuti.
3. **`@expo/ui` (SwiftUI)**: solo per un controllo SwiftUI specifico che non ha equivalente nei punti 1–2. Non è ancora installato: aggiungilo con `npx expo install @expo/ui` quando serve davvero, e prevedi sempre la variante Android.

Non replicare il glass a mano (blur, gradienti, `opacity`): non è Liquid Glass e invecchia male.

## Navigazione

- Il layout radice [src/app/_layout.tsx](src/app/_layout.tsx) è uno `Stack` che legge la sessione di Supabase Auth e, da loggato, il profilo (`get-profile`, esposto con `useProfile()` di `@/lib/profile`). Con `Stack.Protected` mostra `login`/`register` a chi non è loggato, `profile-setup` a chi è loggato e il gruppo `(tabs)` solo a chi ha completato l'onboarding (`onboarding_completed_at`). Ogni `Stack.Protected` ha un `redirectTo` esplicito: senza, expo-router ripiega sul primo screen non protetto nel suo ordine (non quello del layout), ad esempio `auth-callback`, che rimanda a `/` e crea un loop. `auth-callback` riceve il link di conferma email (`foodity://auth-callback`).
- `profile-setup/` ("Completa il tuo profilo" → "Range glicemico", solo per i diabetici) è sia l'onboarding sia la modifica del profilo dalle Impostazioni: il form è condiviso tra le due schermate (`@/lib/profile-form`), precompilato dal profilo e salvato tutto insieme alla fine con `save-profile`. Finito l'onboarding il layout reindirizza alla Home. Aperto dalle Impostazioni è in modifica (`editing` nel contesto del form): titolo "Modifica il tuo profilo", pulsante indietro, e dopo il salvataggio torna alle Impostazioni.
- `settings/` (Impostazioni, Il tuo account, Promemoria glicemici, FAQ) sta nello stesso `Stack.Protected` dei tab e si apre dall'ingranaggio del Profilo. Il layout tiene le notifiche (`get-notification-settings`) in un contesto condiviso; gli interruttori salvano a ogni tocco e tornano indietro se il salvataggio fallisce. "Modifica orario" è un `formSheet` (`reminder-time`) con il selettore orario di `@react-native-community/datetimepicker`: ruota inline su iOS, dialog di sistema su Android; l'interruttore senza etichetta a destra del nome del pasto attiva la notifica (acceso di default) e mostra il selettore solo se è acceso. "Il tuo account" mostra l'email della sessione in sola lettura: non si cambia. La password si cambia con Supabase Auth dopo aver verificato quella attuale con un nuovo accesso.
- Cerca (`(tabs)/search`) ha due tab interni nella stessa pagina. **Ricette** (`search-recipes`): testo, filtri e chip Mie ricette, Frequenti, Popolari. **Prodotti** (`search-products`): testo, scansione e chip Frequenti, senza filtri. Senza testo (meno di 2 caratteri) entrambi i tab precaricano i "Recenti" (`recent=true`, alimenti usati di recente nei pasti; le ricette rispettano i filtri) e, se non ce ne sono, i "Risultati suggeriti". Lo sheet `search-filters` è un `formSheet` che tiene i filtri in `SearchFiltersContext` (layout radice). `scanner` è un `fullScreenModal` con `CameraView`; un codice letto apre il `formSheet` `scanned-product` (`get-product-by-barcode`), e alla sua chiusura la scansione riprende.
- Diario (`(tabs)/diary`): settimana corrente, riepilogo e timeline del giorno scelto (`DayView`, `get-diary`, ricaricato a ogni focus); per i diabetici il riepilogo è a schede (giornata e nutrizionale) e il tocco apre `diary-chart` (torta e grafico glicemia con il range del profilo). In alto: Componi pasto (`meal`, giorno e pasto nei parametri), `calendar` (giorno qualsiasi; il "+" dei diabetici apre il `formSheet` `glucose-insulin`) ed `diary-export` (`formSheet`: periodo e formato, file generato nell'app con `@/lib/diary-export` e condiviso col foglio di sistema). Le voci cibo della timeline aprono il dettaglio della ricetta o del prodotto. `meal-item` è il `formSheet` "Aggiungi a pasto" (dai dettagli, con la quantità scelta lì, e dallo scanner; aggiunge al pasto di oggi e apre Componi pasto) e di modifica di una voce (con "Rimuovi"); i valori in anteprima vengono da `get-food-nutrition`.
- Dettagli: `recipe` e `product` (`get-recipe`, `get-product`, ricaricati a ogni focus) si aprono da Cerca, dal Diario e dal prodotto scansionato (che prima chiude scanner e sheet). "Bilancio nutrizionale" con stepper e Grammi / Porzioni; nella ricetta gli ingredienti "Ricetta / Mia porzione" si ricalcolano sulla quantità (`portionFactor` di `@/lib/food`), i popover info del design sono alert di sistema, "Segui" chiama `follow-user`. "Commenti" (ricette) / "Recensioni" (prodotti) e "Segnalazioni" aprono il `formSheet` `feedback` (parametro `kind`; su Android il contenuto è impaginato sul detent più alto, quindi a 0.6 lo sheet rialza il fondo della differenza per tenere visibile il campo; con la tastiera `KeyboardAvoidingView` lì sbaglia e la sovrapposizione si misura a mano), che segue alla lettera la grafica del design "Prodotto · Recensioni" / "· Segnalazioni" (colori in `reviewColors` di `@/theme`), tranne lo sfondo, uguale agli altri sheet: elenco con tempo relativo (`timeAgo` di `@/lib/food`) e campo in fondo con "Invia"; le recensioni hanno le stelle 1–5, le segnalazioni solo il testo. Uno per utente e tipo: il proprio sta in cima con il menu "…" (Modifica lo carica nel campo, Elimina chiede conferma) e il campo si mostra solo se non lo si ha o mentre lo si modifica.
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
  - `Screen`: sfondo a gradiente, scroll che segue la tastiera; il contenuto scorre sotto le safe area (status bar, home indicator). Il padding del contenuto include già gli inset. `back` (o `'close'`) mette il pulsante indietro fisso in alto mentre il contenuto scorre: in ogni schermata con indietro usalo, con `BackButtonSpace` nel contenuto dove il pulsante deve apparire (anche in una riga con il titolo). `footer` tiene fisse in fondo le azioni principali.
  - `Card`: contenitore bianco con bordo e ombra.
  - `TextField`: etichetta, icona, unità (`suffix`), nota sotto, `secure` per le password con il toggle mostra/nascondi.
  - `Button`: pulsante primario con icona e stato `loading`.
  - `BackButton`: "indietro" flottante in `GlassSurface`, per le schermate senza header; dentro `Screen` passa da `back`, non va messo nel contenuto.
  - `SectionHeader`: intestazione delle `Card` (icona, titolo, sottotitolo).
  - `SwitchRow`: titolo, descrizione e `Switch` di sistema.
  - `ChoiceButton`: opzione di una scelta singola o multipla; per le scelte con voce esclusiva ("Generico", "Nessuna") usa `toggleChoice` di `@/lib/profile-form`.
  - `ProductCard`, `RecipeCard` (`food-card.tsx`): riga di un risultato di ricerca; valori sempre per 100 g, e la ricetta con ingrediente guida lo indica ("per 100 g di Ceci").
  - `Icon`: `sf` (iOS) **e** `md` (Android) come per i tab.
  - `QuantityField`: stepper e Grammi / Porzioni (Aggiungi a pasto, dettagli). Dettagli (`food-detail.tsx`): `DetailScreen` (caricamento ed errore), `DetailLayout` (indietro fisso e CTA principale, "Aggiungi a pasto", fissa in fondo via `footer`), `useFocusData`, `Cover`, `Rating`, `InfoButton`, `Pill`, `PortionNutrition` (`NutritionSummary` con stepper), `FeedbackLinks`. `NutritionSummary` accetta un `accessory` accanto al titolo e contenuto extra in fondo.
  - `SegmentedControl`: scelta a pillola tra poche opzioni (sezioni del Profilo, pasti, unità, formati). `Macros` (`food-card.tsx`): etichette colorate dei valori nutrizionali.
  - `DateTimeField`: etichetta e data o orario; selettore compatto su iOS, dialog di sistema su Android.
  - Diario: `DiaryEntryRow`/`Row`/`Thumbnail` (`diary-entry.tsx`, righe della timeline e delle voci di un pasto), `NutritionSummary`, `DaySummary`, `GlucoseChart` (`diary-summary.tsx`, disegnati con `react-native-svg`), `DayView`, `GlucoseInsulinFields`.

## Verifica di una modifica UI

- `npx tsc --noEmit` e `npx expo lint`.
- Prova su: iOS 26+ (glass), iOS 26+ con Impostazioni → Accessibilità → Display → Riduci trasparenza (fallback), un iOS < 26 o Android (fallback).
- Expo Go basta per `expo-glass-effect`; con librerie native non incluse in Expo Go (es. `@expo/ui`) serve un development build.

## Stato attuale

- `userInterfaceStyle` in `app.json` è `light`: l'app non segue ancora il tema scuro. Se si attiva il dark mode, aggiornare anche il `ThemeProvider` (`DarkTheme`) e il colore del fallback.
- Tab: `index` (Home, segnaposto), `search` (Cerca), `diary` (Diario) e `profile` (Profilo). Nel Profilo i contatori vengono da `get-profile-stats`, ricaricati a ogni focus; "Le mie ricette", "Ricette salvate" e "Post" mostrano solo l'empty state, e l'ingranaggio apre le Impostazioni. Manca ancora il pulsante "+" (Nuova ricetta, Nuovo post). In Cerca tutti i chip tranne "Popolari" danno 0 risultati.
- Dettaglio ricetta: il nome dell'autore non apre il Profilo pubblico (non esiste ancora); mancano il salvataggio (segnalibro), la modifica delle proprie ricette e il "+" del design. Il dettaglio ricetta non mostra zuccheri e saturi (le ricette non li hanno). Commenti, recensioni e segnalazioni mostrano i 100 più recenti, senza paginazione; Nella sheet `feedback` le card non hanno sfondo (come nel design) e la tastiera è gestita con `KeyboardAvoidingView`: da provare su dispositivo.
- Diario: le attività si mostrano se ci sono, ma l'import da Apple Health e Google Fit non esiste ancora. Il riepilogo non mostra zuccheri e saturi del design ("3g zuccheri"): `meal_items` non li ha.
- Componi pasto segue il design (lista, card con pasto, totali, glicemia/insulina e conferma; vuoto solo testo) con queste differenze: il pulsante di conferma c'è anche per i diabetici (nel prototipo manca); la card di riepilogo e conferma è fissa in fondo (`footer` di `Screen`, sopra la tastiera su iOS) mentre la lista scorre; "Modifica orario" della glicemia apre il `formSheet` `meal-time` su iOS (come nel design) e il dialog di sistema su Android; glicemia e insulina partono vuote a ogni composizione; l'orario della dose d'insulina non si mostra (è l'ora di apertura); Grammi / Porzioni e stepper usano `QuantityField` così com'è.
- La registrazione non controlla che il nickname sia libero: se è già preso, `save-profile` risponde `nickname_taken` alla fine dell'onboarding, e il nickname si può cambiare solo dalle Impostazioni, che però si raggiungono dopo l'onboarding.
- Le preferenze di notifica e i promemoria glicemici si salvano, ma l'invio delle notifiche non esiste ancora. Termini, Privacy e FAQ sono segnaposto.
- "Password dimenticata?" non è ancora collegato.
