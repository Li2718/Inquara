# Inquara UI System

> status: current
> purpose: Define Inquara's durable UI rules, display model, surface model, token layering, component boundaries, page skeleton constraints, and accessibility expectations.

## 1. Document Goal

This document defines the current UI baseline for Inquara.

It exists to solve two problems:

1. Product UI should be composed from reusable components and stable rules, not from page-local one-off markup.
2. The canvas product should keep a calm, readable, fresh visual direction without making each feature invent its own style system.

This document serves the current product stage:

- Build a personal AI thinking canvas that feels light, focused, and usable.
- Keep the infinite canvas, chat nodes, sidebar, menus, dialogs, and account surfaces consistent.
- Preserve clear extension points for future admin and debug surfaces.
- Avoid turning the UI system into a speculative brand manual or a large design-system project before the product needs it.

This document has two layers:

- `UI rules`
  - How to implement, reuse, place, and constrain components and pages.
- `design style`
  - How the product should feel visually in the currently supported display mode.

Minimum long-term rules:

1. Distinguish `UI rules` from `design style`.
2. Reuse shared UI components before writing page-local UI.
3. Add missing shared abstractions to the component library before consuming them in pages.
4. Prefer semantic tokens over hard-coded colors, borders, shadows, spacing, and typography.
5. Display-mode changes must not change page information architecture by default.
6. The product currently supports `light` only unless a future task explicitly adds another display mode.
7. Pages and components must be classified by `surface` before placement.
8. Debug UI must stay isolated from the formal product surface.
9. Keep readability, operation clarity, and maintainability above decoration.

## 2. Design Goals

### 2.1 Current Product Character

Inquara is not a marketing site, a traditional dashboard, or a generic chat app.

The current product character should be:

- Fresh: light, calm, and approachable without looking childish.
- Focused: the canvas should remain the primary canvas.
- Readable: chat content and selected source text should stay comfortable at different canvas zoom levels.
- Spatial: relationships between nodes should be legible without overwhelming the canvas.
- Maintainable: repeated interactions such as menus, dialogs, icon buttons, empty states, and sidebars should not be reimplemented per feature.

### 2.2 Design Principles

1. **Canvas first**
   - Decorative UI must not compete with the canvas, chat nodes, and node relationships.
2. **Components before page exceptions**
   - Define and reuse shared components before adding page-specific style variants.
3. **Stable structure, flexible visuals**
   - Display mode and visual polish may change tokens or variants, but should not silently reorganize information architecture.
4. **Light density**
   - The interface should feel airy and clean, but controls must remain easy to scan and use repeatedly.
5. **State clarity**
   - Loading, streaming, disconnected, deleted, hidden, selected, and disabled states must be visible and consistent.

## 3. Boundary Between UI Rules And Design Style

### 3.1 UI Rules

These are rules:

- Whether a component should be shared.
- Where a component should live.
- Whether a page may implement its own modal, menu, tabs, table, or button behavior.
- How semantic tokens are layered.
- How surfaces are separated.
- How accessibility states are handled.
- How shared components are documented and exported.

Rules answer:

- "How should this be built?"
- "Where should this code live?"
- "What may be reused?"

### 3.2 Design Style

These are style choices:

- Whether the product feels softer or more technical.
- How much contrast canvas controls should have.
- Whether menus feel more like paper surfaces or tool palettes.
- How expressive the brand mark or alpha badge should be.

Style answers:

- "What should it feel like?"
- "What visual tone does this surface carry?"

### 3.3 Current Inquara Relationship

Current project conventions:

- UI rules are stable and durable.
- Current design style is a light, fresh product canvas.
- Display-mode changes must not change page information architecture unless explicitly designed.

## 4. Display Model

### 4.1 Current Support

Inquara currently supports:

- `appearance`: `light | dark`
- `appearance preference`: `system | light | dark`

The active appearance is document-level state, not page-local state. The `system` preference resolves to the browser's current `prefers-color-scheme` value on the client and uses `light` as the server fallback until the client can read the browser preference.

### 4.2 State Model

Use a single-dimensional display mode model:

```ts
type Appearance = "light" | "dark";
type AppearancePreference = "system" | Appearance;
```

### 4.3 DOM Mounting

Mount display-mode state at the top-level document:

```html
<html data-appearance="light">
```

Do not scatter display-mode state across individual components. Components must consume semantic tokens that resolve under `html[data-appearance="light"]` and `html[data-appearance="dark"]`.

## 5. Surface Model

The frontend must distinguish `surface` from `appearance`.

Current and planned surfaces:

- `product`
  - The normal authenticated Inquara canvas experience.
- `admin`
  - Future administrator surfaces. Admin accounts already exist in the account model, but admin UI should not be invented until needed.
- `debug`
  - Development-only diagnostics and internal tooling.

### 5.1 Purpose

`surface` defines product ownership.

It answers:

- Who is expected to see this page?
- Which product area owns this component?
- Is this implementation allowed in the production product path?

### 5.2 Route Rules

Route ownership should express surface ownership before page semantics where practical.

Current rules:

- Product pages live under normal app routes such as `apps/web/src/app/canvases/**`.
- Future admin pages must live under an explicit admin route group or `app/admin/**`.
- Debug UI is mounted globally through `apps/web/src/debug/DebugRoot.tsx`, not rendered directly by product pages.
- Debug API routes must use `/debug/*` paths only and must not be registered in production.
- Design experiments, visual labs, and demo-only routes are debug surface work unless explicitly promoted into product.

### 5.3 Access Control

Access control should be centralized by surface.

Long-term direction:

- `product` uses the normal authenticated-user guard.
- `admin` uses a centralized admin guard.
- `debug` uses a development-only guard and production exclusion.

Do not scatter ad hoc role checks or environment branches through page bodies when a surface-level guard should own the rule.

### 5.4 Debug Isolation

`debug` is not product UI hidden behind a runtime branch.

Hard rules:

- Debug UI must follow the debug rules in `docs/architecture.md`.
- Product pages may publish debug data only through product-safe debug source entrypoints.
- Product feature modules outside `apps/web/src/debug/` must not import `.dev` debug modules directly.
- Debug UI must be visually marked as debug and must not resemble ordinary product UI.

### 5.5 Component Ownership By Surface

Classify components in this order:

1. If reusable across multiple surfaces, place it in a shared layer.
2. If only product pages reuse it, place it in the product/domain layer or feature layer depending on reuse.
3. If only future admin pages reuse it, place it in an admin-specific layer when that surface exists.
4. If only debug uses it, place it under the debug system and follow debug production-exclusion rules.
5. If only one page or one parent component uses it, keep it private beside that owner.

### 5.6 Import Boundaries

Required dependency direction:

- Product pages must not depend on debug-only components.
- Admin pages must not depend on debug-only components.
- Product pages should not directly depend on admin-only components.
- Admin pages should not directly depend on product-only components.
- If two surfaces need the same component, extract it upward into a shared layer.

## 6. Token Layering

### 6.1 Why Tokens Are Layered

Inquara's UI has more than simple colors:

- Canvas background and controls.
- Floating panels.
- Node surfaces.
- Menus and modals.
- Text hierarchy.
- Selection highlights.
- Subtle edge and shadow behavior.

Use layered tokens so components consume meaning, not raw visual constants.

### 6.2 Layer 1: Base Semantic Tokens

Base semantic tokens define value meaning.

Examples:

```css
--color-bg-base
--color-bg-elevated
--color-text-primary
--color-text-secondary
--color-text-muted
--color-border-subtle
--color-border-strong
--color-accent
--color-accent-strong
--color-success
--color-warning
--color-danger
```

### 6.3 Layer 2: Composite Visual Tokens

Composite tokens define complete visual recipes.

Examples:

```css
--app-background
--canvas-background
--node-background
--panel-background
--menu-background
--modal-background
--control-background
--selection-highlight
--shadow-sm
--shadow-md
--shadow-lg
```

Gradients, shadows, and surface treatments should be complete tokens. Do not split a single visual recipe into scattered values that each component recomposes differently.

### 6.4 Layer 3: Component Semantic Tokens

Component tokens are the interface consumed by components.

Examples:

```css
--button-primary-bg
--button-primary-fg
--button-secondary-bg
--button-secondary-fg
--icon-button-bg
--icon-button-fg
--menu-item-hover-bg
--modal-backdrop
--node-border
--node-title-fg
--status-success-bg
--status-success-fg
```

### 6.5 Layer 4: Typography And Scale Tokens

Examples:

```css
--font-sans
--font-display
--font-mono

--radius-sm
--radius-md
--radius-lg
--radius-xl

--space-1
--space-2
--space-3
--space-4
--space-5
--space-6
--space-8
--space-10
--space-12
```

## 7. What Should Be Tokenized

### 7.1 Tokenize

- Colors.
- Surface backgrounds.
- Selection highlights.
- Border strength.
- Radius.
- Shadow.
- Typography families and scale.
- Common spacing rhythm.
- Component-level visual variants.

### 7.2 Do Not Tokenize Alone

Some behavior needs component rules, not just token values:

- Canvas zoom behavior.
- Node resize affordances.
- Sidebar expand/collapse animation.
- Menu placement and outside-click handling.
- Modal focus restoration.
- Text selection and follow-up toolbar placement.
- Auto-scroll stickiness during streaming.

Tokens provide values. Components own behavior and interaction semantics.

## 8. Current Design Style

### 8.1 Product Light Mode

Current style target:

- Fresh.
- Quiet.
- Slightly tactile.
- More like a focused thinking canvas than a dense enterprise console.

Visual direction:

- Light neutral backgrounds with restrained accent color.
- Soft but visible floating controls.
- Rounded controls where that matches existing project style.
- Calm node surfaces with clear text hierarchy.
- Dashed or low-emphasis relationship lines unless selected or active.
- Debug elements must intentionally break this style so they are never confused with product UI.

### 8.2 Density

Use compact controls where repeated action matters, but do not compress chat text or menus so far that they become hard to read.

Canvas controls and sidebar controls should be scannable without becoming a toolbar-heavy application.

## 9. Component Library Layers

Shared reusable UI belongs under:

```text
apps/web/src/shared/components
```

This repository does not use `apps/web/src/components` as the primary component root. Use `shared/components` unless the architecture changes explicitly.

### 9.1 Directory Layers

Use these fixed layers:

- `shared/components/ui/`
  - Generic UI primitives and reusable interactions.
  - Examples: button, icon button, dropdown menu, modal, tabs, input, textarea, badge, tooltip, shared icon entrypoint.
- `shared/components/chrome/`
  - App-level frame and navigation components.
  - Examples: product shell, top controls, global sidebar primitives.
- `shared/components/product/`
  - Product-surface reusable components that are not generic enough for `ui/`.
  - Examples: canvas navigation pieces, account menu compositions.
- `shared/components/domain/`
  - Domain-composed components built from lower shared layers.
  - Examples: reusable canvas or node-related compositions that are still not feature-private.
- `shared/components/admin/`
  - Future admin-surface reusable components.
  - Create only when admin UI exists.

Debug UI follows the debug system:

- Reusable debug UI should live under `apps/web/src/debug/` unless a future architecture document explicitly creates a production-excluded shared debug component layer.
- Development-only debug files must use `.dev.ts` or `.dev.tsx`.

### 9.2 Private Components

Non-shared components do not enter the shared layer.

- Page-only components go under a same-name private directory beside the page file.
  - Example:
    - `apps/web/src/app/canvases/[canvasId]/page.tsx`
    - `apps/web/src/app/canvases/[canvasId]/page/LocalPanel.tsx`
- Component-only subcomponents go under a same-name private directory beside the parent component.
  - Example:
    - `apps/web/src/shared/components/chrome/ProductSidebar.tsx`
    - `apps/web/src/shared/components/chrome/ProductSidebar/SidebarItem.tsx`
- Component-local styles and assets should live in that same-name private directory when they are not shared.

If a component is used by multiple pages or multiple toolbar/surface locations, it must not remain inside a page file.

## 10. Component Layer Semantics

### 10.1 Layer 0: Primitives

Minimal visual primitives provide layout and text capabilities without product meaning.

Possible components:

- `Box`
- `Stack`
- `Inline`
- `Grid`
- `Text`
- `Heading`
- `Divider`
- `Surface`

Use primitives to unify spacing, arrangement, and text hierarchy.

### 10.2 Layer 1: Core UI Components

Generic interactions and display components.

Expected components:

- `Button`
- `IconButton`
- `Input`
- `Textarea`
- `Checkbox`
- `RadioGroup`
- `Tabs`
- `Badge`
- `StatusPill`
- `Table`
- `Modal`
- `Drawer`
- `Tooltip`
- `PopupMenu`

Pages and features must prefer this layer before inventing local behavior.

### 10.3 Layer 2: Chrome And Product Components

Project-level reusable structure and product-surface compositions.

Expected components over time:

- `AppShell`
- `ProductSidebar`
- `TopControls`
- `UserMenu`
- `CanvasList`
- `CanvasControlButton`
- `EmptyState`
- `Banner`

These components may know product layout conventions, but should still delegate generic controls to `ui/`.

### 10.4 Layer 3: Domain Components

Components with clear Inquara domain meaning.

Examples over time:

- `CanvasNodeShell`
- `NodeContextMenu`
- `CanvasTrashPanel`
- `BranchSourceQuote`
- `FollowupSourceHighlight`

This layer may express domain semantics, but should not define new generic menu, modal, button, or icon behavior.

## 11. Component Specifications

### 11.1 Button

Variants:

- `primary`
- `secondary`
- `danger`
- `ghost`

Sizes:

- `sm`
- `md`
- `lg`

Rules:

- Use one primary visual action per small local region.
- Destructive actions use `danger`.
- Creating a database-backed object that appears in a managed list should default to a button plus modal, drawer, or wizard unless creation is the page's only core task or the user explicitly asks for inline creation.

### 11.2 IconButton

Variants:

- `standard`
- `subtle`
- `danger`

Sizes should be a fixed set, not one-off pixel values.

Recommended visual sizes:

- `xs`: compact inline controls.
- `sm`: local toolbar controls.
- `md`: standard floating controls.
- `lg`: high-emphasis or touch-friendly controls.

Rules:

- The hit target and visual icon size are separate concerns.
- Use tooltips or accessible labels for icon-only actions.
- Hover states must be subtle and consistent with the owning surface.

### 11.3 Panel

Variants:

- `default`
- `elevated`
- `dense`

Use panels for bounded tool surfaces, modal bodies, or repeated list items. Do not wrap page sections in card-in-card layouts.

### 11.4 PopupMenu

Rules:

- Use one shared menu behavior for outside click, escape key, focus handling, placement, and opaque menu surfaces.
- Do not hand-roll dropdown or menu behavior in high-level product views.
- Menu surfaces should be opaque by default.

### 11.5 Modal

Rules:

- Use modal dialogs for destructive confirmations and compact workflows that should interrupt the current context.
- Do not use browser `alert`, `confirm`, or `prompt`.
- Restore focus after close.
- Support escape key and outside-click behavior only when the action can be safely dismissed.

### 11.6 StatusPill

Semantic variants:

- `success`
- `warning`
- `danger`
- `neutral`
- `info`

Business status mapping must be centralized. Pages must not each invent status colors.

### 11.7 Table

Rules:

- Header text should be lower emphasis but readable.
- Rows should prioritize readability over maximum compression.
- Row state should use `StatusPill` or a shared state component.
- Do not customize table border and spacing per page.

### 11.8 Icon

Rules:

- Do not hand-draw routine product icons as inline SVG in page or feature components.
- Prefer a shared icon source in `shared/components/ui/icons.ts` when available.
- Use outline icons for routine product UI.
- Use filled icons only for explicit exceptions such as brand marks or deliberate high-emphasis states.
- Reuse shared icon size and stroke presets before setting custom values.

Recommended icon sizes:

- `14`: compact dense UI.
- `16`: standard toolbar, menu, and button UI.
- `18`: stronger local emphasis.
- `20`: rare oversized moments.

Recommended stroke:

- `1.75`: routine outline icons.
- `1.8`: slightly denser toolbar icons.
- `2`: strong emphasis.

Keep icon stroke, size rhythm, and optical weight consistent within the same surface.

## 12. Page And Feature Skeleton Rules

### 12.1 Main Product Canvas

The canvas page should preserve this priority:

1. Canvas.
2. Chat nodes and relationships.
3. Sidebar canvas navigation.
4. Top-right account and product controls.
5. Debug UI, only through the global debug system in development.

The page should not become a dashboard of secondary panels.

### 12.2 Sidebar

The sidebar is product chrome, not a page-specific widget.

Rules:

- It should remain visually clean.
- It should handle canvas navigation and canvas-level actions.
- It should not absorb unrelated user/account/debug controls if those belong in top controls or the global debug system.

### 12.3 Canvas Controls

Canvas controls should be minimal.

Rules:

- Keep only controls that are repeatedly useful on the canvas.
- Use a shared icon-button visual system.
- Zoom display and reset-view controls should share the same visual component rhythm as other floating controls.
- Reset-view behavior should account for visible chrome such as an expanded sidebar.

### 12.4 Node UI

Canvas nodes should keep internal content readable and interactive.

Rules:

- Title/header drag behavior must not interfere with message selection.
- Message text should allow selection.
- Follow-up actions from selected text should be floating UI, not layout content that pushes messages.
- Resize handles should be subtle, aligned, and not compete with the composer.
- Node-internal scroll behavior should not unexpectedly pan the canvas.

## 13. Text And Typography

### 13.1 Font Roles

- `font-display`
  - Brand, product title, selected emphasis.
- `font-sans`
  - Normal UI, chat text, controls, menus.
- `font-mono`
  - IDs, technical fields, logs, debug output.

### 13.2 Hierarchy

Recommended roles:

- `display-lg`: product brand or major page title.
- `heading-lg`: section title.
- `heading-md`: panel or modal title.
- `body-md`: normal body text.
- `body-sm`: compact UI and secondary information.
- `label-xs`: labels, metadata, counters.

### 13.3 Copy

Rules:

- Product UI copy should be concise.
- Technical identifiers may stay in English.
- Avoid long explanatory text inside the application when the workflow can be made self-evident.
- Debug UI must clearly mark itself as debug.

## 14. Accessibility

### 14.1 Contrast

Requirements:

- Body text must meet WCAG AA contrast.
- State colors must not be the only signal for state.

### 14.2 Interaction States

Interactive components must define:

- default
- hover
- focus-visible
- active
- disabled

### 14.3 Keyboard Navigation

Required:

- Tab navigation through controls.
- Clear focus for forms, menus, modals, and dialogs.
- Modal close and focus restoration.
- Escape handling for dismissible floating UI.

### 14.4 Motion

Motion exists to explain state changes, preserve spatial continuity, and reduce abrupt flashing. It is not decoration.

Use these timing ranges as the product baseline:

- Menus and small inline interactions: roughly `90-140ms`.
- Modals and confirmation dialogs: roughly `140-180ms`.
- Canvas node and edge appear/exit motion: roughly `150-220ms`.
- Large context switches should stay short enough that the app still feels responsive.

Implementation rules:

- Prefer `opacity`, small `translate` or `scale`, and line-specific properties such as `stroke-opacity`.
- Do not animate layout-affecting properties when the user is reading, selecting text, typing, dragging, scrolling, or resizing.
- React Flow nodes and edges must not animate the outer positioning `transform`.
- Canvas edges should animate the edge path, not the React Flow edge wrapper, when the intent is only line appearance or disappearance.
- Hidden and deleted data state should update immediately. Use a visual-only previous-frame item for exit motion instead of delaying commands, database updates, or real-time synchronization.
- Shared components such as menus, dialogs, and confirmation surfaces own their enter/exit behavior. Product pages and feature views should not hand-roll separate menu or modal motion.
- Motion must not be the only signal for state.

Respect `prefers-reduced-motion` for nonessential animations.

When changing product motion, verify it in the browser. Check enter, exit, quick repeated actions, route or canvas switching, and browser console errors. Canvas motion also needs checks for text selection, node dragging, node resizing, node scrolling, zooming, and real-time synchronization assumptions.

## 15. Implementation And Adoption Rules

When adding or changing UI:

1. Read `apps/web/src/shared/components/README.md`.
2. Search existing shared components and exports first.
3. Classify the target surface.
4. Decide whether the component is shared, product/domain, debug, page-private, or component-private.
5. If a reusable pattern is missing, add it to the component library first.
6. Page files should compose components, not own generic interaction behavior.
7. Use semantic tokens and shared component variants.
8. Update the component manual when the shared component map changes.
9. Do not use browser-native `alert`, `confirm`, or `prompt` for product UI.
10. Verify typecheck, lint, and relevant build checks before closing UI implementation work.

When adding or changing operation entry points:

- Saving existing configuration may remain inline.
- Creating a new list-managed object defaults to modal, drawer, or wizard.
- Editing a single existing object may use inline expansion or modal depending on complexity.
- Destructive actions require a deliberate confirmation UI.
- One-time execution actions may use a button plus confirmation or temporary parameter panel, but should not permanently occupy the main page.
