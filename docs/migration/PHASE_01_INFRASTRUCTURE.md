# PHASE 01 — Infrastructure: Node.js 24 LTS

## Goal

Upgrade the Node.js runtime from 22.12.0 to 24 LTS across all Dockerfiles, compose files, and project configuration. Remove the `--legacy-peer-deps` violation from the Dockerfile. Establish `.nvmrc` and `engines` field for local development consistency.

## Documentation References

| Source | URL |
|---|---|
| Node.js release schedule / LTS status | https://nodejs.org/en/about/previous-releases |
| Node.js v24 API Docs | Context7 `/websites/nodejs_latest-v24_x_api` |
| Node.js ESM Enabling Guide | https://nodejs.org/docs/latest-v24.x/api/esm.html |
| Node.js TypeScript Support | https://nodejs.org/docs/latest-v24.x/api/typescript.html |
| Alpine Linux Docker Hub | https://hub.docker.com/_/node |

## In Scope

- Replace all `node:22.12.0-alpine3.19` base images with `node:24-alpine`
- Remove `--legacy-peer-deps` from Dockerfile `npm ci` command
- Create `Web/.nvmrc` with `24`
- Add `engines` field to `Web/package.json`
- Update migrator service image in `docker-compose.yml`
- Verify `npm ci` succeeds without `--legacy-peer-deps` at the current dependency versions; if it does not, stop the phase and document the exact package-level resolution needed

## Out of Scope

- No package version changes (those belong to later phases)
- No ESM conversion (Phase 02)
- No framework or library upgrades
- No changes to application code
- No changes to security middleware, CSP, CORS, or auth token handling

## Preconditions

- Current build passes: `cd Web && npm run build` succeeds on Node.js 22
- Docker build succeeds: `docker compose build` from `Web/`
- All tests pass: `cd Web && npm run test`
- Git is on a clean branch: `git checkout -b migration/phase-01-infrastructure`

## Files Allowed To Change

| File | Change |
|---|---|
| `Web/Dockerfile` | Update base images, remove `--legacy-peer-deps` |
| `Web/docker-compose.yml` | Update migrator image |
| `Web/docker-compose.coolify.yml` | Update alpine images for cron services (if needed) |
| `Web/.nvmrc` | **New file** — pin Node.js 24 |
| `Web/package.json` | Add `engines` field |

## Files Forbidden To Change

- `Web/src/**` — No application code
- `Web/prisma/**` — No schema changes
- `Web/next.config.js` — No framework config
- `Web/tailwind.config.js` — No style config
- `Web/src/middleware.ts` — No security changes
- Any file not listed in "Files Allowed To Change"

## Exact Package Changes

No package version changes in this phase. The `engines` field is added to `package.json` only.

## Required Code Changes

### 1. Create `Web/.nvmrc`

```
24
```

### 2. Add `engines` to `Web/package.json`

Add after the `"private": true` line:

```json
"engines": {
  "node": ">=24.0.0",
  "npm": ">=10.0.0"
},
```

### 3. Update `Web/Dockerfile`

Replace all three occurrences of:

```dockerfile
FROM node:22.12.0-alpine3.19
```

With:

```dockerfile
FROM node:24-alpine
```

**Line 14** — Remove `--legacy-peer-deps`:

```dockerfile
# Before
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps

# After
RUN --mount=type=cache,target=/root/.npm \
    npm ci
```

**Important:** If `npm ci` fails without `--legacy-peer-deps`, do NOT re-add it. Instead, identify the conflicting peer dependencies and resolve them properly. If the conflict requires changing planned package versions, stop the phase, update the relevant later phase document with an explicit versioned resolution, and only then proceed.

**Line 61** — Update Prisma client copy path (this will change in Phase 02 but update now for consistency):

```dockerfile
# Before
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# After (keep as-is for now; Phase 02 will update the generated output path)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
```

### 4. Update `Web/docker-compose.yml`

**Line 88** — Migrator service:

```yaml
# Before
image: node:22.12.0-alpine3.19

# After
image: node:24-alpine
```

### 5. Verify alpine images in compose files

The following services use `alpine:3.19` and are NOT Node.js images — they should be updated to `alpine:3.22` (latest stable) for security patches:

In `docker-compose.yml`:
- `permissions-fixer` (line 73): `alpine:3.19` → `alpine:3.22`
- `reminder-cron` (line 188): `alpine:3.19` → `alpine:3.22`
- `feedback-queue-cron` (line 211): `alpine:3.19` → `alpine:3.22`

In `docker-compose.coolify.yml`:
- `permissions-fixer` (line 91): `alpine:3.19` → `alpine:3.22`
- `reminder-cron` (line 196): `alpine:3.19` → `alpine:3.22`
- `feedback-queue-cron` (line 226): `alpine:3.19` → `alpine:3.22`

## Validation Commands

```bash
# Local Node.js version check (if using nvm)
cd Web && nvm use
node --version  # Expect: v24.x.x

# Install deps without --legacy-peer-deps
npm ci

# Type check
npx tsc --noEmit

# Build
npm run build

# Lint
npm run lint

# Tests
npm run test

# Docker build (from Web/ directory)
docker compose build

# Docker build (Coolify variant)
docker compose -f docker-compose.coolify.yml build

# Verify no --legacy-peer-deps remains
grep -r "legacy-peer-deps" Dockerfile docker-compose*.yml
# Expected: no output
```

## Expected Failures And How To Fix Them

### 1. `npm ci` fails with peer dependency conflicts

**Symptom:** `ERESOLVE overriding peer dependency` errors during `npm ci`.

**Fix:** Identify the conflicting packages. Common culprits:
- `@auth/prisma-adapter` or another auth-related dependency may require a coordinated version change with Phase 02 or Phase 03 — document the exact package and version constraint before changing anything.
- If only minor conflicts exist, update the specific package to a compatible version within this phase and document the change.

**Decision rule:** If the conflict is caused by a package that Phase 02 or Phase 03 will replace anyway, this phase is **blocked** until the later phase document is updated with an explicit compatible version plan. Do not bypass the conflict with `--legacy-peer-deps`.

### 2. Node.js 24 breaking change causes test failures

**Symptom:** Tests fail with errors related to module resolution or native modules.

**Fix:** Node.js 24 has improved ESM detection (per Context7 docs: it now tries CommonJS first, then retries as ESM if parser finds ES module syntax). This should be backward-compatible for CommonJS code. If failures occur:
- Check if any native modules need rebuilding
- Check `node --experimental-vm-modules` flag for Jest if using ESM

### 3. Alpine image missing shared libraries

**Symptom:** `Error: shared library not found` at runtime.

**Fix:** The Dockerfile already includes `libc6-compat openssl` in `apk add`. Node.js 24 alpine may require additional packages. Add them to the `apk add` command:
```dockerfile
RUN apk add --no-cache libc6-compat openssl
```

## Rollback Plan

1. `git revert` the phase-01 commit on main.
2. All changes are in infrastructure files only — no database or application code was modified.
3. Docker images will rebuild from the previous Dockerfile on next deploy.
4. No data migration involved — rollback is instant.

## Approval Gate

Before merging, verify:

- [ ] `node --version` returns v24.x.x locally
- [ ] `npm ci` succeeds without `--legacy-peer-deps`
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] `docker compose build` succeeds
- [ ] No `--legacy-peer-deps` in Dockerfile
- [ ] `.nvmrc` contains `24`
- [ ] `package.json` has `engines` field
- [ ] All alpine service images updated to 3.22
- [ ] No application code was modified

## Commit Message

```
migration(phase-01): upgrade Node.js 22→24 LTS, remove --legacy-peer-deps, add .nvmrc and engines
```
