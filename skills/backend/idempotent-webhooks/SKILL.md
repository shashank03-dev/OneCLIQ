---
name: idempotent-webhooks
description: Build webhook receivers that verify signatures, deduplicate retries, and never double-process an event (Stripe, GitHub, Slack, etc.). Use when implementing or debugging a webhook endpoint, or any handler that external systems retry.
license: MIT
metadata:
  domain: backend
  author: onecliq
  version: "1.0"
---

# Idempotent webhooks

Providers deliver **at least once**, out of order, and retry on any non-2xx or timeout. Design for duplicates from the start.

## The receiver, step by step

1. **Read the raw body** before any JSON parsing. Signature checks run on exact bytes.
2. **Verify the signature** with the provider's secret using a constant-time compare (`crypto.timingSafeEqual`). Reject with 400/401 if missing or wrong.
3. **Check the timestamp** (if provided). Reject events older than ~5 minutes to block replays.
4. **Deduplicate:** insert the event ID into a `processed_events` table with a unique constraint. If the insert conflicts, return 200 immediately: it's a retry.
5. **Enqueue, then acknowledge.** Put the work on a queue and return 2xx within a few seconds. Do slow work in a worker.
6. **Process idempotently** in the worker: use upserts, compare-and-set on status, or check "already done" before side effects.

```ts
// Express-style sketch
app.post("/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  const event = verify(req.body, req.header("stripe-signature"), SECRET); // throws on bad sig
  const fresh = await db.query(
    "INSERT INTO processed_events (id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING id",
    [event.id],
  );
  if (fresh.rowCount === 0) return res.sendStatus(200); // duplicate
  await queue.add("stripe-event", event);
  res.sendStatus(200);
});
```

## Ordering

Don't trust arrival order. Store the provider's `created` timestamp or object version and ignore events older than what you've already applied, or re-fetch the object from the provider's API and use its current state.

## Pitfalls

- A body-parser middleware that runs first breaks signature verification.
- Returning 500 for a business-rule failure causes endless retries: return 200 and record the failure.
- Logging full payloads can leak PII and secrets: log the event ID and type.
- Secrets per environment: test-mode and live-mode secrets differ.

## Testing

Use the provider's CLI to send real signed events (`stripe trigger`, `gh webhook forward`). Test: valid event, bad signature, duplicate delivery, out-of-order delivery, and worker crash mid-processing.
