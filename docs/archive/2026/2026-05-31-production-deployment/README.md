# Production Deployment

> status: archived
> purpose: Design and implement Inquara's first self-managed production deployment baseline.

## Goal

Create a complete Docker-driven production deployment baseline for Inquara. A fresh deployment should be able to start infrastructure, apply database migrations, serve setup mode when initialization is incomplete, restart into normal mode after setup, and run the product web/API services without relying on a manual production start command.

## Boundary

### Included

- Add Docker packaging for the deployable Inquara services.
- Add a root `docker-compose.yml` baseline for a single-machine self-managed deployment.
- The root `docker-compose.yml` must start the complete production baseline, not only infrastructure.
- Add a one-shot database migration service that runs before long-lived application services.
- Use `scripts/web-start.mjs` as the web container entrypoint so setup mode and normal web mode are selected at process startup.
- Configure restart behavior so the setup app can exit after completion and the web container can restart into normal mode.
- Include the standalone API service in the deployment topology.
- Define required runtime environment variables for web, API, database, auth, and provider integration.
- Add deployment commands that wrap Docker Compose operations.
- Update current deployment documentation after the deployment shape is implemented.
- Add verification for the Compose file and production packaging where practical.

### Not Included

- Kubernetes, systemd, PM2, or managed cloud deployment.
- Production backup and restore automation.
- Full observability, alerting, or log aggregation.
- Multi-host scaling.
- TLS certificate automation or reverse-proxy hardening.
- Secret manager integration.

## Working Rule

This initiative README is the source of truth for live task status. When audit, discussion, design, or implementation changes the task list, update the progress sections before continuing implementation.

## Reference From aitestkit

AITestKit's current production baseline uses:

- a Dockerfile for the web runtime
- a Compose file that starts infrastructure and application services
- a one-shot `migrate` service
- long-running services with Docker restart policies
- a web container entrypoint that chooses setup mode or normal mode
- root scripts such as `staging:up`, `staging:down`, and `staging:logs`

The important deployment idea is that production is started through Docker Compose. The web startup script is an internal container entrypoint, not a root-level manual production start command.

## Inquara-Specific Design Direction

- Inquara has separate `@inquara/web` and `@inquara/api` services, so the Compose topology must include both instead of copying AITestKit's single web/API process shape.
- The web service owns setup mode because the setup UI is served from `scripts/setup-server.mjs`.
- The API service should start only after the database is healthy and migrations have completed.
- The web service should start after migrations have completed and should point browser-facing API/WebSocket origins at the deployed API endpoint.
- Prisma migrations should run through a dedicated one-shot service before normal application services.
- The root `docker-compose.yml` is the final production Compose entrypoint and should start all required production services.
- The root project should expose Docker Compose lifecycle commands that use `docker-compose.yml`, not manual production `next start` or API start commands.
- Local development remains `npm run dev` and should not be coupled to production Docker startup.

## Open Questions

- Whether this initiative should add an end-to-end Docker smoke script, or keep verification as documented manual commands for now.

## Completed Work

- Created the Production Deployment initiative.
- Reviewed AITestKit's Docker Compose deployment model, Dockerfiles, setup restart flow, and deployment documentation.
- Confirmed that Inquara should keep `scripts/web-start.mjs` as an internal container entrypoint rather than exposing a root-level production start command.
- Audited Inquara's current package scripts, workspace scripts, environment variables, and startup scripts.
- Chose separate API and Web Dockerfiles because Inquara has separate Fastify and Next.js runtimes.
- Added root `docker-compose.yml` as the production Compose entrypoint.
- Added production services for `postgres`, `migrate`, `api`, and `web`.
- Added Docker restart behavior for long-running services and health checks for API and Web.
- Added a normal Next.js `/api/health` route so web health checks work after setup exits.
- Added root production Compose lifecycle scripts.
- Updated deployment documentation for the implemented Docker Compose baseline.
- Fixed the debug-free verifier to scan real debug UI markers instead of failing on safe production module paths under `src/debug`.
- Built the production Docker images successfully.
- Verified production Compose startup through fresh setup mode.
- Verified setup completion restarts the web service into normal Next.js mode.
- Stopped the smoke-test production stack and removed the temporary production database volume.
- Verified `typecheck`, `lint`, targeted startup/debug tests, and the full test suite.

## Remaining Work

- None.

## Deferred Work

- Backup and restore automation.
- Reverse proxy and TLS automation.
- Deployment health dashboards.
- Secret manager integration.
- Hosted database or object storage variants.
- Multi-node deployment.

## Related Documents

- [Deployment](../../../deployment.md)
- [Architecture](../../../architecture.md)
- [Setup](../2026-05-31-setup/README.md)

## Archive Criteria

- A fresh self-managed deployment can be started through Docker Compose.
- Database migrations run before long-lived application services.
- Setup mode works in the deployed web container before initialization.
- Setup completion exits setup mode and the web container restarts into normal mode.
- Normal web and API services run from the Compose baseline.
- Current deployment documentation reflects the implemented deployment contract.
- Relevant verification commands pass.
