# PHASE 03 — Next.js 14→15, React 18→19, next-auth 4→5

## Goal

Upgrade Next.js from 14.2 to 15.x, React from 18.2 to 19.x, and next-auth from 4.24 to 5.x (Auth.js). This is a large-surface phase touching framework APIs, authentication, and type definitions across many runtime and test files.

## Documentation References

| Source | Context7 ID / URL |
|---|---|
| Next.js 15 Upgrade Guide (async APIs) | Context7 `/websites/nextjs` — query `upgrading version 15` |
| Next.js 15 Codemod | Context7 `/websites/nextjs` — query `next-async-request-api` |
| Next.js 15 Fetch Caching Changes | Context7 `/websites/nextjs` — query `fetch caching no longer cached` |
| React 19 Upgrade Guide | Context7 `/websites/react_dev` — query `React 19 upgrade guide` |
| React 19 Codemod | Context7 `/websites/react_dev` — query `migration codemod recipe` |
| Auth.js v5 Migration Guide | Context7 `/websites/authjs_dev` — query `migrating to v5` |
| React 19 TypeScript Types | Context7 `/websites/react_dev` — query `ReactElement props unknown types-react-codemod` |

## In Scope

- Upgrade `next` from `^14.2.0` to `^15.x`
- Upgrade `react` from `^18.2.0` to `^19.x`
- Upgrade `react-dom` from `^18.2.0` to `^19.x`
- Upgrade `next-auth` from `^4.24.7` to `^5.x` (Auth.js)
- Upgrade `eslint-config-next` to match Next.js 15
- Update `@types/react` and `@types/react-dom` to v19
- Migrate `cookies()`, `headers()`, `draftMode()` to async (if used)
- Migrate **all** page, layout, and route-handler `params`/`searchParams` usages to Promise-wrapped types where required by Next.js 15
- Replace `getServerSession(authOptions)` with `auth()` from Auth.js v5
- Create new `src/auth.ts` configuration file (Auth.js v5 pattern)
- Keep `src/middleware.ts` untouched unless a separately documented, repo-specific compatibility issue is proven
- Run React 19 TypeScript type codemod
- Handle fetch caching default change (no longer cached by default) and GET route handler caching now being opt-in
- Verify widespread client-side `next-auth/react` usage continues to work with `SessionProvider`, `useSession`, `signIn`, and `signOut`

## Out of Scope

- No Prisma changes (Phase 02)
- No Tailwind changes (Phase 04)
- No Capacitor changes (Phase 05)
- No changes to database schema or migrations
- No changes to encryption/decryption logic in `src/lib/crypto.ts`
- No changes to rate limiting logic in `src/lib/rateLimit.ts`

## Preconditions

- Phase 01 (Node.js 24) and Phase 02 (Prisma 7 + ESM) completed and merged
- Current build passes on the Phase 02 branch
- Database backup taken
- Git on clean branch: `git checkout -b migration/phase-03-next-react`

## Files Allowed To Change

| File | Change Type |
|---|---|
| `Web/package.json` | Version updates for next, react, react-dom, next-auth, types |
| `Web/next.config.mjs` | Next.js 15 config changes |
| `Web/src/auth.ts` | **New file** — Auth.js v5 configuration |
| `Web/src/lib/strava/oauth.ts` | Refactor to Auth.js v5 pattern |
| `Web/src/app/api/auth/[...nextauth]/route.ts` | Update for Auth.js v5 |
| `Web/src/app/activity/[id]/analysis/page.tsx` | Already uses async params — update auth import |
| **All runtime and test files** importing `getServerSession` from `next-auth` | Replace with `auth()` or the correct v5 server-side pattern |
| `Web/src/components/OnboardingWizard.tsx` | Client component — verify `useSearchParams()` compat |
| `Web/src/app/mobile-layout.tsx` | Client component — verify `useSearchParams()` compat |
| `Web/src/app/chat/page.tsx` | Client component — verify `useSearchParams()` compat |
| `Web/tsconfig.json` | May need updates for React 19 types |

## Files Forbidden To Change

- `Web/prisma/schema.prisma` — No schema changes
- `Web/prisma.config.ts` — No Prisma config changes
- `Web/src/lib/db.ts` — No database client changes
- `Web/src/lib/crypto.ts` — No encryption changes
- `Web/src/lib/rateLimit.ts` — No rate limiting changes
- `Web/Dockerfile` — No Docker changes
- `Web/src/middleware.ts` — No auth export rewrite in this repo; preserve existing CORS, CSP, tracing, and matcher behavior unchanged

## Exact Package Changes

### `Web/package.json` — dependencies

| Package | Current | Target | Notes |
|---|---|---|---|
| `next` | `^14.2.0` | Latest verified patch in the 15.x line | Do not use commands that silently jump to Next.js 16 |
| `react` | `^18.2.0` | Latest verified 19.x release | Major version upgrade |
| `react-dom` | `^18.2.0` | Latest verified 19.x release | Major version upgrade |
| `next-auth` | `^4.24.7` | Latest verified 5.x beta/stable release compatible with the selected Next.js 15 target | Auth.js v5 |
| `@auth/prisma-adapter` | Phase 02 output | Keep the Prisma-7-compatible release chosen in Phase 02 | Do not downgrade or loosen compatibility |

### `Web/package.json` — devDependencies

| Package | Current | Target | Notes |
|---|---|---|---|
| `eslint-config-next` | `^14.2.0` | Matching verified 15.x patch | Must match the selected Next.js version |
| `@types/react` | `^18.2.0` | Matching verified 19.x patch | React 19 types |
| `@types/react-dom` | `^18.2.0` | Matching verified 19.x patch | React 19 types |
| `@testing-library/react` | `^16.3.1` | `^16.3.1` | Verify React 19 compat |

## Required Code Changes

### Step 0: Run the Next.js 15 codemod

Per Context7 `/websites/nextjs` — the codemod handles async request API migration:

```bash
cd Web
npm install next@^15 react@^19 react-dom@^19 eslint-config-next@^15
npx @next/codemod@latest next-async-request-api .
```

This will:
- Convert `cookies()`, `headers()`, `draftMode()` to async
- Convert `params` and `searchParams` in pages, layouts, and route entries to Promise types where supported by the codemod

**Important:** Do **not** run `upgrade latest` here. It targets the latest major line and can silently move this phase beyond Next.js 15.

**Review the codemod output carefully before committing.**

### Step 1: Run the React 19 type codemod

Per Context7 `/websites/react_dev`:

```bash
npx types-react-codemod@latest preset-19 ./src
```

This handles:
- `ReactElement["props"]` now defaults to `unknown` instead of `any`
- Removed deprecated types
- Updated forwardRef patterns

Repo-specific note: a current grep found no `useFormState` usages to migrate, but it did find multiple `forwardRef` usages in the UI component layer. Review those codemod changes carefully.

### Step 2: Create `Web/src/auth.ts`

Per Context7 `/websites/authjs_dev` — Auth.js v5 uses a centralized config file:

```typescript
import NextAuth, { type NextAuthConfig } from "next-auth";
import StravaProvider from "next-auth/providers/strava";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { encryptToken, decryptToken } from "@/lib/crypto";
import { verifyPassword } from "@/lib/auth/auth-email";
import { checkRateLimitAsync } from "@/lib/rateLimit";
import { logger } from "@/lib/logging/logger";

const authConfig = {
    adapter: PrismaAdapter(prisma),
    providers: [
        StravaProvider({
            clientId: process.env.STRAVA_CLIENT_ID!,
            clientSecret: process.env.STRAVA_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: "read,activity:read_all,profile:read_all",
                    approval_prompt: "auto",
                },
            },
        }),
        CredentialsProvider({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email and password are required");
                }

                const identifier = credentials.email.toLowerCase();
                const rateLimitResult = await checkRateLimitAsync(identifier, {
                    limit: 5,
                    windowSeconds: 300,
                    prefix: "login",
                });

                if (!rateLimitResult.allowed) {
                    logger.warn("Rate limit exceeded for login", { email: identifier });
                    throw new Error("Too many login attempts. Please try again later.");
                }

                const user = await prisma.user.findUnique({
                    where: { email: identifier },
                });

                if (!user || !user.passwordHash) {
                    throw new Error("Invalid email or password");
                }

                const isValid = await verifyPassword(credentials.password, user.passwordHash);
                if (!isValid) {
                    throw new Error("Invalid email or password");
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                };
            },
        }),
    ],
    callbacks: {
        // Migrate ALL callbacks from oauth.ts here
        // Preserve ALL existing token encryption, rate limiting, and session logic
        // Copy the callbacks verbatim from src/lib/strava/oauth.ts lines 74-315
        // Update imports to use new path references
        // Use the callback parameter types exported by next-auth / NextAuthConfig.
        async signIn(args) {
            const { account } = args;
            // ... copy existing signIn callback logic from oauth.ts
            // Preserve: credentials provider skip, athlete object cleanup, token encryption
        },
        // Copy all other callbacks (jwt, session, etc.) from oauth.ts
    },
    pages: {
        // Copy any custom page overrides from oauth.ts
    },
    session: {
        // Copy session strategy from oauth.ts
    },
} satisfies NextAuthConfig;

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);
```

**CRITICAL:** The `oauth.ts` file is 315 lines. ALL callback logic must be migrated to `auth.ts` — this includes:
- Token encryption/decryption for Strava OAuth
- Rate limiting on login
- Session augmentation with user data
- Custom cookie behavior and CSRF/session cookie naming review (Auth.js v5 defaults changed to `authjs`; if custom cookie names are retained, validate login/logout and CSRF flows manually)
- Any custom redirect or error handling
- Admin detection logic

Do NOT simplify or remove any security logic during migration.
Do NOT introduce `any`, `as any`, `@ts-ignore`, or `@ts-expect-error` to force callback compatibility.

### Step 3: Update `Web/src/app/api/auth/[...nextauth]/route.ts`

Per Context7 `/websites/authjs_dev`:

```typescript
// Before
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

// After
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

### Step 4: Replace `getServerSession` with `auth()` in runtime files and update affected tests

Per Context7 `/websites/authjs_dev`:

```typescript
// Before
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
const session = await getServerSession(authOptions);

// After
import { auth } from "@/auth";
const session = await auth();
```

This is the bulk of the work. The current repo has widespread `getServerSession` / `authOptions` usage across runtime files and tests. Pattern for updating each runtime file:

1. Remove `import { getServerSession } from 'next-auth'`
2. Remove `import { authOptions } from '@/lib/strava/oauth'` (if only used for getServerSession)
3. Add `import { auth } from "@/auth"`
4. Replace `await getServerSession(authOptions)` with `await auth()`

**Use a search-and-replace approach:**
```bash
# Find all files to update
grep -rl "getServerSession" src/ --include="*.ts" --include="*.tsx"
```

Client-side usage of `next-auth/react` remains valid in Auth.js v5. The repo's `SessionProvider`, `useSession`, `signIn`, and `signOut` imports should be verified, not mass-rewritten.

### Step 5: Keep `Web/src/middleware.ts` unchanged

The current `Web/src/middleware.ts` is a custom security middleware handling CORS, CSP, security headers, request tracing, and path matching. It does **not** currently export `next-auth/middleware` or `withAuth`, so there is no repo-backed reason to rewrite it for Auth.js v5.

**Rule:** Treat `Web/src/middleware.ts` as forbidden in this phase unless a separately documented compatibility issue is discovered and approved. If that happens, update the phase document before editing the file.

### Step 6: Handle fetch caching default change

Per Context7 `/websites/nextjs` — in Next.js 15, `fetch()` is no longer cached by default and `GET` route handlers are no longer cached by default.

```javascript
// Before (Next.js 14): fetch() was cached by default
const data = await fetch('https://api.example.com/data');

// After (Next.js 15): fetch() is NOT cached
// To cache, explicitly set:
const data = await fetch('https://api.example.com/data', { cache: 'force-cache' });
```

**Action:**
1. Search for `fetch()` calls in server components and routes that depended on implicit caching. Add `cache: 'force-cache'` only where caching is intentionally required.
2. Audit `GET` route handlers separately. If a route handler should be cached, use the documented route config, for example:

```typescript
export const dynamic = 'force-static';
```

Do not assume `fetchCache = 'default-cache'` is an equivalent replacement for route-handler caching.

### Step 7: Verify async API migration

The codemod from Step 0 should handle most cases, but verify the repo-specific findings:

1. **`cookies()`, `headers()`, `draftMode()`** — The grep for these returned no direct usages in `src/`. The middleware uses `request.headers` from the `NextRequest` object, not `headers()` from `next/headers`. **No changes expected here.**

2. **`params` in dynamic routes and route handlers** — The repo has many sync `params` signatures in route handlers (for example `src/app/api/workouts/[id]/route.ts`, `src/app/api/mobile/v1/goals/[id]/route.ts`, and `src/app/api/health/nutrition/log/[id]/route.ts`). Every remaining sync `params` signature must be migrated to the Next.js 15 async pattern where required.

3. **`searchParams` in pages** — Current direct `searchParams` prop usage is minimal, but verify all pages/layouts after the codemod. `useSearchParams()` in client components remains unchanged.

### Step 8: Update `Web/next.config.mjs`

Next.js 15 changes:
- `swcMinify` option is now the default (can be removed from config)
- Review `experimental` options for deprecated/changed ones

```javascript
const nextConfig = {
    output: "standalone",
    // swcMinify: true, // Remove — default in Next.js 15
    compress: true,
    experimental: {
        workerThreads: false,
        cpus: 3,
        optimizePackageImports: ['lucide-react', 'date-fns', '@tanstack/react-query']
    },
    // ... rest stays the same
};
```

## Validation Commands

```bash
cd Web

# Install deps
npm ci

# Type check
npx tsc --noEmit

# Build
npm run build

# Lint
npm run lint

# Tests
npm run test

# Verify no old getServerSession imports remain
grep -r "getServerSession" src/ --include="*.ts" --include="*.tsx"
# Expected: no output

# Verify no sync params signatures remain in app router entries that should be async in Next.js 15
grep -r "params: {" src/app --include="*.ts" --include="*.tsx"
# Expected: only non-route/component false positives after manual review

# Verify auth.ts exists
ls src/auth.ts

# Verify no runtime import of authOptions remains
grep -r "import.*authOptions.*from.*strava/oauth" src/app src/lib --include="*.ts" --include="*.tsx"
# Expected: no output
```

## Expected Failures And How To Fix Them

### 1. `next-auth@5` type errors with existing session usage

**Symptom:** TypeScript errors on `session.user.name`, `session.user.email`, etc.

**Fix:** Auth.js v5 uses stricter typing. Update the existing `src/types/next-auth.d.ts` augmentation if needed:

```typescript
// src/types/next-auth.d.ts
import { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            isAdmin?: boolean;
        } & DefaultSession["user"];
    }
}
```

### 2. `PrismaAdapter` type incompatibility with Auth.js v5

**Symptom:** `PrismaAdapter(prisma)` has type errors.

**Fix:** The `@auth/prisma-adapter` may need to be updated to a published version that supports the selected Auth.js v5 and Prisma 7 combination. The adapter itself is typically version-locked to the auth library version.

### 3. React 19 `ref` as prop changes

**Symptom:** TypeScript errors about `ref` not being a valid prop.

**Fix:** React 19 no longer requires `forwardRef` for function components that accept `ref` as a prop. The codemod from Step 1 should handle most cases. For manual fixes:

```typescript
// Before
const MyComponent = forwardRef((props, ref) => { ... });

// After
const MyComponent = ({ ref, ...props }) => { ... };
```

### 4. `@ducanh2912/next-pwa` incompatible with Next.js 15

**Symptom:** Build fails with PWA plugin errors.

**Fix:** Check if `@ducanh2912/next-pwa` supports Next.js 15. If not:
1. Update to a published version explicitly compatible with the selected Next.js 15 target
2. If no compatible version exists, consider switching to `@serwist/next` (the actively maintained successor)
3. If no compatible option exists, stop and revise the migration plan before execution instead of leaving an in-code TODO

### 5. `@sentry/nextjs` incompatible with Next.js 15

**Symptom:** Build errors from Sentry SDK.

**Fix:** Update `@sentry/nextjs` to a published patch/minor release documented as compatible with the selected Next.js 15 target. If none exists, stop and document the blocker before proceeding.

### 6. React 19 `useEffect` cleanup changes

**Symptom:** Tests fail due to `useEffect` timing changes.

**Fix:** React 19 has stricter `useEffect` cleanup behavior. Review any components that depend on exact cleanup timing. Tests using `@testing-library/react` may need `act()` wrapping updates.

## Rollback Plan

1. `git revert` the phase-03 commit on main.
2. This restores Next.js 14, React 18, and next-auth v4.
3. No database schema changes in this phase — rollback is safe.
4. The `auth.ts` file is deleted on revert; `oauth.ts` is restored.
5. Docker images rebuild from previous state on next deploy.

## Approval Gate

Before merging, verify:

- [ ] `next --version` shows 15.x
- [ ] `react --version` (or package.json) shows 19.x
- [ ] `next-auth` shows 5.x
- [ ] `src/auth.ts` exists with all callbacks migrated from oauth.ts
- [ ] No `getServerSession` imports remain (grep returns empty)
- [ ] No runtime `authOptions` imports remain
- [ ] No sync `params` signatures remain where Next.js 15 requires async request APIs
- [ ] Middleware security logic preserved (CORS, CSP, headers)
- [ ] Token encryption/decryption in callbacks unchanged
- [ ] Rate limiting on login preserved
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] Manual login test succeeds (Strava OAuth)
- [ ] Manual login test succeeds (email/password)
- [ ] PWA service worker registers correctly

## Commit Message

```
migration(phase-03): upgrade Next.js 14→15, React 18→19, next-auth 4→5
```
