# Development Environment

> status: archived
> purpose: Align Inquara's local development startup with the Docker-backed infrastructure orchestration pattern used by AITestKit.

## Goal

Make `npm run dev` prepare local development infrastructure before starting Inquara's local app processes. Development infrastructure should be Docker-managed, while web and API dev servers should continue running as local Node processes for fast feedback and normal framework hot reload behavior.

## Boundary

### Included

- Add a dedicated development Compose file for local infrastructure.
- Start local PostgreSQL through Docker Compose when needed.
- Wait until PostgreSQL is healthy before starting app processes.
- Apply existing development database migrations during infrastructure bootstrap with a non-interactive migration command.
- Start `@inquara/api` and `@inquara/web` as detached local Node processes.
- Store local dev process PID files and logs under `.local/dev/`.
- Add commands for starting/stopping infrastructure and app processes separately.

### Not Included

- Running web or API development servers inside Docker.
- Adding production Docker packaging.
- Adding Redis, MinIO, worker, or scheduler services before the product needs them.

## Working Rule

This initiative README is the source of truth for live task status. When audit, discussion, design, or implementation changes the task list, update the progress sections before continuing implementation.

## Reference From AITestKit

AITestKit's local development environment uses Docker Compose for infrastructure and local Node processes for the application. Its `npm run dev` command:

- checks the development Compose file
- starts infrastructure services
- waits for health checks
- applies migrations
- starts app services as detached local processes
- records PID files and logs under a local runtime directory

## Inquara-Specific Design Direction

- The current infrastructure set is only PostgreSQL.
- The local app process set is `api` and `web`.
- `dev:api` and `dev:web` remain available for direct focused development.
- The orchestrated `npm run dev` command is the default full local startup path.

## Completed Work

- Created the Development Environment initiative.
- Added `docker-compose.dev.yml` and `docker-compose.dev.example.yml` for PostgreSQL development infrastructure.
- Added dev environment orchestration scripts based on AITestKit's structure.
- Added root scripts for `dev:infra:up`, `dev:infra:down`, `dev:start`, and `dev:stop`.
- Added a non-interactive `db:migrate:deploy` command for orchestration startup.
- Added `.local/` to `.gitignore`.
- Added helper tests for the dev environment planning and parsing logic.
- Fixed local health checks to use loopback for `localhost` on Windows.
- Fixed failed app startup cleanup so a timed-out service does not leave a stale child process behind.
- Verified `docker compose -f docker-compose.dev.yml config`.
- Verified `dev:infra:up`, `dev:start`, and `dev:stop`.
- Verified stopping all development services and restarting them through `npm run dev`.
- Verified the targeted dev environment tests, `typecheck`, and `lint`.

## Remaining Work

- None.

## Deferred Work

- Production Compose implementation.
- Redis or object storage infrastructure.
- Worker or scheduler development processes.

## Related Documents

- [Architecture](../../../architecture.md)
- [Deployment](../../../deployment.md)

## Archive Criteria

- `npm run dev` can bootstrap local PostgreSQL and start the local API/web development servers.
- App process logs and PID files are written under `.local/dev/`.
- `dev:stop` stops local app processes without stopping infrastructure.
- `dev:infra:down` stops Docker-managed development infrastructure.
- Relevant verification commands pass.
