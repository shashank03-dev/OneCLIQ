---
name: dockerfile-best-practices
description: Write small, fast-building, secure Dockerfiles with multi-stage builds, layer caching, non-root users and pinned base images. Use when containerizing an app, shrinking an image, speeding up docker build, or reviewing a Dockerfile.
license: MIT
metadata:
  domain: devops
  author: onecliq
  version: "1.0"
---

# Dockerfile best practices

## Template (Node; adapt the commands for other stacks)

```dockerfile
# syntax=docker/dockerfile:1
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM deps AS build
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./
USER node
EXPOSE 3000
HEALTHCHECK CMD node -e "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
```

## Rules

1. **Order layers from least to most frequently changed.** Copy lockfiles and install deps before copying source.
2. **Multi-stage builds:** compilers, dev deps and caches stay in build stages; the runtime stage gets only artifacts.
3. **Pin base images** to a version tag (and a digest for production: `node:22-slim@sha256:…`). Never `latest`.
4. **Run as non-root** (`USER node`, or create a user). Don't `chmod 777`.
5. **`.dockerignore`** must exclude `.git`, `node_modules`, build output, `.env*` and test fixtures.
6. **No secrets in layers.** `ARG`/`ENV` values and copied files persist in history. Use `RUN --mount=type=secret`.
7. **One process per container**, exec-form `CMD ["…"]` so signals reach it and it shuts down cleanly.
8. Combine `apt-get update && apt-get install -y --no-install-recommends … && rm -rf /var/lib/apt/lists/*` in one `RUN`.

## Smaller images

`slim` or `distroless` over full images; `alpine` only if you've tested musl compatibility. Check size with `docker image ls` and layers with `docker history` or `dive`.

## Review checklist

- [ ] Base image pinned, non-root user
- [ ] `.dockerignore` present and excludes secrets
- [ ] Dependency layer cached separately from source
- [ ] No build tools in the runtime stage
- [ ] Healthcheck or orchestrator probe defined
- [ ] Scanned (`docker scout cves` or `trivy image`)
