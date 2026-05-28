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

## Remaining Work

- Audit current tests and classify low-value tests, especially source-level structure tests that assert incidental implementation or documentation strings.
- Remove or rewrite tests that do not protect meaningful behavior.
- Define test quality standards in a durable current doc.
- Decide where source-level safety tests remain justified, such as production guardrails, debug-free checks, database safety, or architectural boundaries.
- Verify the cleaned test suite still covers critical product and infrastructure risks.

## Deferred Work

- Comprehensive frontend component testing strategy.
- Full e2e coverage matrix.
- Visual regression testing.

## Related Documents

- [Architecture](../../architecture.md)
- [Documentation Standards](../../documentation-standards.md)

## Archive Criteria

- Low-value tests identified in the audit are removed, rewritten, or explicitly justified.
- Test quality standards are documented in a current long-term doc.
- Any durable testing rules that affect architecture or database safety are reflected in [Architecture](../../architecture.md).
