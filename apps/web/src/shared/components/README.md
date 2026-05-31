# Components Manual

Read this before writing new UI.

## Search Order

Before creating or editing UI:

1. Read this file.
2. Check the relevant shared component barrel exports when they exist:
   - `ui/index.ts`
   - `chrome/index.ts`
   - `product/index.ts`
   - `domain/index.ts`
   - `admin/index.ts`
3. Search `apps/web/src/shared/components/` for likely names and usages.
4. Search `apps/web/src/features/` for feature-owned components that may need to remain private or be promoted.
5. Classify the target as `product`, `admin`, or `debug`.
6. Decide whether it is shared, page-private, or parent-component-private.

Do not skip this workflow and create a new component directly.

## Shared Layers

Shared reusable UI belongs under:

```text
apps/web/src/shared/components
```

Use these layers:

- `ui/`
  - Generic UI primitives and reusable interactions.
  - Examples: `Button`, `IconButton`, `PopupMenu`, `ConfirmDialog`, `Modal`, `Tooltip`, `Input`, `Textarea`, `StatusPill`, shared icon source.
- `chrome/`
  - App-level frame and navigation components.
  - Examples: product shell, top controls, sidebar frame.
- `product/`
  - Product-surface reusable components that are not generic enough for `ui/`.
  - Examples: account menu composition, workspace navigation pieces.
- `domain/`
  - Domain-composed components built from lower shared layers.
  - Examples: reusable canvas/node compositions that are not feature-private.
- `admin/`
  - Future admin-surface reusable components.
  - Create only when admin UI exists.

Debug UI follows the debug system:

- Put debug UI under `apps/web/src/debug/` unless the architecture explicitly defines a production-excluded shared debug component layer.
- Development-only debug files must use `.dev.ts` or `.dev.tsx`.
- Product feature modules outside `apps/web/src/debug/` must not import `.dev` debug modules directly.

## Surface Classification

All pages and components must be classified by surface first:

1. `product`
2. `admin`
3. `debug`

Rules:

- Product pages are the normal authenticated Inquara workspace experience.
- Admin pages must use an explicit admin route and admin guard when they exist.
- Debug UI must stay isolated from product UI and follow `docs/architecture.md`.
- Debug is not a hidden product branch; it is development-only diagnostics.
- Design experiments and demo-only routes are debug surface work unless explicitly promoted.

## Private Component Placement

Page-only components:

- Put them under a same-name private directory beside the page file.
- Example:
  - `apps/web/src/app/workspaces/[workspaceId]/page.tsx`
  - `apps/web/src/app/workspaces/[workspaceId]/page/LocalPanel.tsx`

Parent-component-only subcomponents:

- Put them under a same-name private directory beside the parent component.
- Example:
  - `apps/web/src/shared/components/chrome/ProductSidebar.tsx`
  - `apps/web/src/shared/components/chrome/ProductSidebar/SidebarItem.tsx`

Component-local styles and assets:

- Put them in the same-name private directory when they are not shared.

If a private implementation gains a second real use site, reconsider whether it belongs in a shared layer.

## Placement Decision Tree

1. Generic interaction or visual primitive: `ui/`.
2. App frame, navigation, or global product chrome: `chrome/`.
3. Product-surface reusable composition: `product/`.
4. Future admin-surface reusable composition: `admin/`.
5. Cross-surface domain composition: `domain/`.
6. Debug-only UI: `apps/web/src/debug/`.
7. One page only: page private directory.
8. One parent component only: parent private directory.

If placement is unclear, choose the smallest scope that still avoids duplication.

## Hard Rules

- Do not implement reusable interaction directly in `page.tsx`.
- Do not hand-roll dropdown, modal, tabs, table, or menu behavior in `chrome/`, `product/`, `domain/`, or feature views when it belongs in `ui/`.
- Do not create a second component that overlaps an existing shared component because the existing one was not searched for.
- Do not place reusable UI under `app/**` when it belongs under `shared/components/**`.
- Do not place page-only or parent-only pieces into `shared/components/**` just to shorten the owner file.
- Do not leave a reusable component unindexed if future sessions would struggle to find it.
- Do not use browser `alert`, `confirm`, or `prompt` for product UI.
- Do not hand-draw routine product icons inline in page or feature components.
- Prefer the shared icon source and shared icon size/stroke presets when they exist.
- Do not let product or admin pages depend on debug-only components.
- If multiple surfaces need the same component, extract it upward into a shared layer instead of cross-importing between surfaces.

## Shared Component Creation Checklist

When a new shared component is needed:

1. Decide the layer first.
2. Put it in the correct shared directory.
3. Export it from that layer's `index.ts` when that layer has a barrel file.
4. Use semantic tokens and shared styles.
5. Include accessible labels, focus states, and disabled states where applicable.
6. Update this manual if the component changes how future work should search or compose UI.

## Current Examples To Normalize Over Time

Implemented shared components:

- `chrome/AppTopBar.tsx` provides the shared app top row for product and admin surfaces, including the Inquara brand mark, account avatar menu, admin entrypoint, and logout confirmation.
- `ui/Button.tsx` provides the shared action button wrapper for primary, secondary, and danger actions while preserving the current button CSS contract. Use it for ordinary text action buttons such as form submit and confirmation actions; keep segmented controls, morph controls, icon-only controls, and specialized canvas affordances on their dedicated components.
- `ui/IconButton.tsx` provides the shared quiet square icon button wrapper for product toolbars and node headers.
- `ui/FloatingCircleButton.tsx` provides the shared round floating control wrapper with fixed size presets.
- `ui/LoadingState.tsx` provides shared loading presentation variants and skeleton blocks for page, panel, inline, and canvas loading states.
- `ui/PopupMenu.tsx` provides the shared opaque menu surface, outside-click handling, Escape handling, and menu item styling for product menus.
- `ui/ConfirmDialog.tsx` provides the shared confirmation modal pattern, portal mounting, Escape/backdrop close behavior, accessible dialog attributes, and confirm/cancel actions for destructive or irreversible product actions.
- `ui/icons.tsx` provides the shared routine product icon source for current sidebar, menu, check, plus, and reset-view icons. Prefer this file before adding inline SVG or text-symbol icons in feature code.
- `product/ErrorScreen.tsx` provides the shared product error fallback used by app-level and global Next.js error boundaries.

The project currently has several feature-owned UI pieces that may be promoted into shared components as reuse becomes clear:

- `features/workspaces/WorkspaceSidebar.tsx`
- `features/canvas/CanvasView.tsx`
- `features/canvas/CanvasNodeView.tsx`
- `features/canvas/SelectionFollowupToolbar.tsx`
- `features/node-chat/NodeChatPanel.tsx`
- `features/node-chat/MessageList.tsx`
- `features/node-chat/MessageComposer.tsx`

Do not move them preemptively. Promote only when a real second use or a missing shared abstraction justifies it.
