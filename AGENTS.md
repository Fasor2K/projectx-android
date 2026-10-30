This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

Despite the repo name, this single codebase ships **both Android and iOS**. Every change must work on both platforms.

## Repos and shared docs

This is the Foodity app. The backend is the sibling repo `projectx-be` (Supabase project `ddualzqusbgasmjlyebb`, GitHub `Fasor2K/projectx-be`); the two are independent git repos, usually side by side in a `projectx` folder that is not a repo. Backend rules, deploy and process are in `../projectx-be/CLAUDE.md`; database schema in `../projectx-be/DATABASE.md`; endpoints in `../projectx-be/ENDPOINTS.md` (if an endpoint is not there, it is not documented). Never change the schema or deploy from here: follow `projectx-be/CLAUDE.md`.

The project's `.md` files (in both repos) are the shared memory: keep them aligned with the work **without the user having to ask**, in the same change, before declaring the work done, when:

- a change makes what they say false or incomplete (schema, endpoints, components, commands, flows, folder structure);
- the user gives a new guideline, rule or decision to follow in future (or corrects how you work): write it in the right file, not only in the reply.

Where things go:

- App rules (code, i18n, navigation, commands) → this file
- UI and style rules → `UI.md`
- Schema, enums, constraints, application rules and decisions (dated) → `projectx-be/DATABASE.md`
- Endpoint contract, logic and history → `projectx-be/ENDPOINTS.md`
- Backend deploy and work process → `projectx-be/CLAUDE.md`
- Rules for both repos → this file **and** `projectx-be/CLAUDE.md`, with the same content (there is no longer a shared file outside the repos)

Keep the files concise: edit or replace the existing rule instead of adding a duplicate or contradictory one, and remove what is no longer true. Don't document what the code already tells. If it's unclear which file a rule belongs in, pick the one closest to its scope and say so in the summary.

Project skills in `.claude/skills/`: `commit` and `commit-and-push` commit (and push) this repo's changes; `projectx-be` has skills with the same names for its repo, plus `supabase-endpoint`.

## UI guidelines

Before building or changing any UI, read @UI.md: native look on each platform (Liquid Glass on iOS 26+ via native tabs and `GlassSurface`, with fallbacks for Android, older iOS and Reduce Transparency).

## Translations (i18n)

Every user-visible label (text, placeholders, alerts, accessibility labels, tab titles) must go through `t()` from `@/lib/i18n` — never hardcode strings. The app follows the device language: Italian or English, falling back to English.

- Add each new key to both `src/locales/en.ts` (reference) and `src/locales/it.ts`; `it.ts` is typed as `typeof en`, so a missing key fails `tsc`.
- Group keys by screen/component (`login.*`, `register.*`, …); interpolate with `%{name}`: `t('register.passwordPlaceholder', { min: 8 })`.
- Brand names (Foodity) are not translated.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Backend calls

Tables in `public` have RLS with no policies, so `supabase.from()` reads nothing: the app talks to the backend only through Edge Functions (`supabase.functions.invoke`), documented in `projectx-be/ENDPOINTS.md`. Error bodies are `{ error: { code } }`; see `ApiError` in `src/lib/profile.ts`.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
