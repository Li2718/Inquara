# Debug System

> status: archived
> purpose: Design and implement a development-only debug information system for Inquara.

## Goal

Create a global debug system that keeps product UI clean while making development diagnostics easy to find, visually unmistakable, and removable from production builds.

## Boundary

### Included

- A global debug entrypoint for the web app.
- A visibly non-product debug floating control and menu.
- Page-specific debug panels, starting with canvas workspace diagnostics.
- A rule that any debug API route must use a `/debug/*` path.
- Development-only registration for debug UI and debug API routes.
- Verification that production builds do not expose debug UI, debug menu text, or debug API client references.

### Not Included

- Product analytics.
- Error reporting or observability integrations.
- Admin tools for production data.
- Feature flags unrelated to debug visibility.
- Debug interfaces for non-web clients.

## Current Status

Implementation is complete and verified. The first slice added a development-only web debug entrypoint, a canvas debug panel, `/debug/health`, production debug-marker scanning, and hard repository rules for future debug work.

The debug floating control now keeps display position separate from the user-preferred stored position. Resize clamping and development-time remounts must not overwrite `inquara.debug_position`; only a completed user drag persists a new position. If the bubble is attached to the right or bottom edge, viewport growth keeps it attached to that edge.

## Next Step

No active implementation work remains in this initiative.

## Related Documents

- [Architecture](../../../architecture.md)
- [Documentation Standards](../../../documentation-standards.md)

## Archive Criteria

- The web app has a development-only debug floating control and page-specific debug menu.
- Canvas session diagnostics are no longer shown directly in the product UI.
- Debug API routes, if added, are available only in development and all use `/debug/*`.
- Production build verification confirms debug UI and debug API client references are absent from production output.
