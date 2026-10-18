---
name: safe-database-migrations
description: Write schema migrations that deploy without downtime or data loss - expand/contract, backfills, index creation and rollbacks for Postgres and MySQL. Use when adding, renaming or dropping columns or tables, adding indexes or constraints, or reviewing a migration before it runs in production.
license: MIT
metadata:
  domain: backend
  author: onecliq
  version: "1.0"
---

# Safe database migrations

Assume old and new application code run at the same time during a deploy. Every migration must work with both.

## Expand → migrate → contract

Never rename or change a column in one step. Instead:

1. **Expand:** add the new column/table (nullable, no default rewrite). Deploy.
2. **Dual-write:** app writes to old and new. Deploy.
3. **Backfill:** copy old → new in batches. Verify counts match.
4. **Switch reads** to the new column. Deploy.
5. **Contract:** stop writing the old column, then drop it in a later release.

## Postgres specifics

| Operation | Safe way |
| --- | --- |
| Add column | `ADD COLUMN x type NULL` (a constant default is fine on PG 11+) |
| Add NOT NULL | Add `CHECK (x IS NOT NULL) NOT VALID`, `VALIDATE CONSTRAINT`, then `SET NOT NULL` |
| Add index | `CREATE INDEX CONCURRENTLY` (outside a transaction) |
| Add foreign key | `ADD CONSTRAINT … NOT VALID`, then `VALIDATE CONSTRAINT` |
| Change type | New column + backfill (expand/contract). In-place type changes rewrite the table. |
| Drop column | Remove from code first, deploy, then drop |

Always set `SET lock_timeout = '5s';` at the top so a blocked migration fails instead of queueing every query behind it.

## Backfills

- Batch by primary key (`WHERE id > $last ORDER BY id LIMIT 1000`), commit each batch, sleep briefly.
- Make it resumable and idempotent (`WHERE new_col IS NULL`).
- Run it as a job, not inside the migration transaction.

## Before you merge

- [ ] Works while the previous app version is still serving traffic
- [ ] No full-table rewrite or long lock on a large table
- [ ] Indexes created concurrently
- [ ] Down migration exists, or the PR says why it's irreversible
- [ ] Tested against a copy of production-sized data, or the row count is known to be small
- [ ] Destructive steps (drop, truncate) are in their own, later migration

If a migration is unavoidably risky, say so in the PR and propose a maintenance window rather than hoping.
