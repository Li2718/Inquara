# CI Pipeline

> status: active
> purpose: Bring the aitestkit-style CI workflow to the GitHub-hosted Inquara repository.

## Goal

Move Inquara back to GitHub hosting at `https://github.com/Li2718/Inquara` and add a durable CI pipeline based on the aitestkit workflow shape.

Success means CI runs automatically for pushes to `main` and pull requests, with separate quality and test jobs that are meaningful for Inquara rather than a superficial copied workflow.

## Boundary

### Included

- Use GitHub Actions as the CI runner target.
- Use the aitestkit CI structure as the baseline:
  - quality job for lint and typecheck
  - full test job for the repository test suite
- Add or adapt Inquara scripts required by the workflow.
- Add any required generated-client setup, such as Prisma generation.
- Make CI compatible with Inquara's testcontainers-based database test rules.
- Keep workflow behavior aligned with `docs/testing-standards.md`.
- Document any CI prerequisites that cannot be encoded directly in the workflow.

### Not Included

- Gitea Actions support.
- Deployment, release, or production hosting automation.
- OAuth, redemption-code feature work, or unrelated product changes.
- Replacing testcontainers with a simplified database workaround.
- Adding low-value tests only to satisfy CI coverage optics.

## Working Rule

This initiative README is the source of truth for live task status. When audit, discussion, design, or implementation changes the task list, update the progress sections before continuing implementation.

## Baseline From aitestkit

The aitestkit workflow runs two jobs on `push` to `main` and on `pull_request`:

- `quality`: checkout, setup Node 20 with npm cache, `npm ci`, `npm run lint`, `npm run typecheck`
- `full-tests`: checkout, setup Node 20 with npm cache, `npm ci`, `npm test`

Inquara should keep this shape unless a repository-specific requirement makes a direct step invalid.

## Known Obstacles

- Inquara does not currently have a root `lint` script or ESLint configuration.
- Inquara does not currently have a root `typecheck` script.
- `apps/web` does not currently expose a dedicated `typecheck` script.
- Existing typecheck debt may need to be fixed before the quality job can pass.
- A clean CI install likely needs `npm run db:generate` before typecheck or tests because Inquara uses Prisma.
- Database-backed tests require Docker/testcontainers support in the CI environment.
- The CI Node version must be chosen deliberately. aitestkit uses Node 20, while local development has recently used Node 24.

## Completed Work

- Created the CI Pipeline initiative.
- Decided to use GitHub hosting instead of the previous local Gitea repository.
- Pointed the local `origin` remote at `https://github.com/Li2718/Inquara.git`.
- Recorded the aitestkit CI baseline and Inquara-specific obstacles.
- Added a GitHub Actions workflow at `.github/workflows/ci.yml` with separate quality and full-test jobs.
- Set the repository Node engine policy to `>=20.9.0` and configured CI to run on Node 20.
- Added root `lint`, `lint:fix`, and `typecheck` scripts.
- Added workspace `typecheck` scripts for API, web, config, db, and domain packages.
- Added ESLint flat config and lint dependencies.
- Added Prisma client generation as an explicit CI setup step before quality and test jobs.
- Fixed typecheck debt in Playwright e2e helpers and workspace/domain test fixtures.
- Fixed lint debt in realtime tests and unused imports.
- Verified `npm run lint`.
- Verified `npm run typecheck`.
- Verified `npm test`.

## Remaining Work

- Push to GitHub and confirm the workflow runs there.
- Decide whether to archive this initiative after the GitHub workflow passes.

## Local Verification Notes

- `npm run db:generate` failed locally while the development server was running because Prisma could not rename the generated Windows query engine DLL. The CI workflow still runs `npm run db:generate` explicitly because GitHub Actions uses a clean install without a long-running local dev server holding that file.
- The full test suite passed locally with testcontainers-backed PostgreSQL.

## Deferred Work

- Deployment CI/CD.
- Release automation.
- Coverage reporting.
- Branch protection rules.
- CI for browser e2e tests unless this initiative later explicitly expands to include it.

## Related Documents

- [Testing Standards](../../testing-standards.md)
- [Architecture](../../architecture.md)
- [Documentation Standards](../../documentation-standards.md)

## Archive Criteria

- The repository remote points to the GitHub repository.
- GitHub Actions CI exists and runs on pushes to `main` and pull requests.
- CI includes a quality job and a full test job following the aitestkit baseline shape.
- Inquara-specific prerequisites such as Prisma generation and testcontainers are handled intentionally.
- The CI workflow passes on GitHub.
- Any durable CI or testing rules discovered during implementation are reflected in current documentation.
