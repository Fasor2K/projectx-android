---
name: implement-design-section
description: Implementa una sezione dell'app Foodity (es. Diario, Home, Profilo, Crea ricetta) partendo dal design su Claude Design, sia front-end (projectx-android, Expo) sia back-end (projectx-be, Supabase), con tutti i flussi dei prototipi. Usala quando l'utente chiede di implementare una sezione, una schermata o un flusso "dal design", "dal prototipo" o con un link claude.ai/artifact del design.
---

# Implementare una sezione dal design

Input: il link del canvas di design (di default https://claude.ai/artifact/2YEon9fcwUMhZTeEBRGK9n, "ProjectX – App senza suggerimento insulina") e il nome della sezione. Output: sezione funzionante su Android e iOS, endpoint e schema se servono, documentazione aggiornata. Prima implementazione fatta così: il Diario (7 novembre 2026).

## 1. Leggere il design

1. `Artifact` `read` del canvas, poi `read` di `project/canvas.json` e riassumilo con uno script (titolo, `pages`, `boards` con `title`/`page`, `notes`). Le pagine `dia`, `gen`, `cel` ("Prototipo · Diabetico / Generico / Celiaco") hanno le schermate collegate per profilo, a righe per flusso (note `row-*`); la pagina `app` ha le schermate originali e le note di regola (es. "Visibili solo per diabetici"); `comp` i componenti.
2. Leggi con `read` + `paths` tutte le artboard `p-<profilo>-*` della sezione **e** quelle che vi entrano o escono (link da altre sezioni, sheet, popover, menu "+"), per ogni profilo: le differenze tra profili sono requisiti.
3. Estrai testi, livelli e link dei prototipi con lo script della skill, non leggendo l'HTML (è pieno di SVG):
   `python3 -I <skill>/scripts/outline.py --text <cartella>/project/p-dia-*.dc.html`
   Gli `<a HREF=…>` sono i flussi: ogni link è una navigazione da implementare (push, sheet, chiusura).
4. Fai un elenco: schermate, stati (vuoto, errore, caricamento), differenze per tipo di utente, dati mostrati, azioni e destinazione di ogni link.

## 2. Confrontare con ciò che esiste

- App: `projectx-android/UI.md` (componenti, navigazione, "Stato attuale"), `AGENTS.md`, `src/components`, `src/lib`, `src/app`. Backend: `projectx-be/DATABASE.md` (spesso lo schema della sezione c'è già, comprese le regole in "Funzioni senza tabelle dedicate") ed `ENDPOINTS.md`.
- **Regola di coerenza:** se il design è diverso da un componente già implementato nell'app, vince il componente già implementato (vedi UI.md, "Implementare dal design"). Il design decide contenuti, flussi e disposizione; lo stile lo decidono i componenti esistenti. Estrai un componente condiviso quando una schermata nuova ripete un pezzo di UI esistente.
- I link verso schermate che non esistono ancora vanno collegati a ciò che c'è, o omessi, e annotati in UI.md "Stato attuale".

## 3. Chiedere i dubbi, una volta sola

Con `AskUserQuestion` (al massimo 4 domande, opzione consigliata per prima) chiedi solo ciò che cambia cosa costruire, tipicamente:
- punti d'ingresso di un flusso quando la schermata d'origine non esiste ancora;
- integrazioni native (salute, notifiche, fotocamera…) che richiedono un development build;
- formati, limiti o regole non scritte né nel design né in DATABASE.md;
- modifiche di schema (sempre da approvare, procedura in DATABASE.md).
Il resto lo decidi tu con default ragionevoli e lo dichiari nel riepilogo.

## 4. Backend (projectx-be)

- Branch `feat/<sezione>` in entrambe le repo prima di scrivere.
- Segui la skill `supabase-endpoint` per ogni endpoint (codice + sezione in ENDPOINTS.md) e la procedura di DATABASE.md per lo schema. Scritture su più tabelle e regole con fuso orario dell'utente: funzioni SQL in una nuova migrazione, `revoke` da `public, anon, authenticated` e `grant` a `service_role`; errori di regola come `raise exception '<codice>'` mappati a 4xx dall'endpoint.
- Helper comuni a più endpoint della sezione in `supabase/functions/_shared/<sezione>.ts`.
- Verifica senza CLI installati: `npx -y deno@2 check <funzioni>/index.ts` e un piccolo script con asserzioni per i validatori (`npx -y deno@2 run`). L'SQL non si può eseguire in locale: rileggilo e dillo nel riepilogo.

## 5. App (projectx-android)

- Prima della UI leggi UI.md e, per API Expo, le docs della versione in `package.json` (AGENTS.md). Dipendenze con `npx expo install`; preferisci moduli Expo inclusi in Expo Go.
- Una route per schermata in `src/app/`; sheet come `formSheet` registrati nel layout radice; nuovi tab con il `NativeTabs.Trigger` (`sf` + `md`). Dopo aver aggiunto route, rigenera i tipi delle route con `CI=1 timeout 60 npx expo start --port 8099` prima di `tsc`.
- Chiamate in `src/lib/<sezione>.ts` con `invoke` di `@/lib/profile`; tipi dei body come in ENDPOINTS.md.
- Ogni testo con `t()`: chiavi in `src/locales/en.ts` e `it.ts`, gruppo `<sezione>.*`; i testi italiani del design sono la fonte per `it.ts`.
- Differenze per tipo di utente con `useProfile()` (`is_diabetic`…), come nel design.
- Accessibilità: ruoli, etichette sui pulsanti a icona, target ≥ 44 pt.
- `npx tsc --noEmit` e `npx expo lint` puliti.

## 6. Documentazione e chiusura

- Aggiorna nella stessa modifica: DATABASE.md (funzioni SQL, regole, decisioni con data), ENDPOINTS.md, UI.md (navigazione, componenti, Stato attuale), AGENTS.md o CLAUDE.md se cambiano comandi o processo.
- Niente commit, push o deploy senza richiesta: il merge su `main` del backend va in produzione.
- Riepilogo: cosa c'è, scelte fatte da te, parti del design rimandate, cosa non è stato verificato (es. SQL non eseguito, nessuna prova su dispositivo).
