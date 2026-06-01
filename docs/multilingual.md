# Multilingual Standards

> status: active
> purpose: Define Inquara's supported interface languages, source-copy and translation rules, locale state model, formatting rules, and implementation constraints for multilingual product work.

## Current Scope

Inquara supports these interface locales:

- `zh-CN`
- `en`

Do not add another interface locale unless the task explicitly expands the supported locale set. A feature that adds user-visible product copy must keep every supported locale complete in the same change.

The default product locale is `en`.

English is the source language for product UI copy. Other supported locales are translations of the English source copy unless a product owner explicitly defines a locale-specific exception.

## Strategy

Inquara uses dictionary-driven product copy and locale-aware formatting.

The product should use:

- a shared locale parser and locale constants
- request-readable persistence for the server-rendered first view
- client-side locale state for interactive language switching
- shared message dictionaries for product, admin, and shared component copy
- shared formatter helpers for dates, numbers, percentages, currency, and other locale-sensitive values

The product should not use:

- locale-prefixed routes
- one route tree per language
- hard-coded page-local product copy when the copy should be translated
- remote CMS-backed copy management
- database-backed translation strings for static product UI

## Placement Rules

Locale state and parsing should use a shared web entrypoint such as:

- `apps/web/src/shared/locale/`

Shared message dictionaries should use a shared web entrypoint such as:

- `apps/web/src/shared/messages/`

Shared locale-aware formatters should use a shared web entrypoint such as:

- `apps/web/src/shared/format/`

Create those shared entrypoints as part of the implementation task that first needs them. Do not scatter local locale parsers, local dictionaries, or local formatters across page and feature files while waiting for the shared entrypoint to exist.

Language switching UI belongs in the existing shared UI system:

- generic language menu or toggle primitives belong under `apps/web/src/shared/components/ui/`
- app chrome language controls belong under `apps/web/src/shared/components/chrome/`
- product-only language compositions belong under `apps/web/src/shared/components/product/`
- admin-only language compositions belong under `apps/web/src/shared/components/admin/` when admin-specific shared components exist

Do not place reusable locale infrastructure directly under `apps/web/src/app/**` or inside feature-owned views.

## Source Copy Rules

User-visible product copy must come from shared message dictionaries unless it is intentionally dynamic or externally owned.

English source copy must be written first for new product UI. The source copy should be concise, concrete, and action-oriented. Do not write awkward English to make later translation easier; instead, translate the intended product meaning into each target locale.

Acceptable exceptions are:

- user-created workspace, node, account, or database record names
- IDs, slugs, enum values, model names, provider names, and other technical identifiers
- raw external API error messages when preserving the provider response is the intended behavior
- debug-only labels inside development-only debug files
- test fixture strings that are not representing product UI copy

When adding or changing product copy:

1. Update `zh-CN` and `en` in the same change.
2. Treat `en` as the source text and `zh-CN` as a localized translation of that source.
3. Prefer existing dictionary structure before adding new groups.
4. Group keys by interface area or domain, not as a flat global string list.
5. Keep business codes and persisted values stable; translate only display text.
6. Keep terminology consistent with the current product vocabulary.
7. Do not use machine translation output without reviewing it in product context.

## Translation Rules

Translations must preserve product meaning, not word order.

Every translation should:

- use natural UI language for the target locale
- preserve the user's task and the product state described by the English source
- keep labels, buttons, menu items, and errors short enough for the existing UI
- keep the tone calm, direct, and operational
- prefer the established product term over a new synonym
- preserve interpolation tokens, variable names, markup boundaries, and interpolation semantics exactly

Do not translate:

- product name `Inquara`
- code identifiers, event names, API field names, enum values, or command names
- route paths, package names, filenames, environment variable names, or database column names
- model names, provider names, and external brand names unless the brand has an official localized name
- keyboard keys and shortcuts unless the platform convention requires a localized display

Translate user-facing concepts, not internal architecture. For example, expose a clear action or state to the user instead of leaking implementation labels such as lease, mutation, transport, or debug source unless the surface is intentionally developer-facing.

### Chinese Translation Rules

Chinese UI copy should use Simplified Chinese for `zh-CN`.

Use Chinese punctuation in Chinese sentences. Keep common technical nouns in English when translating them would be less recognizable to the target user, especially model names, provider names, API, token, JSON, URL, and ID.

Prefer concise product UI phrasing over literal translation. Avoid overly formal or verbose constructions such as "您可以在此处进行..." when a direct label or action is clearer.

### Error And Empty-State Translation

Errors must say what happened and what the user can do next when recovery is possible.

Empty states should describe the current state and the primary next action. Do not add marketing copy or broad explanations to fill space.

When an error includes a raw external provider response, translate the surrounding product guidance but preserve the raw provider message if preserving it helps troubleshooting.

### Translation Review Checklist

Before accepting translated copy:

1. The target copy matches the English source meaning.
2. UI controls still fit in their intended space.
3. Interpolation tokens and keys are unchanged.
4. Terminology is consistent with nearby product surfaces.
5. The translation reads like native UI copy, not a literal sentence-by-sentence conversion.
6. Error and empty-state copy gives the user a clear next step when one exists.

## Server And Client Responsibilities

Server-rendered pages must:

- read the request locale through the shared locale helper
- select the matching message dictionary before rendering
- pass locale and translated copy to server-composed views when needed
- use shared locale-aware formatters for locale-sensitive display values

Client components that need translated copy must:

- consume locale state and messages from the shared locale provider
- update both server-readable and client-readable locale persistence when switching languages
- refresh or otherwise resynchronize server-rendered content after a locale switch

Do not let server-rendered content and client locale state drift after a language switch.

## Formatting Rules

Pages and feature views must not repeatedly hand-write:

- `new Intl.DateTimeFormat(...)`
- `new Intl.NumberFormat(...)`
- custom date, number, percentage, or currency string assembly

Use shared formatters for at least:

- dates and date-times
- ordinary numbers and counts
- percentages and scores
- currencies
- durations and latency values
- byte sizes or token counts when displayed to users

Shared formatters must accept the current locale explicitly unless they are intentionally bound inside a locale-aware component.

## Testing Rules

Tests should protect product risk, not duplicate JavaScript or framework basics.

Multilingual work should include focused tests when it introduces or changes:

- locale parsing and fallback behavior
- request locale reading
- locale persistence keys
- shared formatter output or null handling
- dictionary completeness checks
- language switch behavior that affects server-rendered and client-rendered content

Avoid snapshotting large translated pages. Prefer smaller assertions around dictionary completeness, formatter behavior, and the specific UI contract being changed.

## Implementation Definition Of Done

Before closing multilingual implementation work:

1. Every supported locale has the new or changed product copy.
2. Locale-sensitive values use shared formatters.
3. Reusable locale state, messages, formatters, and language-switching UI live in the correct shared layer.
4. Server-rendered pages and client components use the shared locale entrypoints instead of local parsing or local dictionaries.
5. Relevant tests, typecheck, and lint pass for the changed surface.
