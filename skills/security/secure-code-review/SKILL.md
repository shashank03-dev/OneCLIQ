---
name: secure-code-review
description: Review code changes for exploitable security bugs - injection, broken auth and access control, SSRF, XSS, unsafe deserialization, path traversal and secrets. Use when reviewing a pull request or diff for security, hardening an endpoint, or when the user asks "is this safe?".
license: MIT
metadata:
  domain: security
  author: onecliq
  version: "1.0"
---

# Secure code review

Report only issues you can describe as a concrete attack: **who** (attacker position), **what input**, **what happens**. Theoretical lists of best practices waste the reviewer's time.

## Method

1. **Map the trust boundary.** List where untrusted data enters: HTTP params, headers, bodies, files, webhooks, env from users, LLM output, third-party APIs.
2. **Follow each input to a sink.** For every entry point, trace it to dangerous operations (table below). A finding needs a path from source to sink without adequate validation.
3. **Check authorization at every object access**, not just at the route. "Can user A read user B's record by changing the ID?"
4. **Confirm before reporting.** Read the validation helpers; a sanitizer three files away may already handle it.

## Source → sink checklist

| Sink | Bug | Fix |
| --- | --- | --- |
| SQL / NoSQL query strings | Injection | Parameterized queries; never string-concat |
| Shell / `exec` | Command injection | Arg arrays (`execFile`), no shell; allowlist values |
| `fetch(userUrl)` server-side | SSRF to metadata/internal hosts | Allowlist hosts; block private IP ranges after DNS resolution; no redirects to new hosts |
| HTML output, `dangerouslySetInnerHTML`, `v-html` | XSS | Framework escaping; sanitize with DOMPurify if HTML is needed |
| File paths from input | Path traversal | `path.resolve` then check it stays under the base dir |
| `pickle`, `yaml.load`, Java deserialization | RCE | Safe loaders, JSON |
| Redirect targets | Open redirect | Relative paths only, or allowlist |
| Regex on user input | ReDoS | Bounded patterns, input length limits |
| Logs | Secret/PII leak | Redact tokens, passwords, emails |
| LLM prompts with untrusted text | Prompt injection → tool misuse | Treat model output as untrusted; require confirmation for side effects |

## Auth and session

- Passwords hashed with argon2id / bcrypt / scrypt, never plain SHA.
- Session cookies: `HttpOnly`, `Secure`, `SameSite=Lax` or stricter. CSRF protection on cookie-authenticated state changes.
- Tokens compared with constant-time functions; JWTs verify algorithm and expiry.
- Rate limits on login, signup, password reset and anything that costs money.

## Writing the finding

```
[HIGH] SSRF in /api/preview (src/api/preview.ts:42)
Attacker: any unauthenticated user.
Input: POST {"url": "http://169.254.169.254/latest/meta-data/iam/"}
Impact: server fetches cloud metadata and returns credentials in the response.
Fix: resolve the hostname, reject private/link-local ranges, disable redirects.
```

Severity: **critical** (remote code exec, auth bypass, mass data read) → **high** → **medium** → **low**. If nothing exploitable is found, say so plainly.
