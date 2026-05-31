# Test Governance

> status: archived
> purpose: Clean up low-value tests and define practical standards for future test coverage.

## Goal

Make the test suite useful rather than performative. Tests should catch real regressions, document important behavior, and support confident refactoring without locking harmless implementation details or documentation wording.

## Boundary

### Included

- Audit existing Vitest and Playwright tests for low-value assertions.
- Remove or rewrite tests that only assert incidental strings, class names, source-code fragments, or documentation phrasing without protecting meaningful behavior.
- Define test standards for unit, integration, e2e, source-level safety checks, and documentation/process checks.
- Document when source-level structure tests are acceptable and when they are noise.
- Update current project rules after the standard is agreed.

### Not Included

- Rewriting every test in the repository.
- Replacing the test runner.
- Adding broad UI snapshot testing.
- Relaxing database test isolation rules.

## Working Rule

While active, this initiative README was the source of truth for live task status. It is now retained as historical context; the current testing rules live in [Testing Standards](../../../testing-standards.md).

## Completed Work

- Identified that string-only documentation/process structure tests can be counterproductive when they lock wording instead of behavior.
- Audited the current project test suite and identified the first low-value cluster: UI structure/style tests that only asserted source strings, CSS selectors, SVG path fragments, or exact component usage.
- Removed the initial low-value UI source/style tests:
  - `apps/web/src/shared/components/ui/actionButtonStructure.test.ts`
  - `apps/web/src/shared/components/ui/buttonStructure.test.ts`
  - `apps/web/src/shared/components/ui/confirmDialogStructure.test.ts`
  - `apps/web/src/shared/components/ui/popupMenuStructure.test.ts`
  - `apps/web/src/features/canvas/canvasEdgeStyle.test.ts`
  - `apps/web/src/features/canvas/canvasIconButtonStyle.test.ts`
  - `apps/web/src/features/canvas/canvasResizeHandleStyle.test.ts`
  - `apps/web/src/features/node-chat/sourceHighlightMarkup.test.ts`
- Removed incidental debug floating-ball style assertions while keeping production/debug boundary guardrails.
- Replaced the reset-view source/style structure test with behavior coverage for root viewport calculation in `rootNodeFocus.test.ts`.
- Added the current long-term testing standard at [Testing Standards](../../../testing-standards.md).
- Registered the testing standard in [Documentation Standards](../../../documentation-standards.md).
- Linked the architecture testing strategy to the durable testing standard.
- Audited the remaining source-level tests and kept only boundary guardrails:
  - `apps/web/src/debug/debugProductionScan.test.ts` protects production debug pruning and global debug architecture.
  - `apps/api/src/debug/routes.test.ts` protects `/debug/*` route naming and production registration behavior.
  - `apps/api/src/test/testDatabaseSafety.test.ts` protects ephemeral test database usage.
  - `packages/db/src/schema.test.ts` protects the first-version canvas node data-model boundary against speculative generic node fields.
- Verified the cleaned Vitest suite: 19 test files and 74 tests passed.
- Started a second-pass value audit that is not limited to source-string tests.
- Extracted additional low-value test signals:
  - Thin-wrapper tests that only prove an object factory copies arguments into an object.
  - Tests whose expected values are the implementation rewritten inline, without checking a product rule.
  - Happy-path-only tests for code whose risk is mostly error, rejection, deduplication, ordering, or stale-state behavior.
  - Tests that mock the only meaningful dependency and then mostly verify the mock interaction shape.
  - Tests that cover constants or default values without a failure mode that matters to users or operators.
  - Tests that duplicate coverage already provided by a higher-value API, domain, or e2e test.
- Removed `apps/web/src/features/commands/createCommands.test.ts`; it only checked that a thin client command factory copied arguments into command-shaped objects, while the meaningful command shapes are already exercised by API/domain command handling tests.
- Removed the weak `packages/db/src/schema.test.ts` assertion that merely checked model names exist; kept only the speculative-field data-model boundary guard.
- Updated [Testing Standards](../../../testing-standards.md) with the second-pass low-value test signals.
- Verified the second cleanup pass: 18 test files and 70 tests passed.
- Added the testing standard to `AGENTS.md` as a hard project rule for test creation, deletion, and modification.
- Reworked [Testing Standards](../../../testing-standards.md) from a list of observed cases into a long-term value framework: tests must reduce real product or engineering risk, choose the right layer for that risk, and treat low-value examples as signals rather than an exhaustive blacklist.
- Compared aitestkit's testing strategy documentation and incorporated reusable structure into [Testing Standards](../../../testing-standards.md): valuable-test categories, low-value categories with exceptions, existing-test audit outcomes, one-time migration sentinel handling, and minimum requirements before adding tests.
- Referenced aitestkit's new test file placement rules and added an Inquara-specific [Test File Placement](../../../testing-standards.md#test-file-placement) section: default co-location, API/database-backed test harness placement, shared test helper placement, e2e placement, and avoided centralized structures.
- Re-audited current test placement against the new rules:
  - Ordinary web/package helper tests are colocated with the source they protect.
  - `apps/api/src/test/` is the only centralized `test` directory and is justified by the shared API harness and ephemeral database lifecycle.
  - `apps/web/e2e/` contains browser/cross-window coverage only.
  - No broad root-level `tests/`, package-level catch-all `tests/`, or `__tests__` directories are present in project code.
- Re-audited remaining source-scan tests:
  - Kept debug production scans as architecture guardrails, with a future strengthening option to make debug alias configuration more structured.
  - Kept database safety scans as destructive-test guardrails.
  - Kept debug route path scan because it protects the `/debug/*` API boundary alongside behavior tests.
  - Kept the `CanvasNode` schema scan as the explicit first-version data-model boundary against speculative generic node fields.
- Re-audited shallow helper tests and kept them as pure regression rules for known UI/state risks: selection range, selection toolbar position, scroll stickiness, middle-button scroll velocity, root viewport calculation, node resize bounds, debug floating position, and pending mutation acknowledgement.
- Verified after the re-audit: 18 test files and 70 tests passed.

## Remaining Work

No active implementation work remains in this initiative.

## Deferred Work

- Comprehensive frontend component testing strategy.
- Full e2e coverage matrix.
- Visual regression testing.
- Replace selected debug source scans with structured configuration checks if the debug boundary grows enough to justify it.

## Related Documents

- [Architecture](../../../architecture.md)
- [Documentation Standards](../../../documentation-standards.md)
- [Testing Standards](../../../testing-standards.md)

## Archive Criteria

- Low-value tests identified in the audit are removed, rewritten, or explicitly justified.
- Test quality standards are documented in a current long-term doc.
- Any durable testing rules that affect architecture or database safety are reflected in [Architecture](../../../architecture.md).
