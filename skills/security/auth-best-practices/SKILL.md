---
name: auth-best-practices
description: Implement authentication and authorization safely - password storage, sessions vs JWTs, OAuth/OIDC, MFA, password reset, rate limiting and per-object access checks. Use when adding login, signup, sessions, API tokens, roles or permissions, integrating an auth provider (Clerk, Auth.js, Better Auth, Supabase Auth), or reviewing auth code.
license: MIT
metadata:
  domain: security
  author: onecliq
  version: "1.0"
  inspired-by: "better-auth/skills (better-auth-best-practices, email-and-password-best-practices), clerk/skills, OWASP ASVS"
---

# Auth best practices

**Prefer a maintained auth library or provider** over hand-rolling. Your job is then to configure it correctly and get authorization right.

## Authentication

- **Passwords:** argon2id (or bcrypt cost ≥ 12, scrypt). Minimum length 8+ (prefer 12+), allow long passphrases, check against breached-password lists, no composition rules or forced rotation.
- **Login errors** never reveal whether the email exists ("Email or password is incorrect"). Same for reset and signup flows where possible.
- **Rate limit** login, signup, reset and MFA endpoints per account and per IP; add backoff or CAPTCHA after repeated failures.
- **MFA:** offer TOTP or passkeys (WebAuthn); SMS only as a fallback. Require re-authentication for sensitive actions (change email/password, delete account).
- **Password reset:** single-use, random (≥ 128-bit) token stored hashed, expires in ≤ 1 hour, invalidated after use and after password change; invalidate existing sessions on reset.
- **Email verification** before granting anything that trusts the email.

## Sessions and tokens

- Browser apps: server-side sessions in an `HttpOnly; Secure; SameSite=Lax` cookie. Rotate the session ID on login and privilege change. Idle and absolute timeouts.
- CSRF protection for cookie-authenticated state changes (SameSite plus a token or origin check).
- JWTs: short-lived access tokens (≤ 15 min) + rotating refresh tokens; verify signature, `alg` allowlist, `exp`, `iss`, `aud`. Don't put secrets or PII in the payload. Plan for revocation.
- API keys: random, shown once, stored hashed, scoped, expirable, prefixed for secret scanning.

## OAuth / OIDC

- Authorization code flow with PKCE; validate `state` and `nonce`; exact-match redirect URIs.
- Link accounts by verified email only, and confirm with the user.

## Authorization (where most real bugs are)

- Check permissions **on the server, on every request, for the specific object**: "can this user act on *this* invoice?", not just "is logged in".
- Deny by default; centralise checks in one policy layer rather than scattering `if (user.role === …)`.
- Multi-tenant: every query filters by tenant; consider row-level security as a backstop.
- Never trust IDs, roles or prices sent by the client.

## Test

Write tests for: wrong password, locked account, expired/reused reset token, session after logout, user A accessing user B's object (IDOR), role escalation, CSRF on a state-changing route.
