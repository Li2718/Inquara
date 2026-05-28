# UI Components

> status: active
> purpose: Organize Inquara's reusable UI component system and gradually move repeated product UI into the shared component layers.

## Goal

Turn the current page and feature-local UI patterns into a clear, reusable component system that follows `docs/ui-system.md` and makes future interface work faster, more consistent, and less fragile.

## Boundary

### Included

- Audit current product UI patterns in `apps/web/src/app`, `apps/web/src/features`, and `apps/web/src/shared`.
- Create the initial shared component directory structure under `apps/web/src/shared/components`.
- Define or extract shared primitives and interactions that already have repeated or clearly reusable behavior.
- Prioritize currently repeated patterns such as icon buttons, popup menus, modals, floating canvas controls, and product chrome pieces.
- Update component exports and `apps/web/src/shared/components/README.md` as shared components are added.
- Refactor existing product UI to consume shared components when the extraction is low risk and improves consistency.

### Not Included

- A full redesign of the product.
- A dark mode implementation.
- A complete public design-system package.
- Moving every feature component into shared layers preemptively.
- Admin UI implementation beyond reserving the correct future component layer.
- Debug UI redesign, except where shared rules clarify product/debug boundaries.

## Current Status

The UI governance rules have been migrated into long-term documentation. The shared component root exists with a component manual.

The first shared interaction extraction is underway:

- `PopupMenu` now lives in `apps/web/src/shared/components/ui/`.
- Workspace item menus, node action menus, canvas context menus, and the account menu now consume the shared menu surface and menu item behavior.
- Menu outside-click and Escape handling are now owned by the shared component.
- `ConfirmDialog` now lives in `apps/web/src/shared/components/ui/`.
- Node deletion, workspace deletion, and account logout now consume the shared confirmation dialog instead of feature-local modal markup.
- Confirmation dialog portal mounting, Escape handling, backdrop click handling, accessible dialog attributes, and confirm/cancel action layout are now owned by the shared component.
- `IconButton` and `FloatingCircleButton` now live in `apps/web/src/shared/components/ui/`.
- Node header icon buttons, the account button, and reset-view floating control now consume shared button wrappers while preserving the current visual class contract.
- `Button` now lives in `apps/web/src/shared/components/ui/`.
- Confirmation dialog action buttons now consume the shared primary/secondary/danger action wrapper instead of raw button class names.

## Next Step

- Decide whether the auth form, message composer, and workspace rename/create controls should adopt `Button` now or remain feature-local until their interaction patterns settle.

## Related Documents

- [UI System](../../ui-system.md)
- [Architecture](../../architecture.md)
- [Documentation Standards](../../documentation-standards.md)
- [Components Manual](../../../apps/web/src/shared/components/README.md)

## Archive Criteria

- The first shared component layers exist with discoverable exports where needed.
- Current repeated menu, modal, icon button, and floating control patterns either use shared components or have documented reasons to remain feature-local.
- `apps/web/src/shared/components/README.md` accurately reflects the implemented component map.
- Durable rules learned during the initiative are reflected back into `docs/ui-system.md` when needed.
