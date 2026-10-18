---
name: rest-api-design
description: Design or review HTTP/REST endpoints - resource naming, status codes, errors, pagination, versioning, validation and idempotency. Use when adding an API route, writing an OpenAPI spec, or reviewing an API for consistency.
license: MIT
metadata:
  domain: backend
  author: onecliq
  version: "1.0"
---

# REST API design

Consistency beats cleverness. Before adding an endpoint, read two existing ones in the codebase and match their style.

## Shape

- **Resources are nouns, plural:** `GET /projects`, `GET /projects/{id}`, `POST /projects/{id}/members`. Actions that aren't CRUD get a sub-resource: `POST /invoices/{id}/send`.
- **Methods:** `GET` reads (never changes state), `POST` creates or runs an action, `PUT` replaces, `PATCH` partially updates, `DELETE` removes.
- **Casing:** pick one for JSON fields (`camelCase` or `snake_case`) and never mix.
- **Nest at most one level.** `/orgs/{org}/projects` is fine; deeper paths become filters (`/tasks?project=…`).

## Status codes

| Code | When |
| --- | --- |
| 200 / 201 / 204 | OK / created (with `Location` header) / no body |
| 400 | Malformed request or failed validation |
| 401 / 403 | Not authenticated / authenticated but not allowed |
| 404 | Not found, or hidden because the caller can't see it |
| 409 | Conflict (duplicate, version mismatch) |
| 422 | Valid JSON but semantically wrong (if the codebase uses it) |
| 429 | Rate limited, with `Retry-After` |
| 5xx | Server's fault. Never return 500 for bad input. |

## Errors

One error shape everywhere, machine-readable code plus human message:

```json
{ "error": { "code": "INVALID_URL", "message": "Paste a github.com link.", "field": "url" } }
```

Never leak stack traces, SQL or internal hostnames in errors.

## Input and output

- Validate every input at the edge with a schema (zod, pydantic, etc.). Reject unknown fields on writes.
- Set limits: body size, string lengths, array lengths, page size (default 20, max 100).
- **Pagination:** cursor-based (`?cursor=…&limit=…` returning `nextCursor`) for feeds; offset only for small, stable lists.
- **Timestamps:** ISO 8601 in UTC. **Money:** integer minor units plus currency.
- **Idempotency:** accept an `Idempotency-Key` header on `POST`s that create money-moving or external side effects.

## Evolution

- Additive changes (new optional field, new endpoint) are safe. Removing or renaming fields, or changing types, is breaking: version (`/v2`) or add-then-deprecate.
- Document every endpoint with an example request and response.

## Review checklist

- [ ] Auth checked on every route, including object-level ownership
- [ ] Input validated and size-limited
- [ ] Errors use the shared shape and correct status
- [ ] List endpoints paginate
- [ ] Rate limits on expensive or public routes
- [ ] Tests cover success, validation failure, auth failure and not-found
