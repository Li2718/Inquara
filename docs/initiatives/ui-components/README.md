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

The UI governance rules have been migrated into long-term documentation. The shared component root exists with a component manual, but most product UI is still feature-local and should be organized gradually.

## Next Step

- Audit the existing UI surfaces and list the first shared components to extract.
- Start with the most obvious reusable interactions: popup menus, modal confirmations, icon buttons, and floating canvas control buttons.

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
