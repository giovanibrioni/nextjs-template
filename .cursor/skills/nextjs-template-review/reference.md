# Review checklist

Architecture rules live in `AGENTS.md`. This file is the extra judgment the scripts do not encode.

## Architecture (`architecture_check.mjs`)

A domain package is any direct child of `src/backend/` other than `core` and `health`.

The script fails when a domain is missing `schema`, `schemas`, `repository`, `service`, `http`, or `errors`; when no route under `src/app/api/v1/<domain>/` imports `@/backend/<domain>/http`; when `src/backend/schema.ts` does not export `@/backend/<domain>/schema`; when `tests/unit/<domain>/` has no `Fake*Repository`; when repository or API integration tests are missing; when `http.ts` skips Zod `.parse` or imports the Drizzle table; when the repository has no interface and `Drizzle*Repository`; when a backend module other than a Drizzle schema file omits `server-only`; when a schema file imports `server-only` or a backend module that is not another schema; when `src/frontend` and `src/backend` import each other; when `src/proxy.ts` imports the backend; when a `page.tsx` imports the backend; when a `route.ts` is more than a re-export; when `"use server"`, `console.log`, `NEXT_PUBLIC_`, frontend `process.env`, or the OpenTelemetry logs API appears; or when `.commit(`, `.rollback(`, or `.transaction(` appears outside `src/backend/core/database.ts`.

If `src/frontend/<domain>` exists, the script also fails when no page imports that folder, when `tests/frontend/<domain>/` has no test, or when that test does not mention `fetch`.

Still judge by hand:

- A browser action stays page → `fetch("/api/v1/...")` → route re-export → handler → `runInTransaction` → service → repository.
- The repository exposes an interface plus a Drizzle class. The fake implements that interface.
- Domain failures subclass `AppError`. HTTP status is chosen in `toErrorResponse`.
- Services do not open transactions or commit.
- Frontend request and response types live in `src/frontend/<domain>/api.ts`.
- `src/app` holds no business rules.

## Orphans (`orphan_check.mjs`)

Fails when a `src` module is never imported from `src/` or `tests/`, including `@/` aliases, relative imports, re-exports, and `import()`. Next.js entrypoints are exempt: `src/proxy.ts`, `src/instrumentation.ts`, `src/backend/schema.ts`, and `src/app` files named `page`, `layout`, `template`, `loading`, `error`, `not-found`, `default`, `global-error`, or `route`. `.d.ts` files are skipped.

Fails when an `AppError` subclass is not named in `src/backend/core/errors.ts`.

Bugbot covers unused classes inside modules that are imported.

## Consistency (Bugbot, step 2)

No script covers these. Flag them when the diff introduces them:

- Race: check-then-act (read, then insert or update without a unique constraint or row lock) and lost updates on the same row.
- Dual write: one operation writes to the database and to a second store or external call, with no fallback, outbox, or compensation.
- Retry: a retry around a create or other non-idempotent write that has no idempotency key.

A unique constraint that closes an insert race still belongs in the merge-risk index check.

## Env (`env_example_check.mjs`)

Every key of `settingsSchema` in `src/backend/core/config.ts` must have a key in `.env.example`.

## Merge risk (`merge_risk_check.mjs`)

Scope is the diff from the merge-base with `main` or `master` through the working tree, plus untracked files. With no commits, the scope is untracked files.

| Signal | Script | Reviewer |
| --- | --- | --- |
| A changed `drizzle/*.sql` file contains `DROP`, `RENAME`, `TRUNCATE`, or `ALTER COLUMN` | FAIL | Call out lock risk, data loss, and expand/contract |
| A Drizzle `schema.ts` changed and no `drizzle/*.sql` file changed | FAIL | Schema drift |
| `schemas.ts`, `http.ts`, `src/frontend/<domain>/api.ts`, or `src/app/api/**/route.ts` changed | WARN | Removed fields, new required fields, path or status changes, renamed JSON keys |
| `repository.ts` or a Drizzle `schema.ts` changed | WARN | New filters or foreign keys without an index in the migration |
| `src/backend/core/config.ts` changed | WARN | New setting missing from deploy env, not only `.env.example` |
| path contains `events/` or ends with `events.ts` | WARN | Payload and consumer compatibility |

Breaking API examples: deleting a response field, changing a path, making an optional request field required, changing a documented status code. Adding an optional response field is compatible.

Index examples: a new `WHERE` column, a new foreign key, or a new `ORDER BY` on a large table without an index in the Drizzle table or the migration.
