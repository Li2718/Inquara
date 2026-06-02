# Page Transitions

> status: active
> owner: web
> updated: 2026-06-01
> related_docs:
> - `docs/ui-system.md`
> - `docs/architecture.md`
> - `apps/web/src/shared/components/README.md`
> archive_when:
> - product and admin internal navigation share one stable page transition entrypoint
> - the initiative README remaining-work list is empty or intentionally deferred
> - durable rules worth keeping are reflected back into current long-term docs

## Goal

Replace the old route-transition remount approach with a safer, global page transition system for Inquara internal navigation.

The new system must:

- provide coordinated exit and enter motion for page changes
- avoid key-remounting the root App Router page tree
- prefer `document.startViewTransition`
- fall back automatically to normal navigation when View Transitions are unavailable
- keep `/admin` navigation on the normal App Router DOM lifecycle so the previous fatal client error path does not return

## Scope

In scope for this initiative:

- product and admin internal navigation triggered by existing `next/link`, `router.push`, and `router.replace` entrypoints
- one shared navigation wrapper API
- one shared page transition motion definition
- `prefers-reduced-motion` handling
- focused tests for the wrapper behavior
- manual browser verification for product/admin transitions and fallback behavior

Explicitly out of scope for this slice:

- external links
- full page reloads
- form submissions
- downloads
- API requests
- any return to the old root-layout remount pattern
- enabling `experimental.viewTransition` in Next.js

## Known Risks

1. The old `RouteTransitionShell` direction forced App Router subtree remounts by pathname keying and previously triggered `/admin` client fatal errors during React DOM commit work. This initiative must not reintroduce that pattern.
2. Same-route parameter navigation such as `/canvases/a` to `/canvases/b` can briefly show stale canvas data if the route changes before the new snapshot is ready.
3. Browser history back/forward transitions are harder to coordinate than app-owned navigation entrypoints because Next.js owns the route update timing.
4. View Transitions support is browser dependent, so fallback behavior must remain correct and automatic.

## Navigation Entry Points Confirmed

Current internal navigation entrypoints found during implementation planning:

- `apps/web/src/shared/components/chrome/AppTopBar.tsx`
- `apps/web/src/features/canvases/CanvasSidebar.tsx`
- `apps/web/src/features/canvases/CanvasListPage.tsx`
- `apps/web/src/features/canvas/CanvasSurface.tsx`
- `apps/web/src/features/canvas-session/CanvasSessionProvider.tsx`
- `apps/web/src/features/admin/RedemptionCodesAdminPage.tsx`
- `apps/web/src/app/not-found.tsx`

Non-page-transition behaviors intentionally left alone:

- `window.location.reload()` in the client fatal error fallback
- realtime URL construction from `window.location`
- server redirects such as `apps/web/src/app/admin/page.tsx`

## Chosen Approach

Use one shared client-side navigation layer built around `document.startViewTransition`.

The shared layer provides:

- `usePageTransitionNavigation`
- `PageTransitionLink`
- a small root-level history bridge for best-effort browser back/forward transitions

When supported, the wrapper starts a view transition and performs `router.push` or `router.replace` inside the transition callback. When unsupported, or when reduced motion is requested, it immediately falls back to normal navigation.

Page motion is defined once in shared global CSS using:

- `::view-transition-old(root)`
- `::view-transition-new(root)`

This keeps motion global and coordinated while leaving App Router ownership of the DOM intact.

## Implementation Notes

1. Put the shared navigation module under the shared chrome layer because it is global app navigation behavior used across product and admin surfaces.
2. Convert existing internal `Link` entrypoints to `PageTransitionLink`.
3. Convert existing internal `router.push` and `router.replace` entrypoints to `usePageTransitionNavigation`.
4. Keep canvas-to-canvas switching on the same shared page transition layer, while still guarding against stale canvas snapshots during route turnover.
5. Keep browser history support best-effort only for this slice. Stability is more important than forcing history transitions through a risky hack.

## Completed Work

- Classified this documentation as active initiative documentation.
- Confirmed current rules from UI, architecture, and component placement docs.
- Audited the current internal navigation entrypoints that need migration.
- Chose the View Transitions wrapper approach instead of the old remount approach or Next experimental support.
- Added one shared page transition navigation layer with `PageTransitionLink`, `usePageTransitionNavigation`, and `PageTransitionRoot`.
- Added one shared global page transition motion definition with reduced-motion handling.
- Migrated current internal product and admin navigation entrypoints onto the shared transition layer.
- Added focused tests for supported navigation, fallback behavior, and debug-store stability.
- Manually verified:
  - canvas to `/admin/codes`
  - `/admin/codes` back to canvas
  - browser history back from admin to canvas
  - no `/admin` client fatal error regression during these transitions
- Tuned the final motion to remove the stronger downward movement in favor of a flatter fade-led transition.

## Remaining Work

- Manually verify browser-level fallback behavior in a non-supporting browser when that environment is available.

## Deferred Or Out Of Scope

- Promoting browser history transitions from best-effort to guaranteed parity if later verification shows real user value and a stable implementation path.
- Any cross-document navigation animation.
