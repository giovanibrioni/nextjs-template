# Example report

```markdown
# Review

## Blockers
| Severity | Location | Finding |
| --- | --- | --- |
| high | drizzle/0001_drop_owner.sql:4 | migration SQL drops column "owner_email" with no expand/contract |
| high | src/backend/items/service.ts:22 | create reads by name then inserts, with no unique constraint |
| high | src/backend/items/service.ts:30 | writes the row and publishes an event with no outbox or compensation |
| high | src/backend/items/service.ts:18 | retries create, and the insert has no idempotency key |

## Warnings
| Severity | Location | Finding |
| --- | --- | --- |
| medium | src/backend/items/repository.ts:40 | new filter on owner_id has no index in the migration |
| medium | src/backend/core/config.ts:18 | REDIS_URL is not listed in .env.example |

## Script summary
- lint: pass
- architecture: pass
- orphans: pass
- env: fail
- merge-risk: fail (2 warnings)

## Not in scope
- Events: no domain event contract
```
