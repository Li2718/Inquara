# Testing Standards

> status: active
> purpose: Define when tests in this repository are worth keeping, where source-level guardrail tests are justified, and how database-backed tests stay safe.

## Core Standard

Tests should protect product behavior, data safety, integration contracts, or production guardrails. They should not exist only to prove that a file contains a particular string, CSS class, component name, or documentation phrase.

A useful test usually fails when a user-visible behavior, persistence rule, security boundary, or deployment safety rule is broken. A low-value test usually fails when harmless implementation details are renamed, moved, restyled, or reworded.

## Preferred Test Types

- Pure domain tests for command reducers, range calculations, layout math, and other deterministic logic.
- API and service tests for authentication, ownership checks, persistence, command handling, and AI context construction.
- WebSocket tests for subscription, broadcast, reconnect, and multi-window synchronization behavior.
- Focused frontend tests for interactions that can be tested through public component behavior or extracted pure helpers.
- Playwright smoke tests for critical end-to-end flows that cannot be trusted through unit tests alone.

## Low-Value Tests To Avoid

Do not add tests whose main assertion is any of the following:

- A source file contains a component name, class name, CSS selector, icon string, or exact import text.
- A stylesheet contains a particular color, pixel value, transition, SVG path, or hover rule.
- A documentation file or skill contains a specific sentence or heading.
- A barrel file exports a name, unless the export is a published package contract used outside this monorepo.
- A feature module uses a particular shared component, unless that is an enforced architectural boundary with production risk.
- A thin wrapper or factory copies arguments into an object with the same fields.
- The expected value is just the implementation logic rewritten inline, without naming an independent product rule.
- A mock is the only meaningful dependency, and the test mostly verifies that the mock was called in the shape the test itself arranged.
- A constant or default value exists, without a meaningful failure mode for users or operators.
- The same behavior is already protected by a higher-value API, domain, integration, or e2e test.

These checks make refactoring and UI tuning slower without meaningfully protecting users.

Happy-path tests are not automatically bad, but they are weak when the real risk is authorization failure, invalid input, stale events, ordering, deduplication, persistence, or recovery after errors. For those areas, cover the risky branch or prefer a higher-level boundary test.

## Source-Level Guardrail Tests

Source scanning is allowed only when it protects a hard boundary that is difficult or expensive to verify another way.

Allowed examples:

- Production builds must not include development-only debug modules or debug markers.
- Debug API routes must stay under `/debug/*` and must not be registered in production.
- Destructive database tests must not clean the development database.
- E2E tests must run through the shared ephemeral database wrapper.
- Product modules must not import development-only `.dev` debug modules.

When adding a source-level guardrail, the test name must describe the risk, not the implementation detail. If the same protection can be covered by a behavior test or a focused script, prefer that route.

## Database-Backed Tests

Database-backed tests must follow the architecture rules:

- API, database integration, WebSocket, and Playwright e2e tests that write data must use the shared ephemeral PostgreSQL setup based on `testcontainers`.
- Destructive tests must not default to the development `DATABASE_URL`.
- Direct database cleanup such as `deleteMany()` belongs in the shared test database helper, not individual test files.
- If Docker or `testcontainers` fails, stop and report the blocker instead of replacing it with a simplified local workaround.

## Documentation And Process Checks

Do not write tests that assert documentation wording. Documentation governance should be enforced through review, the project instructions, and initiative status updates.

If a documentation rule needs automation, prefer a small script or checklist that validates a concrete repository invariant, such as broken links or missing required files. Avoid tests that force exact prose.

## Test Review Checklist

Before keeping or adding a test, ask:

- What real bug would this catch?
- Would it still be valid after a reasonable refactor?
- Is it testing behavior, data safety, or a production boundary?
- Is there a cheaper pure function or integration boundary where this can be tested?
- If it reads source text, is that because the risk is genuinely architectural or production-related?
