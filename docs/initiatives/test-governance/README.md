# Test Governance

> status: active
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

This initiative README is the source of truth for live task status. When audit, discussion, design, or implementation changes the task list, update the progress sections before continuing implementation.

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
- Added the current long-term testing standard at [Testing Standards](../../testing-standards.md).
- Registered the testing standard in [Documentation Standards](../../documentation-standards.md).
- Linked the architecture testing strategy to the durable testing standard.
- Audited the remaining source-level tests and kept only boundary guardrails:
  - `apps/web/src/debug/debugProductionScan.test.ts` protects production debug pruning and global debug architecture.
  - `apps/api/src/debug/routes.test.ts` protects `/debug/*` route naming and production registration behavior.
  - `apps/api/src/test/testDatabaseSafety.test.ts` protects ephemeral test database usage.
  - `packages/db/src/schema.test.ts` protects the first-version canvas node data-model boundary against speculative generic node fields.
- Verified the cleaned Vitest suite: 19 test files and 74 tests passed.

## Remaining Work

- Review the first cleanup pass and decide whether to archive this initiative or keep it open for a later frontend component testing pass.

## Deferred Work

- Comprehensive frontend component testing strategy.
- Full e2e coverage matrix.
- Visual regression testing.

## Related Documents

- [Architecture](../../architecture.md)
- [Documentation Standards](../../documentation-standards.md)
- [Testing Standards](../../testing-standards.md)

## Archive Criteria

- Low-value tests identified in the audit are removed, rewritten, or explicitly justified.
- Test quality standards are documented in a current long-term doc.
- Any durable testing rules that affect architecture or database safety are reflected in [Architecture](../../architecture.md).
