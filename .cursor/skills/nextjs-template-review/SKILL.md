---
name: nextjs-template-review
description: >-
  Reviews this Next.js template against AGENTS.md: architecture checks,
  orphan modules, hidden bugs, security, and merge risk for APIs, migrations,
  indexes, and env vars. Use when the user asks for a code review, merge review,
  or nextjs-template-review on this repository.
disable-model-invocation: true
---

# Next.js template review

Review only. Do not edit code unless the user asks for fixes.

Read [reference.md](reference.md) before judging findings. Scripts are Node stdlib only; execute them, do not reimplement them.

## Workflow

```
- [ ] 1. Architecture and lint
- [ ] 2. Bugs, orphans, ghost code
- [ ] 3. Security
- [ ] 4. Merge risk
- [ ] 5. Report
```

Diff scope: `branch changes` unless the user asks to review only uncommitted work. There is no commit yet when `git rev-parse HEAD` fails; the merge-risk script then uses untracked files.

### 1. Architecture and lint

Run, and keep going if a command fails:

```bash
make lint
make review
```

`make review` runs `scripts/architecture_check.mjs`, `scripts/orphan_check.mjs`, `scripts/env_example_check.mjs`, and `scripts/merge_risk_check.mjs`. Treat each `FAIL` line as a blocker. Save `WARN` and `INFO` lines for step 4.

### 2. Bugs, orphans, ghost code

Launch exactly one `bugbot` subagent (`run_in_background: false`, description `Bugbot`). It computes the diff. Prompt:

```text
Full Repository Path: <absolute repository path>
Diff: <branch changes | uncommitted changes>
Custom Instructions: Hidden bugs, unused classes, and ghost code in this Next.js domain template. commit/rollback belong only in runInTransaction. Services raise AppError subclasses; handlers return Zod schemas. Frontend talks to the backend only with fetch("/api/v1/..."). Do not merge src/frontend and src/backend. Flag logic bugs and dead classes the deterministic scripts would miss. Flag race conditions: check-then-act and lost updates. Flag a dual write with no fallback, outbox, or compensation. Flag a retry around a non-idempotent write.
```

Add `Base Branch:` only when the review must compare against a branch other than the repository default.

If the subagent cannot compute the diff, retry once with `Diff: natural language` and a per-file change description. Do not retry a second time.

The orphan script already fails on unimported `src` modules and on `AppError` subclasses missing from `src/backend/core/errors.ts`. Do not repeat those hits unless Bugbot adds impact.

### 3. Security

Launch exactly one `security-review` subagent (`run_in_background: false`, description `Security Review`). Prompt:

```text
Full Repository Path: <absolute repository path>
Diff: <branch changes | uncommitted changes>
Custom Instructions: This app has no authentication in the template. Review injection, secret logging, unsafe SQL outside repositories, and settings that accept URLs. Backend uses the logger from src/backend/core/logging.ts; no console.log; no OpenTelemetry logs API. Frontend must not read server environment variables. No NEXT_PUBLIC_ variables. No Server Actions.
```

Use the same diff scope as step 2. Retry once on invocation or subagent failure. Do not invent a natural-language fallback; this subagent only accepts `branch changes` or `uncommitted changes`.

### 4. Merge risk

Use the `merge_risk_check.mjs` output plus the checklist in [reference.md](reference.md). Read changed handlers, Zod schemas, Drizzle schema files, migrations, and `src/backend/core/config.ts`.

This repository has no domain event bus. If the script prints `INFO no domain event contract in this diff`, say that events are not in scope. If it warns on an `events` path, review payload compatibility.

`WARN` lines are findings, not script failures. A new SQL migration is the upgrade path, so `DROP`, `RENAME`, `TRUNCATE`, and `ALTER COLUMN` in that file are blockers.

### 5. Report

Use this template. Sort findings by severity. Omit empty sections.

```markdown
# Review

## Blockers
| Severity | Location | Finding |
| --- | --- | --- |
| high | file:line | ... |

## Warnings
| Severity | Location | Finding |
| --- | --- | --- |
| medium | file:line | ... |

## Script summary
- lint: pass/fail
- architecture: pass/fail
- orphans: pass/fail
- env: pass/fail
- merge-risk: pass/fail (N warnings)

## Not in scope
- Events: no domain event contract / reviewed <paths>
```

Severity: `high` for bugs, security issues, breaking API changes, and destructive migration SQL. `medium` for missing indexes, missing env documentation, and architecture drift. `low` for ghost code with no caller.

Do not fix findings or rerun the review unless the user asks.
