---
name: observability-instrumentation
description: Instrument services so production problems can be found fast - structured logs, metrics (RED/USE), distributed traces with OpenTelemetry, error tracking and actionable alerts. Use when adding logging or monitoring, debugging a production issue with no visibility, setting up Sentry or OpenTelemetry, or defining SLOs and alerts.
license: MIT
metadata:
  domain: devops
  author: onecliq
  version: "1.0"
  inspired-by: "addyosmani/agent-skills (observability-and-instrumentation), microsoft/azure-skills (appinsights-instrumentation), sentry/dev"
---

# Observability and instrumentation

Aim: for any user complaint, answer "what happened to *this* request?" and "is it happening to others?" within minutes.

## Logs: structured, contextual, quiet

- JSON logs with consistent fields: `timestamp`, `level`, `message`, `service`, `env`, `trace_id`, `request_id`, `user_id` (or a hash), plus event-specific fields.
- Log **events**, not narratives: `{"msg":"payment.failed","provider":"stripe","code":"card_declined","amount_cents":1200}`.
- Levels: `error` = needs attention, `warn` = degraded but handled, `info` = business events, `debug` off in production.
- Never log secrets, tokens, passwords, full card numbers or raw request bodies with PII. Redact centrally.

## Metrics

- Every service: **RED**: request **R**ate, **E**rrors, **D**uration (p50/p95/p99), per route.
- Every resource (DB, queue, cache): **USE**: **U**tilization, **S**aturation (queue depth, pool waits), **E**rrors.
- Business metrics too: signups, payments, jobs processed.
- Keep label cardinality low: route templates (`/users/:id`), never raw IDs or emails as labels.

## Traces

- Use OpenTelemetry auto-instrumentation for HTTP, DB and queue clients; add manual spans around expensive business steps.
- Propagate context (W3C `traceparent`) across services and into background jobs.
- Put the `trace_id` in logs and error reports so you can jump between them.

## Errors

- An error tracker (Sentry or similar) with release and environment tags and source maps uploaded.
- Capture unhandled exceptions and rejected promises; add user/request context, not PII.
- Group noise: ignore expected errors (404s, validation) at the source.

## Alerts

- Alert on **symptoms users feel** (error rate, latency SLO burn, queue age), not on every cause (CPU 80%).
- Every alert has an owner, a runbook link and a clear action. If nobody acts on an alert, delete it.
- Define SLOs (e.g. 99.9% of checkout requests succeed in < 1 s over 30 days) and alert on burn rate.

## Done when

You can take one failing request ID and find its logs, its trace, the error report and the dashboard showing whether it's isolated, in under five minutes.
