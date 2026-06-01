# Multilingual Standards

> status: active
> owner: codex
> last_updated: 2026-06-02
> related_docs:
> - `docs/multilingual.md`
> - `docs/documentation-standards.md`
> - `AGENTS.md`
> archive_when: The durable multilingual rules are reflected in current long-term documentation, AGENTS hard-rule entrypoints reference them, and any follow-up implementation work is either completed or explicitly moved into a separate initiative.

## Purpose

Establish Inquara's multilingual product rules before adding language-switching infrastructure or broad translated UI copy.

This initiative adapts the reusable principles from a neighboring project's i18n standard to Inquara's current documentation layout, shared component structure, and product surface rules.

## Scope

In scope:

- define supported interface locales
- define where locale state, dictionaries, formatters, and language switching UI should live
- define server and client responsibilities for locale-aware rendering
- define product copy and formatting rules
- connect the new long-term standard to repository documentation rules and AGENTS hard-rule entrypoints
- implement shared locale parsing, dictionaries, formatters, provider state, and language switching UI
- wire current static product and admin UI copy to shared dictionaries

Out of scope:

- changing routes, database schema, API contracts, or deployment configuration
- adding any locale beyond `zh-CN` and `en`

## Current Status

Implemented and verified.

An isolated managed worktree and branch exist for this topic: `multilingual-standards`.

## Completed Work

- Classified `docs/multilingual.md` as current long-term documentation.
- Classified this README as active initiative documentation.
- Reviewed the repository documentation standards and current docs layout.
- Reviewed the neighboring project's i18n standard for transferable rules.
- Drafted Inquara-specific multilingual standards using repository-relative paths and current shared component layers.
- Connected the new long-term standard from repository documentation standards and AGENTS hard-rule entrypoints.
- Ran focused documentation verification for local absolute paths, unresolved drafting markers, and changed-file status.
- Removed tool-specific process artifacts from the project documentation hierarchy and recorded that rule in `docs/documentation-standards.md`.
- Updated the standard so `en` is the default locale and English source copy drives translations.
- Expanded the durable rules for translation quality, Chinese localization, untranslated terms, interpolation tokens, errors, and empty states.
- Added shared locale parsing and persistence constants under `apps/web/src/shared/locale/`.
- Added shared English and Simplified Chinese message dictionaries under `apps/web/src/shared/messages/`.
- Added shared locale-aware date, datetime, count, and percent formatters under `apps/web/src/shared/format/`.
- Mounted `LocaleProvider` from the root app layout using request locale cookies.
- Added the shared chrome language menu and placed it in the shared top bar.
- Wired login, top bar, workspace list, workspace sidebar, canvas, node, chat composer, lease blocker, error, not-found, and invitation-code admin surfaces to shared messages.
- Replaced page-local date formatting in migrated surfaces with shared formatters.
- Added focused unit tests for locale defaults, dictionary completeness, and formatter behavior.

## Remaining Work

- User review of implemented behavior and `docs/multilingual.md`.
- Decide whether to archive this initiative after acceptance.

## Deferred Or Out Of Scope

- URL locale prefixes.
- Locale-specific route trees.
- Remote CMS-backed copy management.
- Database-backed translations for static UI copy.
- Adding locales beyond `en` and `zh-CN`.

## Next Step

Review the implemented multilingual behavior and `docs/multilingual.md`, then archive this initiative after acceptance.
