# Testing Standards

> status: active
> purpose: Define when tests in this repository are worth keeping, where source-level guardrail tests are justified, and how database-backed tests stay safe.

## Core Standard

Tests should reduce real product or engineering risk. A test is valuable when it would make a future change safer by catching a failure that matters.

A useful test has an independent reason to exist. It states a behavior, invariant, contract, or safety boundary that should remain true even if the implementation is refactored.

A low-value test mostly describes how the current code happens to be written. It fails on harmless rewrites but does not reliably catch user-visible regressions, data loss, security problems, integration breaks, or deployment risks.

## Value Test

Before adding or keeping a test, answer these questions:

1. What failure would this catch?
2. Who would be affected by that failure: user, operator, developer, or production deploy?
3. Would the test still be meaningful after a reasonable implementation refactor?
4. Is this the cheapest layer that can catch the failure without coupling to incidental details?
5. Does another higher-value test already cover the same risk?

If the answers are unclear, do not add the test yet. Clarify the risk first.

## What To Test

Prefer tests for durable risks. A valuable test asserts an observable contract, not an implementation coincidence.

### Product Rules

Test product rules where different inputs, permissions, states, or edge cases produce meaningfully different user or system outcomes.

Examples:

- Workspace ownership and access.
- Node visibility, deletion, restoration, and scroll state.
- Branch creation from selected source text.
- Password/session behavior that changes account access.

### Execution Contracts

Test execution paths that coordinate multiple steps and can fail by being wired incorrectly.

Examples:

- Workspace lease takeover, stale rejection, and streamed reply delivery.
- AI streaming, partial output persistence, and failure handling.
- Reconnect or stale-event handling.
- Provider request/response normalization.

### Persistence Invariants

Test data rules where a failure would cause wrong reads, wrong writes, duplicate records, data loss, leakage, or migration breakage.

Examples:

- Ownership filters.
- Soft deletion and recovery.
- Workspace version updates.
- Database-backed command services.
- Migration-backed schema boundaries.

Database-backed automated tests must use an ephemeral disposable database environment.

### User-Visible Regressions

Use browser or focused frontend tests for behavior that cannot be trusted through API tests alone.

Examples:

- Real DOM selection and source range mapping.
- Pointer, scroll, focus, and viewport behavior.
- Critical smoke paths that cross the app as a user would.

Do not use fragile tests for pure visual tuning, incidental layout details, or framework default behavior.

### Architecture Boundaries

Architecture boundary tests may exist, but they must be rare and explicit.

Examples:

- Debug code cannot enter production product surfaces.
- Debug API routes stay under `/debug/*` and are not registered in production.
- Database-backed tests cannot touch the development database.
- Development-only modules cannot be imported from product modules.

The test name must describe the long-term boundary it protects. Source scanning is the last resort; prefer behavior tests, structured exports, route enumeration, schema queries, or focused verification scripts when practical.

Do not test implementation trivia unless it is the actual contract.

## Preferred Test Types

- Pure domain tests for deterministic rules where the inputs and outputs express product behavior.
- API and service tests for authentication, ownership checks, persistence, command handling, and AI context construction.
- Lease and HTTP route tests for takeover, stale rejection, recovery, ordering, and streamed reply behavior.
- Focused frontend tests for interaction logic that is hard to trust through API tests alone.
- Playwright smoke tests for critical end-to-end flows that depend on real browser behavior.

Choose the layer by risk:

- Use the lowest layer when the rule is pure and stable.
- Use an integration boundary when the risk is in wiring, persistence, authorization, serialization, or transport.
- Use browser/e2e coverage when the risk is in real DOM selection, pointer behavior, scrolling, focus, layout, or multi-window behavior.
- Avoid low-level tests that only duplicate a stronger boundary test.

## Test File Placement

Inquara uses "tests follow the code under test" as the default. Do not create a broad root-level `tests/` directory for ordinary unit tests.

### Default Co-Location

Pure unit tests and focused helper tests should live beside the source file or inside the same feature/component directory.

Current examples:

- `packages/domain/src/reducer.test.ts`
- `apps/web/src/features/node-chat/sourceRange.test.ts`
- `apps/web/src/features/canvas/rootNodeFocus.test.ts`
- `apps/web/src/debug/debugPosition.test.ts`

Rules:

- Keep tests close enough that a reader can immediately identify the behavior they protect.
- Do not move ordinary unit tests into a distant central directory just to make the tree look tidy.
- If a test targets a private page/component submodule, keep it inside that same private area.
- Existing `*.test.ts` names are allowed. For new tests where the level would otherwise be ambiguous, prefer a level suffix such as `.unit.test.ts` or `.integration.test.ts`.

### API And Database-Backed Tests

Database-backed API/service/lease/streaming tests may live in `apps/api/src/test/` because they share the API test harness and ephemeral database lifecycle.

Current examples:

- `apps/api/src/test/app.test.ts`
- `apps/api/src/test/canvas.test.ts`
- `apps/api/src/test/messages.test.ts`
- `apps/api/src/test/workspace-http.test.ts`

Rules:

- Keep shared API test helpers in `apps/api/src/test/` only when they are genuinely shared by multiple API tests.
- Do not place web unit tests, product UI tests, or package-level domain tests in `apps/api/src/test/`.
- If an API test becomes a pure unit test that does not need the API harness, colocate it with the module it tests instead.

### Shared Test Helpers

`testing/` or `test/` helper directories are for shared test infrastructure, fixtures, factories, fake providers, and disposable environment setup.

Rules:

- A helper should be promoted into a shared test helper only after more than one test file needs it, or when it owns infrastructure such as testcontainers, server lifecycle, or artifact cleanup.
- Single-test fixtures should stay inside the test file or next to that test.
- Tests inside a shared helper directory should test the helper or fixture behavior itself, not unrelated product behavior.

### E2E And Cross-Boundary Tests

Browser e2e tests belong under `apps/web/e2e/`.

Current example:

- `apps/web/e2e/multi-window-sync.spec.ts`

Rules:

- E2E tests should cover real browser flows, cross-window behavior, or cross-process orchestration.
- They must use the repository e2e wrapper when database writes are involved so every process shares the disposable test database.
- Do not put ordinary unit or service tests in `apps/web/e2e/`.

### Avoided Structures

Do not introduce these by default:

- A root-level `tests/` directory for all unit tests.
- Package-level `tests/` directories for tests that can be colocated with source.
- `__tests__` directories unless a toolchain or third-party convention requires them.
- Centralized directories that separate tests from the behavior they protect without a cross-boundary reason.

## Low-Value Signals

A test is suspect when its main value comes from one of these patterns:

- It tests language, framework, runtime, or test-library basics.
- It asserts names, strings, selectors, styling details, file structure, or import shape rather than behavior.
- It proves that a wrapper, factory, adapter, or passthrough copied arguments into a similarly shaped object.
- It repeats the implementation algorithm inside the expected value.
- It mocks away the only meaningful dependency and then mainly verifies the mock interaction.
- It checks constants, defaults, generated boilerplate, or old code absence without a meaningful ongoing failure mode.
- It covers only the happy path while the real risk is rejection, ordering, persistence, stale state, deduplication, or recovery.
- It duplicates a stronger test at an API, domain, integration, or e2e boundary.
- It makes a harmless refactor expensive while providing little confidence about product behavior.

These are signals, not a complete list. New low-value patterns should be judged by the value test above, not by whether they appear in this list.

Exceptions require an explicit contract. For example, a file path, export, class name, or passthrough shape can be tested only when it is a public API, build contract, architecture boundary, or security boundary.

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

- API, database integration, lease/streaming route, and Playwright e2e tests that write data must use the shared ephemeral PostgreSQL setup based on `testcontainers`.
- Destructive tests must not default to the local development database URL from `.env.dev` or any developer-local env file.
- Direct database cleanup such as `deleteMany()` belongs in the shared test database helper, not individual test files.
- If Docker or `testcontainers` fails, stop and report the blocker instead of replacing it with a simplified local workaround.

## Documentation And Process Checks

Do not write tests that assert documentation wording. Documentation governance should be enforced through review, the project instructions, and initiative status updates.

If a documentation rule needs automation, prefer a small script or checklist that validates a concrete repository invariant, such as broken links or missing required files. Avoid tests that force exact prose.

## Existing Test Audit

When reviewing an existing test, classify it into exactly one outcome:

- `Keep`: the contract is valid, the risk is real, and the maintenance cost is acceptable.
- `Strengthen`: the risk is real, but the assertions are too weak, too happy-path-only, or too coupled to implementation details.
- `Merge`: the risk is real, but another test covers the same contract at a better layer.
- `Move`: the test is at the wrong layer, such as a unit test trying to prove a database or browser contract.
- `Delete`: the test has no durable contract, is too low-risk, duplicates stronger coverage, or only served as a one-time migration check.

Do not keep a test merely because it already exists. Do not delete a test merely because it is small. The deciding factor is whether it protects a meaningful contract at an appropriate cost.

One-time migration sentinels should not become permanent tests. If an old structure returning would now break a real product boundary, rewrite the test as a current behavior, schema, or integration contract. If it only proves old code is gone, delete it after the migration is complete.

## Adding Tests

Before adding a test, state:

- The behavior contract or safety boundary it protects.
- Why that contract is worth automated protection.
- Why this is the right test layer.
- Whether it duplicates existing coverage.
- For database-backed tests, how it uses the disposable test database flow.

Test names should describe behavior or risk, not implementation steps.

Prefer:

- `rejects workspace access without a valid session`
- `persists partial assistant output when the provider fails`
- `keeps the root node centered in the usable canvas area`

Avoid:

- `works`
- `returns true`
- `calls helper`
- `matches snapshot`

## Test Review Checklist

Before keeping or adding a test, ask:

- What real bug would this catch?
- Would it still be valid after a reasonable refactor?
- Is it testing behavior, data safety, or a production boundary?
- Is there a cheaper pure function or integration boundary where this can be tested?
- If it reads source text, is that because the risk is genuinely architectural or production-related?
