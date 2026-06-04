# Day Night System

> status: active
> owner: web
> updated: 2026-06-04
> related_docs:
> - `docs/ui-system.md`
> - `docs/architecture.md`
> - `docs/multilingual.md`
> - `apps/web/src/shared/components/README.md`
> archive_when:
> - Inquara supports a complete light and dark appearance system through shared appearance state and semantic tokens
> - product, admin, and debug surfaces have been audited for appearance correctness without scattered page-specific overrides
> - the appearance preference UI, persistence model, SSR initial state, and fallback behavior are documented and verified
> - durable display-mode rules are reflected back into current long-term docs

## Goal

Design and implement a complete day/night appearance system for Inquara.

The system must not be a shallow dark-mode switch. It must define appearance state, persistence, SSR behavior, token layering, component coverage, product/admin/debug surface rules, accessibility checks, and verification expectations.

## Reference

Use the local `aitestkit` reference checkout supplied by the user as implementation reference material. Do not commit the user's workstation path.

Initial useful reference points found there:

- `apps/web/src/lib/appearance.ts` defines `system | light | dark` preference parsing and mode resolution.
- `apps/web/src/components/appearance/AppearanceProvider.tsx` owns document-level `data-appearance`, `color-scheme`, local storage, cookies, and system color-scheme subscription.
- `apps/web/src/components/chrome/TopBar/AppearanceMenu.tsx` exposes a top-bar appearance selector through shared menu behavior.
- `apps/web/src/app/globals.css` defines separate `html[data-appearance="light"]` and `html[data-appearance="dark"]` token sets, then derives component tokens from shared semantic values.

## Current Inquara Context

Inquara previously documented `light` as the only supported appearance in `docs/ui-system.md`.

The same document already says future dark mode must be introduced as a display-mode feature with tokens, component variants, and verification rather than scattered page-specific overrides.

Current app layout mounts global providers from `apps/web/src/app/layout.tsx`. The appearance system should join that root-level provider stack instead of being owned by a product page.

Current UI styling is still heavily light-mode-oriented in `apps/web/src/shared/styles.css`, including many direct `rgb(...)`, `#fff`, gradients, and legacy token names. A complete day/night system therefore needs a token migration and audit, not only a provider and menu.

## Scope

In scope for this initiative:

- shared appearance model: `light`, `dark`, and `system` user preference
- server-readable preference cookie and client-readable storage
- root document `data-appearance` and `color-scheme`
- shared appearance provider and hook under shared layers
- app-level appearance selector in existing chrome, using shared menu and shared icons
- English and Chinese product copy for appearance UI
- semantic token restructuring in `apps/web/src/shared/styles.css`
- product canvas, node, sidebar, top chrome, account, auth, admin, modal, menu, toast, and loading-state coverage
- debug surface readability while remaining visibly non-product
- reduced-motion-safe appearance transitions, if any transition is used
- unit tests for parsing, resolution, persistence constants, and provider behavior where practical
- browser verification across product, admin, and debug surfaces

Explicitly out of scope for the first complete slice:

- adding any locale beyond `en` and `zh-CN`
- adding user profile database columns for appearance preference
- per-canvas themes or other scoped theme variants
- arbitrary theme customization, accent pickers, seasonal skins, or brand redesign
- changing page information architecture between light and dark appearances

## Early Design Constraints

1. Appearance is display mode, not surface. Product, admin, and debug stay separate surface concepts.
2. Appearance state must mount at the document root through `data-appearance`.
3. Components must consume semantic tokens. Page-local dark overrides are a last resort only when the local visual role is truly unique.
4. The selector belongs in shared app chrome, not inside individual pages.
5. Static product copy must update both supported locales in the same change.
6. The implementation must leave light mode as polished as it is today while adding dark mode.
7. Debug UI must not become visually product-like in dark mode.

## Completed Work

- Created isolated managed worktree and branch: `day-night-system`.
- Classified this document as active initiative documentation.
- Read repository documentation standards, UI system rules, and component placement rules.
- Reviewed existing Inquara layout, shared component, locale, and style entrypoints relevant to appearance.
- Reviewed `aitestkit` appearance provider, appearance menu, appearance model, root layout, and token CSS approach.
- Added shared appearance model helpers for `system | light | dark`, with focused unit tests.
- Added shared DOM helpers for root `data-appearance`, `color-scheme`, cookie persistence, and system-mode reading, with focused unit tests.
- Added root-level `AppearanceProvider` and request helpers so SSR reads the appearance preference cookie and the client follows system color-scheme changes.
- Added an app chrome appearance menu using shared popup-menu behavior, shared floating controls, and shared icons.
- Added English and Chinese appearance menu copy and dictionary coverage tests.
- Reworked `apps/web/src/shared/styles.css` to define light and dark appearance token sets under `html[data-appearance]`.
- Connected major product, admin, modal, menu, toast, canvas, node, new-canvas, message, and debug-adjacent surfaces to appearance-aware tokens.
- Updated `docs/ui-system.md` so durable display-mode rules match the new product baseline.
- Verified the appearance switch in the browser on the canvas page:
  - light starts with `data-appearance="light"` and light tokens
  - selecting dark writes `inquara.appearance=dark` to local storage and cookie
  - dark updates `data-appearance`, `color-scheme`, canvas background, and node background
- Ran lint, typecheck, full tests, production web build, and debug-free verification.

## Remaining Work

- Broaden manual visual review beyond the canvas page to auth, admin, modal, toast, and error states when the next UI pass is available.
- Fix any additional contrast or token gaps found during broader visual review.

## Deferred Or Out Of Scope

- Database-backed appearance preferences.
- More than two display modes.
- Theme customization beyond day/night appearance.

## Next Step

Run verification checks and browser review both appearances.
