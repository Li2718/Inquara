# Motion Polish

> status: active
> purpose: Add restrained, consistent motion to product interactions so state changes feel smooth without becoming distracting.

## Goal

Make common UI state changes feel intentional and readable. Motion should clarify what changed, preserve spatial continuity, and reduce abrupt flashing during canvas and panel transitions.

## Boundary

### Included

- Audit existing product interactions that appear, disappear, expand, collapse, or switch context.
- Add suitable motion to shared surfaces such as popup menus and confirmation dialogs.
- Add suitable motion to canvas-specific interactions such as node show/hide, follow-up branch reveal, source-highlight toggles, and canvas context menus.
- Unify workspace/canvas switching so clicking another canvas, creating a canvas, deleting the current canvas, or any future route-level canvas switch uses the same transition path.
- Keep motion subtle, fast, and consistent with the current product style.
- Respect reduced-motion preferences.
- Document durable motion rules in the long-term UI system doc if the work creates reusable standards.

### Not Included

- A full visual redesign.
- Decorative or attention-grabbing animation.
- Heavy animation libraries unless native CSS/React state is insufficient.
- Route transitions outside the authenticated product canvas flow.
- Visual regression infrastructure.

## Working Rule

This initiative README is the source of truth for live task status. When an audit, discussion, design step, or implementation step changes the task list, update the progress sections before continuing implementation.

## Motion Principles

- Motion should explain cause and effect: menus emerge from their trigger, dialogs settle into focus, canvas content changes as a single context switch.
- Prefer short timings. Most micro-interactions should stay around 90-180ms unless the interaction spans a larger surface.
- Use opacity with small translate or scale changes. Avoid bouncy easing unless there is a deliberate physical metaphor.
- Do not animate content in a way that shifts readable text while the user is trying to read or type.
- Add `prefers-reduced-motion` handling before calling the work complete.

## Initial Audit

### Existing Motion To Preserve Or Refine

- Sidebar morph expand/collapse already has a carefully tuned shape transition and should be preserved unless a concrete defect appears.
- Canvas workspace content has a node/edge enter-leave animation, but the switching trigger is currently split between `CanvasWorkspace` delay state and `CanvasView` snapshot state.
- Debug floating control already has drag/rebound motion; it is development UI and not part of the main product polish pass.

### Clear Improvement Targets

- Shared `PopupMenu` currently mounts and unmounts instantly. Add a reusable menu enter/exit motion that works for account, workspace item, node action, and canvas context menus.
- Shared `ConfirmDialog` currently appears and disappears instantly. Add a backdrop/dialog transition with Escape/backdrop close still behaving immediately enough to feel responsive.
- Workspace creation and current-workspace deletion navigate directly with `router.push` or `router.replace`, so they can miss the existing canvas switch leave/enter transition. Route all canvas switches through a shared transition helper/state path.
- Canvas node hide/show currently changes the React Flow node set immediately. Add a subtle disappear/reveal treatment if it can be done without delaying data correctness or making hidden branches confusing.
- Follow-up branch creation creates a new node/edge and source highlight. Add a small reveal treatment for the new branch and a gentle highlight emphasis if it improves orientation.
- Rename form swaps with workspace list item instantly. Consider a small inline transition only if it does not make editing feel sluggish.

### Lower Priority / Be Careful

- Message streaming should stay readable and should not animate every token or paragraph.
- Scrollbar behavior should remain functional; avoid animated scrollbar tricks.
- Button hover transitions already exist and should not become more animated.
- Debug UI can keep its own non-product motion style.

## Completed Work

- Created the motion polish initiative.
- Audited the current frontend motion surfaces in `apps/web/src/shared/styles.css`, shared UI components, workspace sidebar, canvas workspace, and canvas view.
- Added a shared workspace navigation path so sidebar selection, new canvas creation, and current-canvas deletion can use the same leave/enter canvas transition.
- Added shared popup menu enter/exit motion through the reusable `PopupMenu` presence state.
- Added shared confirmation dialog enter/exit motion while preserving Escape and backdrop close behavior.
- Fixed confirmation dialog exit motion so it freezes the last open-state content during close instead of briefly showing cleared or loading text.
- Added a global `prefers-reduced-motion: reduce` CSS guard for transitions and animations.

## Remaining Work

- Review the shared workspace navigation path in-browser and tune the existing canvas leave/enter timing if create/delete still feels abrupt.
- Evaluate and implement canvas node/branch show-hide motion if it can preserve data correctness and not confuse branch visibility.
- Evaluate small inline transitions for workspace rename and source-highlight activation.
- Verify with the browser on the current canvas page.
- Update long-term UI documentation if reusable motion rules are introduced.

## Deferred Work

- Full route transition system for non-canvas pages.
- Visual regression testing for motion.
- Reworking the sidebar morph animation, unless a specific issue appears.
- Animation library adoption.

## Related Documents

- [UI System](../../ui-system.md)
- [Architecture](../../architecture.md)
- [Documentation Standards](../../documentation-standards.md)

## Archive Criteria

- Shared menu and modal surfaces have intentional, reusable motion.
- Canvas switching uses one transition path across select, create, delete, and future workspace-switch triggers.
- Any added canvas node/branch motion has been verified not to break selection, scrolling, dragging, resizing, or data synchronization.
- Reduced-motion behavior exists for the new motion rules.
- Durable motion conventions, if created, are reflected in current documentation.
