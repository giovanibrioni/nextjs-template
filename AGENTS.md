# AGENTS.md

Guidance for working in this repository.

## What this repository is

This is a full-stack Next.js template. The example domain is `items`: create, list, and fetch by id, plus a page that does those actions in the browser.

This cut does not include authentication, CORS, a queue, an OpenTelemetry collector, Server Actions, or a shared types package. Traces stay in process unless `OTEL_EXPORTER_OTLP_ENDPOINT` is set.

The app runs on the host with Node.js and pnpm. Postgres runs in Docker.

## Frontend and backend

These are two contexts. Do not merge them.

### Backend

`src/backend` is server code. Every module there imports `server-only`, except the Drizzle schema files. `src/backend/schema.ts` and `src/backend/**/schema.ts` are loaded by drizzle-kit, which does not run inside Next.js, so they must not import `server-only` or any other backend module.

The backend owns the database, transactions, SQL, Zod response schemas, domain errors, and logs. It may import other backend modules. It must not import `src/frontend`.

### Frontend

`src/frontend` is the UI. It talks to the backend only with `fetch("/api/v1/...")`. Request and response types live next to that fetch, in `src/frontend/<domain>/api.ts`. Do not import `src/backend` from the frontend, including Zod schemas.

The frontend must not read server environment variables. This template has no `NEXT_PUBLIC_` variables.

### Shell

`src/app` is the Next.js shell. A `page.tsx` imports a frontend component. A `route.ts` re-exports a backend handler. Do not put business rules in `src/app`.

`src/proxy.ts` sets `x-request-id` and must not import `src/backend`. Next.js 16 names this file proxy; it is the request shell and runs before the route. `src/instrumentation.ts` starts tracing and may import backend telemetry.

Do not add Server Actions (`"use server"`). The HTTP boundary is `src/app/api`.

## Layout and request flow

```text
src/app/                    # pages and route files only
src/proxy.ts                # x-request-id, no backend imports
src/instrumentation.ts      # tracing startup
src/backend/core/           # settings, transaction, logging, traces, errors
src/backend/health/         # GET /api/v1/health
src/backend/items/          # example domain
src/backend/schema.ts       # drizzle-kit barrel
src/frontend/items/         # example UI
drizzle/                    # SQL migrations
tests/unit/                 # fakes, no database
tests/frontend/             # component tests, fetch mocked
tests/integration/          # Postgres, transaction rollback
```

A browser action moves in one direction:

1. The page renders a frontend component.
2. The component calls `fetch("/api/v1/...")`.
3. The route file re-exports the backend handler.
4. The handler translates HTTP and opens `runInTransaction`.
5. The service applies the rule and raises a domain error when needed.
6. The repository runs SQL with the transaction it was given.

## New domain checklist

1. Add `schema`, `schemas`, `repository` (an interface plus a Drizzle implementation), `service`, `http`, and `errors` under `src/backend/<domain>`.
2. Re-export the handlers from `src/app/api/v1/<domain>/route.ts`.
3. Export the Drizzle table from `src/backend/schema.ts`.
4. Add a migration.
5. Add a branch in `toErrorResponse` for each new `AppError` subclass. Match `error.name`.
6. Add a unit test whose fake implements the repository interface.
7. Add an integration test for the repository and one for the API.
8. If the domain has a screen, add `src/frontend/<domain>`, a page that imports only that folder, and a component test that mocks `fetch`.

## Transactions

`commit` and `rollback` belong only in `runInTransaction`. Repositories and services do not touch the transaction boundary.

Integration tests replace the runner with `useTransactionRunner`. The handler's transaction uses the test client, which is already inside `BEGIN`, and the test rolls it back.

## Schemas and errors

Zod schemas are separate from Drizzle tables. Handlers return the Zod schema output. They do not return the driver row.

A domain failure is its own exception subclass of `AppError`. `toErrorResponse` in `src/backend/core/errors.ts` chooses the HTTP status. `ItemNotFoundError` becomes `404 {"detail":"Item not found"}`.

## Logging

Use the logger from `src/backend/core/logging.ts`. Do not use `console.log`. Do not log secrets. Do not call the OpenTelemetry logs API. The app only emits traces, and the logger adds `trace_id` and `span_id` when the current span is recording.

The frontend does not log request data. Show failures in the page.

## Tests

- `make test-unit` runs `tests/unit` and `tests/frontend`. It does not need Docker.
- `make test` needs `make up`. It migrates `app_test` and runs the full suite.
- A fake lives next to the unit test and implements the repository interface.
- Integration tests use the fixture in `tests/integration/database.ts`.

## Make targets

| Target | Purpose |
| --- | --- |
| `make help` | List targets |
| `make install` | `pnpm install` |
| `make up` | Start Postgres and create `app_test` if needed |
| `make down` | Stop Postgres |
| `make dev` | App on http://127.0.0.1:3000 |
| `make migrate` | `drizzle-kit migrate` |
| `make revision msg="..."` | Generate a migration |
| `make test-unit` | Unit and component tests |
| `make test` | Migrate `app_test` and run Vitest |
| `make lint` | Biome and `tsc --noEmit` |
| `make review` | Architecture, orphan, env, and merge-risk checks |

## Adapting this template

When cloning into another project:

- Change `name` and `description` in `package.json`.
- Change `APP_NAME` and `OTEL_SERVICE_NAME`.
- Change `POSTGRES_DB`, and the database user and password if you want different credentials.
- Change the named volume in `docker-compose.yml`.
- Delete the `items` domain, `src/frontend/items`, and the items page once they are no longer the example.

Do not merge `src/frontend` and `src/backend`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
