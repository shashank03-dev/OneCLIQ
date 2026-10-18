---
name: postgres-best-practices
description: Design Postgres schemas and write queries that stay fast and correct - data types, constraints, indexes, EXPLAIN ANALYZE, N+1 queries, connection pooling, transactions and row-level security. Use when designing tables, a query is slow, adding indexes, reviewing SQL or ORM code (Prisma, Drizzle, SQLAlchemy), or setting up Postgres on Supabase or Neon.
license: MIT
metadata:
  domain: backend
  author: onecliq
  version: "1.0"
  inspired-by: "supabase/agent-skills (supabase-postgres-best-practices), neondatabase/agent-skills (neon-postgres), prisma/skills"
---

# Postgres best practices

## Schema

- Primary keys: `bigint generated always as identity`, or `uuid` (v7 for insert locality) when IDs are public or generated client-side.
- Types: `timestamptz` (never `timestamp`), `text` over `varchar(n)` unless the limit is a rule, `numeric` for money (or integer cents), `jsonb` only for truly schemaless data.
- Constraints are free correctness: `NOT NULL` by default, `UNIQUE`, `CHECK`, foreign keys with an explicit `ON DELETE`.
- Name things consistently: `snake_case`, plural tables, `<table>_id` foreign keys.
- Changing schema in production: see safe-database-migrations.

## Indexes

- Index every foreign key you join or filter on (Postgres doesn't do it automatically).
- Composite index column order: equality columns first, then range/sort columns. `(tenant_id, created_at DESC)` serves `WHERE tenant_id = $1 ORDER BY created_at DESC`.
- Partial indexes for hot subsets: `WHERE deleted_at IS NULL`.
- Unused indexes cost writes: check `pg_stat_user_indexes` (`idx_scan = 0`).

## Slow query workflow

1. Find it: `pg_stat_statements` ordered by `total_exec_time`.
2. `EXPLAIN (ANALYZE, BUFFERS)` with realistic parameters.
3. Look for: sequential scans on large tables, estimated vs actual rows off by 10×+ (run `ANALYZE`), nested loops over many rows, sorts spilling to disk.
4. Fix with an index, a rewritten query, or less data (select only needed columns, paginate with keyset `WHERE id > $last`, not large `OFFSET`).

## Application side

- **N+1:** one query per row in a loop. Batch with `WHERE id = ANY($1)` or the ORM's include/join.
- Parameterized queries only.
- Keep transactions short; never wait on HTTP inside one. Use `SELECT … FOR UPDATE SKIP LOCKED` for job queues.
- **Connection pooling:** serverless and many app instances need a pooler (PgBouncer, Supabase/Neon pooled URLs) in transaction mode; avoid session features (prepared statements, `SET`) unless supported.
- Set `statement_timeout` and `idle_in_transaction_session_timeout`.

## Security

- App connects as a least-privilege role, not the owner/superuser.
- Exposed directly to clients (Supabase, PostgREST)? Enable **row-level security** on every table and write policies; test them as each role.
- Never build SQL from user strings; never store secrets in plain columns.

## Review checklist

- [ ] Constraints express the business rules
- [ ] Every filter/join column used in hot paths is indexed
- [ ] No N+1 in new code paths
- [ ] Large lists paginate with keyset pagination
- [ ] RLS enabled where clients can reach the DB
