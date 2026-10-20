# PHASE 06 — Audit + Cleanup: Patch Dependencies, Final Validation, Migration Summary

## Goal

After all major version upgrades are complete, perform a final audit: review and update the remaining approved patch/minor dependencies, resolve any accumulated lint warnings, ensure full type safety, run the complete test suite, remove migration artifacts, and produce a migration summary log.

## Documentation References

| Source | URL |
|---|---|
| npm audit documentation | https://docs.npmjs.com/cli/v10/commands/npm-audit |
| npm outdated documentation | https://docs.npmjs.com/cli/v10/commands/npm-outdated |
| ESLint v9 Migration Guide | https://eslint.org/docs/latest/use/migrate-to-9 |

## In Scope

- Review and update the remaining approved patch/minor dependencies
- Review `npm audit` findings and address security patches with targeted, reviewable dependency changes
- Resolve all TypeScript errors (`npx tsc --noEmit` must pass with zero errors)
- Resolve all ESLint warnings and errors (`npm run lint` must pass)
- Run complete test suite (`npm run test`)
- Remove migration artifacts:
  - Delete `tailwind.config.js` if still present
  - Delete any temporary scripts created during migration
  - Remove TODO comments added during migration
  - Remove any `--legacy-peer-deps` workarounds
- Verify Docker build succeeds end-to-end
- Verify PWA service worker registers
- Verify Capacitor Android build
- Generate migration summary log
- Update ESLint from v8 to v9 (if compatible with Next.js 15)
- Verify the TypeScript 5.9 line introduced in Phase 02 remains compatible after all upgrades settle

## Out of Scope

- No new features
- No database schema changes
- No new dependencies (only updates to existing ones)
- No changes to security middleware logic

## Preconditions

- Phases 01–05 completed and merged
- All previous phase validation commands pass
- Git on clean branch: `git checkout -b migration/phase-06-audit-cleanup`

## Files Allowed To Change

| File | Change Type |
|---|---|
| `Web/package.json` | Patch/minor version updates |
| `Web/package-lock.json` | Lock file update |
| `Web/.eslintrc.json` → `Web/eslint.config.mjs` | ESLint v9 flat config (if upgrading) |
| `Web/tsconfig.json` | TypeScript 5.9 adjustments if needed |
| `Web/Dockerfile` | Remove any temporary workarounds |
| `Web/src/**` | Fix lint/type errors, remove TODOs |
| `docs/migration/MIGRATION_SUMMARY.md` | **New file** — final summary |

## Files Forbidden To Change

- `Web/src/middleware.ts` — No security logic changes (lint fixes for formatting only)
- `Web/prisma/schema.prisma` — No model changes
- `Web/prisma/migrations/**` — No migration file changes
- `Web/src/lib/crypto.ts` — No encryption changes
- `Web/src/lib/rateLimit.ts` — No rate limiting changes

## Exact Package Changes

### Target patch/minor updates (verify with `npm outdated`)

| Package | Current | Target Range | Notes |
|---|---|---|---|
| `eslint` | `^8.56.0` | `^9.x` (or `^8.x` latest) | Only if Next.js 15 supports flat config |
| `eslint-config-next` | Updated in Phase 03 | Latest patch | Ensure it matches Next.js 15 |
| `@sentry/nextjs` | `^10.35.0` | Latest patch | Security patches |
| `@tanstack/react-query` | `^5.17.0` | Latest minor | React 19 compat |
| `framer-motion` | `^12.27.1` | Latest patch | React 19 compat |
| `date-fns` | `^3.3.0` | Latest minor | Patch updates |
| `zod` | `^4.3.6` | Latest patch | Already v4 |
| All other deps | Various | Reviewed patch only | Update package-by-package; do not use blanket `npm update` |

### New files to remove (migration artifacts)

```bash
# Remove if still present
rm -f Web/tailwind.config.js
rm -f Web/next.config.js
rm -f Web/postcss.config.js
rm -f Web/jest.config.js
rm -f Web/.eslintrc.json  # Only if migrating to eslint.config.mjs
```

## Required Code Changes

### Step 1: Update all dependencies

```bash
cd Web

# Check for outdated packages
npx npm-check-updates -t patch  # Show patch updates
npx npm-check-updates -t minor --filter "/^(eslint|eslint-config-next|@sentry\/nextjs|@tanstack\/react-query|framer-motion|date-fns|zod)$/"  # Show approved minor targets

# Apply reviewed updates individually; do not run blanket `npm update`
# Keep major versions pinned to the choices made in earlier phases

# Run audit after updates and address findings with targeted package changes
npm audit
```

### Step 2: ESLint v8 → v9 migration (optional, if compatible)

**Check compatibility first:** Next.js 15 may not yet support ESLint v9 flat config. If `eslint-config-next` requires ESLint v8, skip this step and update in a future cycle.

```bash
# Check if eslint-config-next supports ESLint 9
npm info eslint-config-next peerDependencies
```

If compatible:

```bash
npm install -D eslint@^9
```

Create `Web/eslint.config.mjs`:

```javascript
import nextConfig from "eslint-config-next";

export default [
    ...nextConfig,
    {
        rules: {
            // Preserve any custom rules from .eslintrc.json
        },
    },
];
```

If NOT compatible, update ESLint v8 to latest patch:

```bash
npm install -D eslint@^8.56.0
```

### Step 3: Clean up migration artifacts

```bash
cd Web

# Remove TODO comments added during migration
grep -rn "TODO.*migration\|TODO.*phase-0\|FIXME.*migration" src/ --include="*.ts" --include="*.tsx"

# Remove any temporary --legacy-peer-deps workarounds
grep -rn "legacy-peer-deps" Dockerfile docker-compose*.yml package.json
# Expected: no output

# Remove old config files that should have been deleted
ls tailwind.config.js next.config.js postcss.config.js jest.config.js .eslintrc.json 2>/dev/null
# Expected: all should be gone (or .eslintrc.json if not migrating to v9)
```

### Step 4: Fix all TypeScript errors

```bash
npx tsc --noEmit
```

Fix any errors. Common post-migration issues:
- Stray `@ts-ignore` or `@ts-expect-error` comments — remove and fix the underlying type error
- `as any` casts — replace with proper types
- Missing type definitions for updated packages

### Step 5: Fix all ESLint errors

```bash
npm run lint
```

Fix any errors. Common post-migration issues:
- Unused imports from removed packages
- Deprecated API usage warnings
- New rules from updated eslint-config-next

### Step 6: Run full test suite

```bash
npm run test
```

Address any test failures. Common post-migration issues:
- Component tests breaking due to React 19 rendering changes
- Mock paths pointing to old `@prisma/client` import
- Updated API response shapes from next-auth v5

### Step 7: Generate migration summary

Create `docs/migration/MIGRATION_SUMMARY.md` at the repository root (from `Web/`, this is `../docs/migration/MIGRATION_SUMMARY.md`):

```markdown
# RunFlow Migration Summary

## Date
[Date of completion]

## Versions Before
| Component | Version |
|---|---|
| Node.js | 22.12.0 |
| React | 18.2 |
| Next.js | 14.2 |
| Prisma | 5.10 |
| Tailwind CSS | 3.4.1 |
| Capacitor | 8.0.1 |
| next-auth | 4.24 |
| TypeScript | 5.3 |
| ESLint | 8.56 |

## Versions After
| Component | Version |
|---|---|
| Node.js | 24 LTS |
| React | 19.x |
| Next.js | 15.x |
| Prisma | 7.x |
| Tailwind CSS | 4.x |
| Capacitor | 8.x (verified) |
| next-auth | 5.x |
| TypeScript | 5.9 |
| ESLint | 9.x (or 8.x latest) |

## Phases Completed
- [x] Phase 01 — Infrastructure (Node.js 24, Docker, .nvmrc)
- [x] Phase 02 — Prisma (5→7, ESM, driver adapters)
- [x] Phase 03 — Next.js + React (14→15, 18→19, next-auth 4→5)
- [x] Phase 04 — Tailwind CSS (3→4, CSS-first config)
- [x] Phase 05 — Capacitor (v8 verified)
- [x] Phase 06 — Audit + Cleanup

## Breaking Changes Applied
[List any notable breaking changes that required code modifications]

## Known Issues
[Any known issues or follow-up items]

## Validation Results
- TypeScript: [PASS/FAIL]
- Build: [PASS/FAIL]
- Lint: [PASS/FAIL]
- Tests: [PASS/FAIL]
- Docker: [PASS/FAIL]
- PWA: [PASS/FAIL]
- Capacitor Android: [PASS/FAIL]
```

## Validation Commands

```bash
cd Web

# Full validation suite
npx tsc --noEmit
npm run build
npm run lint
npm run test

# Docker build
docker compose build

# Security audit
npm audit
# Expected: 0 critical/high vulnerabilities

# Verify no forbidden patterns remain
grep -rn "as any" . --include="*.ts" --include="*.tsx" --include="*.mts" | grep -v "node_modules"
grep -rn "@ts-ignore\|@ts-expect-error" . --include="*.ts" --include="*.tsx" --include="*.mts"
grep -rn "legacy-peer-deps" Dockerfile docker-compose*.yml package.json
grep -rn "@tailwind " src/app/globals.css

# Verify all config files are ESM
ls next.config.mjs postcss.config.mjs jest.config.mjs

# Verify no old config files remain
ls next.config.js postcss.config.js jest.config.js tailwind.config.js 2>/dev/null
# Expected: all should be gone

# Verify migration summary exists in root docs directory
ls ../docs/migration/MIGRATION_SUMMARY.md

# Verify package versions
node -e "const p=require('./package.json'); console.log('type:', p.type)"
# Expected: module

# PWA check
npm run build
ls public/sw.js public/workbox-*.js 2>/dev/null
# Expected: service worker files exist

# Capacitor check (requires Android SDK)
npx cap sync android
cd android && ./gradlew assembleDebug
```

## Expected Failures And How To Fix Them

### 1. `npm audit` shows critical vulnerabilities

**Symptom:** Critical or high severity vulnerabilities in transitive dependencies.

**Fix:** Address the advisories with targeted dependency updates. If `npm audit fix` proposes a small, reviewable patch/minor diff, inspect it before applying. If vulnerabilities are in packages that can't be updated (peer dep conflicts), document them and create follow-up issues. Do NOT use `npm audit fix --force`.

### 2. ESLint v9 flat config incompatible with Next.js

**Symptom:** `npm run lint` fails with config parsing errors after upgrading ESLint to v9.

**Fix:** Revert to ESLint v8 latest patch. Next.js 15's eslint-config-next may not yet support flat config. This is acceptable — document it as a follow-up item.

### 3. TypeScript 5.9 introduces new strict checks

**Symptom:** `npx tsc --noEmit` shows new errors not present with TS 5.3.

**Fix:** TS 5.9 may have stricter checks. Common fixes:
- Explicit return types on async functions
- Stricter `noUncheckedIndexedAccess` behavior
- Updated lib types for ES2024+

### 4. Tests fail due to React 19 rendering changes

**Symptom:** Component tests fail with `TestingLibraryElementError` or unexpected DOM structure.

**Fix:** React 19 changed how it handles refs, effects, and suspense in tests. Update test utilities:
- Use `@testing-library/react@16+` (already at 16.3.1)
- Wrap state updates in `act()` more carefully
- Check for `useEffect` cleanup timing changes

## Rollback Plan

1. `git revert` the phase-06 commit on main.
2. This restores previous dependency versions and any lint/type fixes.
3. No database or infrastructure changes in this phase.
4. If ESLint was upgraded to v9 and causes issues, the revert restores v8 config.

## Approval Gate

Before merging, verify:

- [ ] All patch/minor dependencies updated
- [ ] `npm audit` shows 0 critical/high vulnerabilities
- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] `npm run build` passes
- [ ] `npm run lint` passes with 0 errors
- [ ] `npm run test` passes
- [ ] Docker build succeeds
- [ ] PWA service worker files generated
- [ ] No `--legacy-peer-deps` anywhere
- [ ] No `as any` type escapes (grep returns empty)
- [ ] No `@ts-ignore` or `@ts-expect-error` (grep returns empty)
- [ ] No old config files (tailwind.config.js, next.config.js, etc.)
- [ ] Migration summary document created
- [ ] All 6 phases marked complete in MIGRATION_MASTER.md

## Commit Message

```
migration(phase-06): audit dependencies, cleanup artifacts, final validation, migration summary
```

---

## Post-Phase Addendum (2026-04-01)

After Phase 06 merged, additional production hardening was required based on runtime behavior in Coolify:

1. **Auth runtime compatibility fixes**
   - Added adapter-level coercion of Strava `providerAccountId` values to string before Prisma adapter operations.
   - Removed custom PKCE cookie overrides so Auth.js v5 uses its internal PKCE cookie handling.

2. **Token compatibility fallback**
   - Added fallback behavior that allows plaintext token reads/writes when encryption/decryption fails (legacy or rotated key scenario), preventing OAuth sign-in loops.

3. **Build performance and stability tuning**
   - Removed `workerThreads: false` and `cpus: 3` from Next config to restore default parallel build behavior.
   - Added BuildKit cache mount for Prisma generated output in Docker build stage.
   - Added `SENTRY_DISABLE_SOURCEMAP_UPLOAD=1` in build stage to reduce optional build overhead.

4. **Operational outcome**
   - Build compile stage improved, but static generation can still fail in constrained hosts if memory/timeout limits are too tight.
   - Treat build-time optimization and deployment resource tuning as a separate operations track after migration completion.
