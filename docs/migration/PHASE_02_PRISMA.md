# PHASE 02 — Prisma: 5 → 7 (ESM, Driver Adapters, Config Overhaul)

## Goal

Upgrade Prisma from v5.10 to v7.x. This is the most invasive phase because Prisma 7 is ESM-only and requires: `"type": "module"` in package.json, driver adapters for all databases, a new `prisma.config.ts` configuration file, updated generator syntax, and changed import paths. All CommonJS config files must be converted to ESM.

## Documentation References

| Source | Context7 ID / URL |
|---|---|
| Prisma 7 README (generator, adapter, imports) | Context7 `/prisma/prisma/7.5.0` |
| Prisma v7 Upgrade Guide (ESM, config, removed features) | Context7 `/llmstxt/prisma_io_llms_txt` — query `prisma-upgrade-v7` |
| Prisma 7 prisma.config.ts setup | Context7 `/llmstxt/prisma_io_llms_txt` — query `prisma.config.ts` |
| Prisma 7 Breaking Changes (engine, url removed) | Context7 `/llmstxt/prisma_io_llms_txt` — query `Prisma ORM 7 Breaking Changes` |
| Node.js ESM module resolution | Context7 `/websites/nodejs_latest-v24_x_api` |
| Node.js TypeScript + ESM | https://nodejs.org/docs/latest-v24.x/api/typescript.html |

## In Scope

- Upgrade `prisma` and `@prisma/client` from `^5.10.0` to `^7.x`
- Upgrade TypeScript from `^5.3.0` to `^5.9.0` in the same phase so Prisma 7's minimum TypeScript requirement is satisfied
- Add `@prisma/adapter-pg` and `pg` packages for PostgreSQL driver adapter
- Add `dotenv` package for `prisma.config.ts` environment loading
- Add `"type": "module"` to `Web/package.json`
- Create `Web/prisma.config.ts` with `defineConfig()` and `dotenv/config`
- Update `prisma/schema.prisma`: generator provider, add `output`, remove datasource `url`
- Update all 43 files importing from `@prisma/client` to use new generated output path
- Update `Web/src/lib/db.ts` to instantiate PrismaClient with driver adapter
- Convert CommonJS config files to ESM:
  - `next.config.js` → `next.config.mjs` (or `.ts` if Next.js 15 supports it, but this phase stays on Next.js 14)
  - `postcss.config.js` → `postcss.config.mjs`
  - `jest.config.js` → `jest.config.mjs` (or `.ts` with `ts-jest`)
- Update `@auth/prisma-adapter` to a published version whose peer dependencies explicitly support Prisma 7
- Update Dockerfile for new Prisma client output path

## Out of Scope

- No Next.js or React version changes (Phase 03)
- No next-auth version changes (Phase 03)
- No Tailwind changes (Phase 04)
- No changes to security middleware logic, CSP, CORS, or rate limiting
- No database schema changes (models, indexes remain the same)

## Preconditions

- Phase 01 completed and merged (Node.js 24 runtime)
- Current build passes on Node.js 24: `cd Web && npm run build`
- Database backup taken: `pg_dump` or equivalent before any migration
- Git on clean branch: `git checkout -b migration/phase-02-prisma`

## Files Allowed To Change

| File | Change Type |
|---|---|
| `Web/package.json` | Add `type: "module"`, update Prisma packages, add new packages |
| `Web/package-lock.json` | Lock file update for Prisma, adapter, and TypeScript changes |
| `Web/prisma/schema.prisma` | Generator block, datasource block |
| `Web/prisma.config.ts` | **New file** — Prisma 7 configuration |
| `Web/src/lib/db.ts` | Driver adapter initialization |
| `Web/next.config.js` → `Web/next.config.mjs` | ESM conversion |
| `Web/postcss.config.js` → `Web/postcss.config.mjs` | ESM conversion |
| `Web/jest.config.js` → `Web/jest.config.mjs` | ESM conversion |
| `Web/src/lib/strava/oauth.ts` | Update `@auth/prisma-adapter` import if needed |
| All 43 files importing `@prisma/client` | Update import paths |
| `Web/Dockerfile` | Update Prisma client copy path |
| `Web/tsconfig.json` | Preserve strict mode and update TS baseline requirements if needed for Prisma 7 |
| `Web/.eslintrc.json` | No change needed (JSON files are module-system agnostic) |

### Complete list of files importing `@prisma/client` (43 files)

**Core lib files:**
- `src/lib/db.ts` — `PrismaClient`
- `src/lib/types.ts` — `ActivityType`
- `src/lib/types/health.ts` — `Prisma`
- `src/lib/types/mobile.ts` — `ActivityType, RaceType, WorkoutType, PlanPhase`
- `src/lib/validation/schemas.ts` — `RaceType`
- `src/lib/validation/schemas.test.ts` — `RaceType`
- `src/lib/strava/persistence.ts` — `ActivityType`
- `src/lib/plans/index.ts` — `WorkoutType, RaceType`
- `src/lib/errors/handler.ts` — `Prisma`
- `src/lib/errors/__tests__/handler.test.ts` — `Prisma`
- `src/lib/metrics/fitnessCache.ts` — `Activity`
- `src/lib/health/dailyHealth.ts` — `Prisma, PrismaClient`
- `src/lib/analytics/zones.ts` — `Activity`
- `src/lib/analytics/__tests__/zones.test.ts` — `Activity`
- `src/lib/auth/tokens.ts` — `AuthCodeType`
- `src/lib/auth/__tests__/tokens.test.ts` — `AuthCodeType`

**API routes:**
- `src/app/api/workouts/[id]/route.ts` — `WorkoutType`
- `src/app/api/workouts/route.ts` — `WorkoutType`
- `src/app/api/v1/workouts/[id]/route.ts` — `WorkoutType`
- `src/app/api/v1/workouts/route.ts` — `WorkoutType`
- `src/app/api/v1/goals/route.ts` — `RaceType, WorkoutType`
- `src/app/api/v1/activities/route.ts` — `ActivityType`
- `src/app/api/settings/update-vdot/route.ts` — `WorkoutType`
- `src/app/api/mobile/v1/activities/route.ts` — `ActivityType`
- `src/app/api/health/nutrition/search-fs/route.ts` — `Prisma`
- `src/app/api/health/nutrition/search-off/route.ts` — `Prisma`
- `src/app/api/external/v1/activities/route.ts` — `ActivityType`
- `src/app/api/goals/route.ts` — `RaceType, WorkoutType`
- `src/app/api/auth/reset-password/route.ts` — `AuthCodeType`
- `src/app/api/auth/register/route.ts` — `AuthCodeType`
- `src/app/api/auth/verify-email/route.ts` — `AuthCodeType`
- `src/app/api/auth/forgot-password/route.ts` — `AuthCodeType`
- `src/app/api/admin/users/[id]/reset-password/route.ts` — `AuthCodeType`
- `src/app/api/activities/route.ts` — `ActivityType`

**Components:**
- `src/components/views/HealthView.tsx` — `Prisma`

**Scripts (root level):**
- `test-ai.ts` — `PrismaClient`
- `scripts/check-ai-usage.ts` — `PrismaClient`
- `fix-user-settings.ts` — `PrismaClient`
- `dump_db.ts` — `PrismaClient`
- `check-user-settings.ts` — `PrismaClient`
- `check_db_max.ts` — `PrismaClient`
- `benchmark.ts` — `PrismaClient, ActivityType`

## Files Forbidden To Change

- `Web/src/middleware.ts` — Security middleware (no changes to CSP, CORS, rate limiting)
- `Web/prisma/migrations/**` — Do not modify existing migrations
- `Web/src/lib/auth/auth-email.ts` — Password verification logic
- `Web/src/lib/crypto.ts` — Encryption logic
- `Web/src/lib/rateLimit.ts` — Rate limiting logic
- Any file not listed in "Files Allowed To Change"

## Exact Package Changes

### `Web/package.json` — dependencies

| Package | Current | Target | Notes |
|---|---|---|---|
| `@prisma/client` | `^5.10.0` | `^7.5.0` | Major version upgrade |
| `@prisma/adapter-pg` | (new) | `^7.5.0` | PostgreSQL driver adapter for Prisma 7 |
| `@auth/prisma-adapter` | `^2.11.1` | Latest published release validated against Prisma 7 in this repo | Published peerDependencies may lag Prisma 7; require official docs plus local validation |
| `pg` | (new) | `^8.16.0` | PostgreSQL driver for adapter |
| `dotenv` | (new) | `^16.6.1` | Required for prisma.config.ts env loading |

### `Web/package.json` — devDependencies

| Package | Current | Target | Notes |
|---|---|---|---|
| `prisma` | `^5.10.0` | `^7.5.0` | Major version upgrade |
| `@types/pg` | (new) | `^8.15.0` | TypeScript types for pg |
| `typescript` | `^5.3.0` | `^5.9.0` | Prisma 7 requires a newer TS baseline; move this upgrade into Phase 02 |

### `Web/package.json` — top-level additions

```json
{
  "type": "module"
}
```

## Required Code Changes

### 1. Add `"type": "module"` to `Web/package.json`

Add `"type": "module"` as a top-level field:

```json
{
  "name": "runflow",
  "version": "1.2.9",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=24.0.0",
    "npm": ">=10.0.0"
  },
  ...
}
```

### 2. Create `Web/prisma.config.ts`

Per Context7 Prisma 7 docs — this file centralizes CLI configuration and environment variable loading:

```typescript
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  earlyAccess: true,
  schema: "./prisma/schema.prisma",
  migrate: {
    async url() {
      return process.env.DATABASE_URL!;
    },
  },
});
```

**Note:** The `earlyAccess` flag may be required depending on Prisma 7.x version. Check the Prisma 7 docs for the exact API at the time of execution.

### 2a. Upgrade TypeScript in `Web/package.json`

Prisma 7 requires a newer TypeScript baseline than the repo currently has (`Web/package.json` currently pins `^5.3.0`). Upgrade TypeScript in this phase so Phase 02 is independently executable:

```json
"devDependencies": {
  "typescript": "^5.9.0"
}
```

Keep `strict: true` in `Web/tsconfig.json`. Preserve the current `module: "esnext"` and `moduleResolution: "bundler"` settings. Add `target: "ES2023"` only if Prisma 7 tooling requires it in this repository.

### 3. Update `Web/prisma/schema.prisma`

**Generator block (lines 1-4):**

```prisma
# Before
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}

# After
generator client {
  provider      = "prisma-client"
  output        = "../generated/prisma"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}
```

Key changes (from Context7 `/prisma/prisma/7.5.0`):
- `prisma-client-js` → `prisma-client`
- `output` is now **required** (no longer generates to `node_modules/@prisma/client` by default)
- The output path `"../generated/prisma"` resolves to `Web/generated/prisma/`

**Datasource block (lines 6-9):**

```prisma
# Before
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

# After
datasource db {
  provider = "postgresql"
}
```

The `url` property is removed from schema.prisma. Database URL is now managed exclusively in `prisma.config.ts`.

### 4. Update `Web/src/lib/db.ts`

Per Context7 Prisma 7 docs — driver adapter is required for all databases:

```typescript
# Before
import { PrismaClient } from '@prisma/client';

declare global {
    var _prisma: PrismaClient | undefined;
}

function buildDatasourceUrl(): string | undefined {
    const baseUrl = process.env.DATABASE_URL;
    if (!baseUrl) return undefined;
    try {
        const url = new URL(baseUrl);
        url.searchParams.set('connection_limit', '10');
        url.searchParams.set('pool_timeout', '30');
        return url.toString();
    } catch {
        return baseUrl;
    }
}

export const prisma = globalThis._prisma ?? new PrismaClient({
    datasourceUrl: buildDatasourceUrl(),
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

if (process.env.NODE_ENV !== 'production') {
    globalThis._prisma = prisma;
}

export default prisma;
```

```typescript
# After
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

declare global {
    var _prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL environment variable is not set');
    }

    const adapter = new PrismaPg({ connectionString });
    return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
    });
}

export const prisma = globalThis._prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalThis._prisma = prisma;
}

export default prisma;
```

**Key changes:**
- Import from `'../generated/prisma/client'` instead of `'@prisma/client'`
- Use `PrismaPg` driver adapter instead of `datasourceUrl`
- Connection pooling parameters (`connection_limit`, `pool_timeout`) are now handled by the `pg` driver, not via URL params

### 5. Update all 43 files importing from `@prisma/client`

Two types of imports need updating:

**Type A — Enum/type imports** (most files):

```typescript
// Before
import { ActivityType } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

// After
import { ActivityType } from '@/generated/prisma/client';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaClient } from '@/generated/prisma/client';
```

Note: Using the `@/` path alias (defined in tsconfig as `./src/*`) requires the output to be at `src/generated/prisma/client`. **However**, we set output to `"../generated/prisma"` from the prisma directory, which resolves to `Web/generated/prisma/`. The `@/` alias resolves to `Web/src/`, so we need either:

- **Option A:** Set output to `"../src/generated/prisma"` so `@/generated/prisma/client` works
- **Option B:** Use relative paths from each file
- **Option C:** Add a new path alias in tsconfig for the generated client

**Recommended: Option A** — Set output to `"../src/generated/prisma"` in schema.prisma:

```prisma
generator client {
  provider      = "prisma-client"
  output        = "../src/generated/prisma"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}
```

Then all imports become:

```typescript
import { ActivityType } from '@/generated/prisma/client';
```

And `db.ts` becomes:

```typescript
import { PrismaClient } from '@/generated/prisma/client';
```

**Files at Web/ root level** (scripts like `benchmark.ts`, `dump_db.ts`) use relative paths:

```typescript
import { PrismaClient } from './src/generated/prisma/client';
```

### 6. Convert `Web/next.config.js` → `Web/next.config.mjs`

Per Node.js ESM docs (Context7 `/websites/nodejs_latest-v24_x_api`): files with `.js` extension are treated as ESM when `"type": "module"` is set. However, `next.config.js` uses `require()` and `module.exports` which are CommonJS. Convert to ESM:

```javascript
// Before (next.config.js)
const withPWA = require("@ducanh2912/next-pwa").default({...});
const nextConfig = {...};
module.exports = withPWA(nextConfig);

// After (next.config.mjs)
import withPWA from "@ducanh2912/next-pwa";
// ... rest stays the same but using export default
```

**Important:** Rename the file to `.mjs` to make it explicit. Update all `import`/`require` calls to use ESM syntax:

```javascript
import withPWA from "@ducanh2912/next-pwa";

const withPWAConfig = withPWA({
    dest: "public",
    cacheOnFrontEndNav: false,
    aggressiveFrontEndNavCaching: false,
    reloadOnOnline: true,
    swcMinify: true,
    disable: process.env.NODE_ENV === "development",
    extendDefaultRuntimeCaching: true,
    publicExcludes: ['!index.html'],
    fallbacks: {
        document: '/~offline',
    },
    workboxOptions: {
        importScripts: ['/push-sw.js'],
        skipWaiting: true,
        clientsClaim: true,
        disableDevLogs: true,
        runtimeCaching: [
            // ... (all runtime caching entries stay the same)
        ],
    },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    swcMinify: true,
    compress: true,
    experimental: {
        workerThreads: false,
        cpus: 3,
        optimizePackageImports: ['lucide-react', 'date-fns', '@tanstack/react-query']
    },
    images: {
        remotePatterns: [
            // ... (stays the same)
        ],
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    // ... (all security headers stay the same)
                ],
            },
        ];
    },
};

export default withPWAConfig(nextConfig);
```

### 7. Convert `Web/postcss.config.js` → `Web/postcss.config.mjs`

```javascript
// Before (postcss.config.js)
module.exports = {
    plugins: {
        tailwindcss: {},
        autoprefixer: {},
    },
};

// After (postcss.config.mjs)
export default {
    plugins: {
        tailwindcss: {},
        autoprefixer: {},
    },
};
```

### 8. Convert `Web/jest.config.js` → `Web/jest.config.mjs`

```javascript
// Before (jest.config.js)
const nextJest = require('next/jest')
const createJestConfig = nextJest({ dir: './' })
const customJestConfig = {
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testEnvironment: 'jest-environment-jsdom',
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    testPathIgnorePatterns: ['<rootDir>/tests/e2e/'],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },
}
module.exports = createJestConfig(customJestConfig)

// After (jest.config.mjs)
import nextJest from 'next/jest';

const createJestConfig = nextJest({
    dir: './',
});

const customJestConfig = {
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testEnvironment: 'jest-environment-jsdom',
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    testPathIgnorePatterns: ['<rootDir>/tests/e2e/'],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },
};

export default createJestConfig(customJestConfig);
```

### 9. Update `Web/Dockerfile`

**Prisma generate step (line 31):** Stays the same, but the output location changes.

**Runner stage — Prisma client copy (line 61):**

```dockerfile
# Before
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# After
COPY --from=builder /app/src/generated ./src/generated
```

### 10. Verify `@auth/prisma-adapter` compatibility

The current code in `src/lib/strava/oauth.ts` uses:

```typescript
import { PrismaAdapter } from '@auth/prisma-adapter';
```

Check if `@auth/prisma-adapter@^2.11.1` supports Prisma 7. If a newer published version explicitly lists Prisma 7 support, update to it. If peer dependency metadata still lags behind Prisma 7, you may continue with `2.11.1` only when both of these are true:

1. Official Auth.js / Prisma docs still document `PrismaAdapter(prisma)` as the supported integration path.
2. This repository passes `npx tsc --noEmit`, `npm run build`, `npm run lint`, and `npm run test` with Prisma 7 and the adapter in place.

The adapter receives the `prisma` instance (which is already configured with the driver adapter), so compatibility must be proven by repo validation if published peer metadata has not caught up yet.

**Blocking rule:** Do not start this phase if official Auth.js docs no longer recommend `PrismaAdapter(prisma)` for Prisma projects, or if this repository cannot pass validation with Prisma 7 in place. If peer dependency metadata is the only gap, document that explicitly in the phase notes and proceed only after local validation passes.

**Important:** The `as any` cast on `Web/src/lib/strava/oauth.ts:18` must be removed or replaced with a properly typed compatibility approach in this phase. Do not defer it and do not introduce new `any`-typed callback parameters.

## Validation Commands

```bash
cd Web

# Install deps
npm ci

# Generate Prisma client
npx prisma generate

# Verify generated output exists
ls src/generated/prisma/client

# Type check
npx tsc --noEmit

# Build
npm run build

# Lint
npm run lint

# Tests
npm run test

# Verify no old import paths remain
grep -r "from ['\"]@prisma/client['\"]" src/ --include="*.ts" --include="*.tsx"
# Expected: no output (all imports updated)

# Verify no CJS config files remain
ls next.config.js postcss.config.js jest.config.js 2>/dev/null
# Expected: files not found (renamed to .mjs)

# Verify ESM is set
node -e "const p = require('./package.json'); console.log(p.type)"
# Expected: module
```

## Expected Failures And How To Fix Them

### 1. `npx prisma generate` fails — unknown generator provider

**Symptom:** `Error: Unknown generator provider "prisma-client"`.

**Fix:** Ensure `prisma` CLI is at `^7.5.0`. Run `npx prisma --version` to verify. If the old version is cached, run `npm install prisma@latest --save-dev`.

### 2. `@auth/prisma-adapter` incompatible with Prisma 7

**Symptom:** TypeError when PrismaAdapter tries to call PrismaClient methods.

**Fix:** Prefer updating `@auth/prisma-adapter` to a published version whose peerDependencies explicitly include Prisma 7. If metadata still lags, rely on official docs plus full repository validation to prove compatibility. If runtime or type errors remain after validation, this phase is blocked until the migration plan is revised. Do not work around the issue with `any` casts or undocumented adapter shims.

### 3. Jest fails with ESM module resolution

**Symptom:** `Jest encountered an unexpected token` or `Cannot use import statement outside a module`.

**Fix:** Jest has known issues with ESM. Options:
1. Use `--experimental-vm-modules` flag: Update the test script to `node --experimental-vm-modules node_modules/.bin/jest`
2. Ensure `next/jest` handles the transform correctly (it should, since it uses SWC)
3. If persistent, convert `jest.config.mjs` back to `jest.config.ts` with `ts-jest` handling

### 4. `next.config.mjs` fails — `@ducanh2912/next-pwa` not ESM-compatible

**Symptom:** `Error: require() of ES Module` when loading next-pwa.

**Fix:** The PWA library may not support ESM imports. Options:
1. Check if `@ducanh2912/next-pwa` has an ESM export
2. Use dynamic import: `const { default: withPWA } = await import("@ducanh2912/next-pwa")`
3. If necessary, keep `next.config.js` as a CommonJS file using `.cjs` extension: rename to `next.config.cjs`

### 5. Import path resolution fails in TypeScript

**Symptom:** `Cannot find module '@/generated/prisma/client'` or similar.

**Fix:** Verify:
1. `npx prisma generate` was run successfully
2. Output path in schema.prisma is correct: `"../src/generated/prisma"`
3. `src/generated/prisma/client` directory exists with index files
4. tsconfig paths alias `@/*` → `./src/*` is working

### 6. `dotenv/config` not loading .env file

**Symptom:** `DATABASE_URL is not set` during prisma commands.

**Fix:** The `prisma.config.ts` loads `dotenv/config` which reads `.env` from CWD. Ensure:
1. `dotenv` is installed: `npm install dotenv`
2. Running commands from `Web/` directory where `.env` exists
3. Alternative: use `node --env-file=.env` to load env before running prisma commands

## Rollback Plan

1. `git revert` the phase-02 commit on main.
2. **Database is NOT affected** — Prisma 7 client changes do not modify the database schema. Existing migrations remain valid.
3. Revert deletes `generated/` directory and restores old import paths.
4. Remove `"type": "module"` from package.json.
5. Restore `.js` config files.
6. Docker images rebuild from previous state on next deploy.
7. **Prerequisite:** Ensure Phase 01 is still in place (Node.js 24). If Phase 01 was also reverted, revert it first.

## Approval Gate

Before merging, verify:

- [ ] `"type": "module"` in package.json
- [ ] TypeScript upgraded to a Prisma 7-compatible baseline in this phase
- [ ] `prisma.config.ts` exists at `Web/` root with defineConfig
- [ ] `prisma.schema` uses `provider = "prisma-client"` and has `output` field
- [ ] `prisma.schema` datasource has no `url` field
- [ ] `src/generated/prisma/client` exists after `npx prisma generate`
- [ ] All 43 files updated to import from new path (grep for old path returns nothing)
- [ ] `db.ts` uses `PrismaPg` driver adapter
- [ ] `@auth/prisma-adapter` is either published with Prisma 7 support or validated in this repo against Prisma 7 with official docs still recommending `PrismaAdapter(prisma)`
- [ ] Config files renamed to `.mjs`
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes (or documented reason for skip)
- [ ] Docker build succeeds
- [ ] No `as any`, `@ts-ignore`, or `@ts-expect-error` introduced or retained to force compatibility
- [ ] No security middleware changes

## Commit Message

```
migration(phase-02): upgrade Prisma 5→7, add ESM, driver adapters, prisma.config.ts
```
