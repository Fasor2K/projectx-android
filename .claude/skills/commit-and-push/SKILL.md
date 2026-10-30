---
name: commit-and-push
description: Come la skill commit (analizza le modifiche della repo projectx-android, crea uno o più commit in inglese con prefisso feat: o fix:) e in più pusha i commit sul remoto. Usala quando l'utente chiede di committare e pushare.
---

# Commit e push delle modifiche

Esegui **esattamente** la procedura, il formato dei messaggi e le regole della skill `commit` di questa repo (`.claude/skills/commit/SKILL.md`): leggila e seguila. Poi aggiungi il push. Se ci sono modifiche anche in `projectx-be`, usa anche la sua skill `commit-and-push` (lì un push su `main` che tocca `supabase/` va in produzione e richiede conferma).

## Push (dopo i commit)

Se hai creato commit: `git -C <repo> push` (se il branch non ha upstream: `git -C <repo> push -u origin <branch>`). Mai `--force`. Per questa repo non serve conferma.

Se il push viene rifiutato (remoto avanti), non forzare: riporta l'errore e proponi `git pull --rebase`.

## Riepilogo

Per ogni commit: repo, hash corto, messaggio; esito del push.
