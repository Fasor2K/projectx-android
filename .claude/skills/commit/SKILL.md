---
name: commit
description: Analizza le modifiche non committate della repo projectx-android e crea uno o più commit con messaggi in inglese, prefissati con feat: o fix:. Non pusha. Usala quando l'utente chiede di committare, fare un commit o salvare le modifiche in git.
---

# Commit delle modifiche

Questa skill vale per la repo `projectx-android`. Il backend è nella repo indipendente `projectx-be`, che ha una skill `commit` con le stesse regole: se ci sono modifiche anche lì, usa anche quella. Ogni commit va fatto nella repo a cui appartengono i file: usa `git -C <repo> ...`.

## Procedura

1. **Analizza** la repo: `git -C <repo> status --short` e `git -C <repo> diff HEAD` (più i file untracked, leggendoli). Se non ci sono modifiche, dillo e fermati.
2. **Raggruppa** le modifiche per scopo: un commit per ogni modifica logicamente distinta (es. una nuova schermata e una fix non correlata sono due commit). Mai mischiare repo diverse nello stesso commit. Se è tutto un'unica modifica, un solo commit.
3. **Committa** ogni gruppo aggiungendo solo i suoi file per nome (`git -C <repo> add <file...>`, mai `git add -A`/`.`), poi `git -C <repo> commit`.
4. **Riepiloga**: per ogni commit, repo, hash corto e messaggio.

## Messaggio di commit

- **In inglese**, imperativo, prima riga ≤ 72 caratteri, che descrive cosa è cambiato.
- Deve iniziare con:
  - `feat:` se aggiunge o estende una funzionalità (nuovo endpoint, tabella, schermata, comportamento);
  - `fix:` se corregge un bug o un comportamento errato.
- Altri casi (docs, refactor, config): scegli comunque `feat:` o `fix:` in base a cosa si avvicina di più; non usare altri prefissi.
- Se serve contesto, aggiungi un corpo breve dopo una riga vuota.
- Chiudi sempre il messaggio con la riga: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`

Esempio: `feat: add create-measurement endpoint and document it in ENDPOINTS.md`

## Regole

- Non committare file sensibili o generati (`.env`, chiavi, `build/`, `.DS_Store`, `local.properties`): se li trovi tra le modifiche, escludili e segnalalo.
- Non usare `--no-verify`, `--amend` o `reset`. Se un hook fallisce, correggi la causa e crea un nuovo commit.
- Questa skill **non** esegue `git push`.
