# Security Fix Plan — 25 April 2026

> **Agent Model:** GLM 5.1  
> **Runner:** OpenCode (`start plan25.4.md`)  
> **Repository:** RunFlow (`Web/`)

---

## Audit Verification — Which Issues Are Real?

### ✅ CONFIRMED VULNERABILITIES (Code-verified)

| ID | Vulnerability | Severity | Verified? | Evidence |
|---|---|---|---|---|
| **AUTHZ-VULN-01** | Unauthenticated Nutrition Log Creation | **CRITICAL** | ✅ YES | `Web/src/app/api/health/nutrition/log/route.ts` — No `auth()` call, no session check. `userId` taken straight from `body` (line 7) and passed to `prisma.nutritionLog.create` (line 58-60). Zero authentication. |
| **AUTH-VULN-09** | User Enumeration via Registration | **Medium** | ✅ YES | Both `Web/src/app/api/auth/register/route.ts` (line 60-64) and `Web/src/app/api/mobile/v1/auth/register/route.ts` (line 63-67) return explicit `409` with `"An account with this email already exists"` error message. |
| **AUTH-VULN-10** | Timing Attack on Forgot Password | **Low-Medium** | ✅ YES | `Web/src/app/api/auth/forgot-password/route.ts` — When user exists (line 37), it awaits `sendPasswordResetEmail` (line 43) before returning. For non-existing users it skips straight to the response (line 49). The `await` on email sending creates a measurable timing difference. |
| **AUTH-VULN-08** | Insufficient Rate Limiting (Credential Stuffing) | **Medium** | ✅ YES | `Web/src/app/api/mobile/v1/auth/email-login/route.ts` line 19: `limit: 10, windowSeconds: 60` — allows 10 attempts per minute per IP. No account lockout, no CAPTCHA, no progressive backoff. |
| **SSRF-03** | Food Scanner uses `fetch()` not `safeFetch()` | **Medium** | ✅ YES | `Web/src/app/api/health/nutrition/scan-image/route.ts` line 188: uses native `fetch(url, ...)` with `googleProvider.baseUrl` from database. Should use `safeFetch()` from `@/lib/ai/providers`. However, requires auth + admin-configured provider, so exploitation is limited. |
| **OAuth CSRF** | Strava Callback lacks state validation | **High** | ✅ YES | `Web/src/app/api/auth/strava/callback/route.ts` — `state` parameter is only checked with `startsWith('android_')` / `startsWith('flutter_')` for routing. No CSRF token, no session binding, no cryptographic verification. |

### ⚠️ PARTIALLY CONFIRMED / MITIGATED

| ID | Issue | Status | Notes |
|---|---|---|---|
| **SSRF-01/02** | AI BaseURL SSRF | ✅ Blocked | `validateBaseUrl()` + `safeFetch()` in `providers.ts` correctly block private IPs, validate HTTPS, and use allowlists. Extensive test suite in `providers-ssrf.test.ts`. These are properly mitigated. |
| **Cron/Internal security-through-obscurity** | Unauthenticated internal endpoints | ❌ NOT TRUE | Both `api/cron/aggregate-metrics/route.ts` and `api/internal/process-feedback-queue/route.ts` DO have auth checks — Bearer token (`CRON_SECRET`) and timing-safe comparison respectively. Report was wrong on this. |

### ❌ NOT FOUND / CONFIRMED SAFE

| ID | Issue | Status |
|---|---|---|
| **XSS** | No XSS vulnerabilities | ✅ Correct — No `dangerouslySetInnerHTML` found anywhere |
| **SQL Injection** | No raw SQL usage | ✅ Correct — No `$queryRaw` or `$executeRaw` found, all Prisma ORM |

---

## Multi-Agent Execution Architecture

```
┌─────────────────────────────────────────────────────┐
│                    ORCHESTRATOR                      │
│  Reads this plan, dispatches phases sequentially     │
│  Model: GLM 5.1                                     │
└──────────┬──────────────────────────┬────────────────┘
           │                          │
    ┌──────▼──────┐            ┌──────▼──────┐
    │  IMPLEMENT  │            │   REVIEW    │
    │   AGENT     │            │   AGENT     │
    │             │            │             │
    │ • Fix code  │  ──────▶   │ • Lint      │
    │ • Self-test │            │ • Build     │
    │   after     │            │ • Test      │
    │   every     │            │ • Code      │
    │   change    │            │   review    │
    └─────────────┘            └─────────────┘
```

**Rules:**
1. The **Implementing Agent** self-tests after EVERY individual change (`npm run lint` + `npm run build` in `Web/`)
2. The **Review Agent** runs a full validation after EVERY phase completes (`lint` + `build` + `test`)
3. Phases run **sequentially** — never start Phase N+1 until Phase N passes review
4. If review fails, the Implementing Agent fixes before proceeding
5. Always `cd Web` before running any npm commands

---

## Phase 1: CRITICAL — Fix Unauthenticated Nutrition Log (AUTHZ-VULN-01)

**Priority:** CRITICAL — This is a live authentication bypass

### Implementing Agent Tasks:

**File:** `Web/src/app/api/health/nutrition/log/route.ts`

1. Add `auth()` import from `@/auth`
2. Add session check at the top of the `POST` handler — reject with `401` if no session
3. Use `session.user.id` as `userId` instead of trusting `body.userId`
4. Remove `userId` from the destructured `body` — the user should NEVER supply their own userId

**Implementation:**
```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

export async function POST(request: Request) {
    try {
        // Authentication check
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = session.user.id; // Always use session userId, never from body

        const body = await request.json();
        const { date, mealType, quantity, foodItem } = body; // userId removed from destructuring
        // ... rest remains the same, but uses session userId
```

**Self-test after change:**
```bash
cd Web && npm run lint && npm run build
```

### Review Agent Tasks:
```bash
cd Web
npm run lint
npm run build
npm run test
```
- Verify `auth()` is called before any DB operation
- Verify `userId` comes from `session.user.id`, not from request body
- Verify 401 is returned when unauthenticated

---

## Phase 2: HIGH — Fix Strava OAuth CSRF (OAuth State Validation)

**Priority:** HIGH — OAuth CSRF attack vector

### Implementing Agent Tasks:

**File:** `Web/src/app/api/auth/strava/callback/route.ts`

1. For the **web flow** (non-mobile): validate that the `state` parameter matches a server-side stored value. NextAuth already handles CSRF on its own callback (`/api/auth/callback/strava`), so when redirecting there, pass the state through. The critical fix is to not blindly route mobile deep-links based on any arbitrary state prefix.

2. For mobile flows: add a timestamp freshness check — the state parameter format is `android_<timestamp>` / `flutter_<timestamp>`. Verify the timestamp is within the last 10 minutes to prevent replay attacks.

**Implementation:**
```typescript
// After extracting state:
if (isMobile) {
    // Validate timestamp freshness to prevent replay attacks
    const parts = state!.split('_');
    const timestamp = parseInt(parts[1], 10);
    const now = Date.now();
    const MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes
    
    if (isNaN(timestamp) || (now - timestamp) > MAX_AGE_MS) {
        logger.warn('Strava Callback: stale or invalid state timestamp', { state, age: now - timestamp });
        return NextResponse.redirect(new URL('/login?error=invalid_state', request.url));
    }
    // ... continue with mobile flow
}
```

**Self-test after change:**
```bash
cd Web && npm run lint && npm run build
```

### Review Agent Tasks:
```bash
cd Web
npm run lint
npm run build
npm run test
```
- Verify state parameter validation exists for mobile flow
- Verify expired timestamps are rejected
- Verify error handling for malformed state

---

## Phase 3: MEDIUM — Fix User Enumeration via Registration (AUTH-VULN-09)

**Priority:** Medium — Information leakage

### Implementing Agent Tasks:

**Files:**
- `Web/src/app/api/auth/register/route.ts`
- `Web/src/app/api/mobile/v1/auth/register/route.ts`

For both files, change the approach: instead of returning a distinguishable `409` error, return a **generic success-like response** when the email is already taken. This prevents enumeration while still being user-friendly.

**Option A (Recommended — Generic response):**
Instead of:
```typescript
if (existingUser) {
    return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
    );
}
```

Change to:
```typescript
if (existingUser) {
    // Don't reveal that the email exists — return same success structure
    // but send a "verify your email" message so the real user isn't affected
    return NextResponse.json({
        success: true,
        message: 'Account created successfully. Please check your email to verify your account.',
    }, { status: 201 });
}
```

> **Note for web endpoint:** The existing user should NOT receive any emails from this enumeration attempt. Just return the generic response. This prevents leaking whether the email exists.

> **Note for mobile endpoint:** Same approach — return a response that looks identical to a successful registration but without creating an account or returning tokens. Since the mobile endpoint returns JWT tokens on success, we need to handle this differently:

**For mobile endpoint specifically:**
```typescript
if (existingUser) {
    // Return generic error that doesn't reveal email existence
    return NextResponse.json(
        { error: 'Registration failed. Please try again or contact support.' },
        { status: 400 }
    );
}
```

This is a tradeoff — the mobile endpoint must not return tokens for an existing user, so we can't perfectly mimic success. But we use a generic error that doesn't confirm email existence.

**Self-test after each file change:**
```bash
cd Web && npm run lint && npm run build
```

### Review Agent Tasks:
```bash
cd Web
npm run lint
npm run build
npm run test
```
- Verify no response contains "email already exists" or similar enumeration info
- Verify HTTP status codes don't differ between existing/non-existing emails (where possible)
- Verify no regression in actual registration flow

---

## Phase 4: MEDIUM — Fix Timing Attack on Password Reset (AUTH-VULN-10)

**Priority:** Medium — Side-channel information leakage

### Implementing Agent Tasks:

**File:** `Web/src/app/api/auth/forgot-password/route.ts`

The fix: don't `await` the email sending in the response path. Use a fire-and-forget pattern so the response time is identical regardless of whether the user exists.

**Implementation:**
```typescript
if (user) {
    const code = await createAuthCode(user.email!, AuthCodeType.PASSWORD_RESET);
    
    // Fire-and-forget: don't await email sending to prevent timing attacks
    sendPasswordResetEmail(user.email!, code).catch((emailError) => {
        logger.error('Failed to send reset email', { 
            email: user.email, 
            error: emailError instanceof Error ? emailError.message : String(emailError) 
        });
    });
}
```

**Additional hardening:** Add a small random delay to further normalize response times:
```typescript
// Add slight random delay to normalize timing regardless of user existence
await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

return NextResponse.json({
    success: true,
    message: 'If an account exists with this email, a reset code has been sent.'
});
```

**Self-test after change:**
```bash
cd Web && npm run lint && npm run build
```

### Review Agent Tasks:
```bash
cd Web
npm run lint
npm run build
npm run test
```
- Verify email sending is not awaited in the response path
- Verify response message is generic (already is)
- Verify error handling for failed email sends still exists

---

## Phase 5: MEDIUM — Harden Rate Limiting (AUTH-VULN-08)

**Priority:** Medium — Credential stuffing defense

### Implementing Agent Tasks:

**File:** `Web/src/app/api/mobile/v1/auth/email-login/route.ts`

1. Reduce rate limit from `10 per 60s` to `5 per 60s` per IP
2. Add a per-email rate limit (separate from per-IP) to prevent distributed attacks

**Implementation:**
```typescript
// Per-IP rate limiting (reduced)
const rateLimitResult = await checkRateLimitAsync(clientId, {
    limit: 5,
    windowSeconds: 60,
    prefix: 'mobile-email-login'
});

if (!rateLimitResult.allowed) {
    return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(rateLimitResult) }
    );
}

// Per-email rate limiting (prevents distributed brute-force)
const emailRateLimit = await checkRateLimitAsync(email.toLowerCase(), {
    limit: 5,
    windowSeconds: 300, // 5 attempts per 5 minutes per email
    prefix: 'mobile-email-login-email'
});

if (!emailRateLimit.allowed) {
    return NextResponse.json(
        { error: 'Too many login attempts for this account. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(emailRateLimit) }
    );
}
```

> **Note:** The per-email rate limit must come AFTER input validation (checking email/password are present) but BEFORE the database lookup.

**Self-test after change:**
```bash
cd Web && npm run lint && npm run build
```

### Review Agent Tasks:
```bash
cd Web
npm run lint
npm run build
npm run test
```
- Verify per-IP limit is reduced to 5
- Verify per-email rate limit is added
- Verify rate limit headers are returned correctly

---

## Phase 6: MEDIUM — Fix Food Scanner SSRF (SSRF-03)

**Priority:** Medium — Uses native `fetch()` where `safeFetch()` should be used

### Implementing Agent Tasks:

**File:** `Web/src/app/api/health/nutrition/scan-image/route.ts`

1. Import `safeFetch` from `@/lib/ai/providers`
2. Replace `fetch(url, ...)` on line 188 with `safeFetch(url, ...)`
3. Pass the `googleProvider.baseUrl` as an allowed URL

**Implementation:**
```typescript
import { safeFetch } from '@/lib/ai/providers';

// ... in the API key loop:
response = await safeFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    allowedUrls: [googleProvider.baseUrl],
    body: JSON.stringify({
        // ... existing body
    }),
});
```

**Self-test after change:**
```bash
cd Web && npm run lint && npm run build
```

### Review Agent Tasks:
```bash
cd Web
npm run lint
npm run build
npm run test
```
- Verify `safeFetch` is imported and used
- Verify `allowedUrls` is passed with the provider's base URL
- Verify no native `fetch()` calls remain for external URLs in this file

---

## Phase 7: Final Verification & Commit

### Review Agent Full Validation:
```bash
cd Web
npm run lint
npm run build
npm run test
```

### Implementing Agent Tasks:
1. Run the full validation suite
2. Create a git commit with all security fixes:
```bash
cd Web
git add -A
git commit -m "security: fix 6 vulnerabilities from security assessment

- CRITICAL: Add auth to nutrition log endpoint (AUTHZ-VULN-01)
- HIGH: Add state timestamp validation to Strava OAuth (OAuth CSRF)
- MEDIUM: Fix user enumeration via registration (AUTH-VULN-09)
- MEDIUM: Fix timing attack on forgot-password (AUTH-VULN-10)
- MEDIUM: Harden rate limiting on mobile login (AUTH-VULN-08)
- MEDIUM: Use safeFetch in food scanner (SSRF-03)"
```

---

## Execution Instructions for OpenCode

To execute this plan in OpenCode with GLM 5.1:

```
start plan25.4.md
```

The agent should:
1. Read this entire plan
2. Execute phases 1-7 sequentially
3. After EVERY individual code change, run `cd Web && npm run lint && npm run build`
4. After EVERY completed phase, run the full review: `cd Web && npm run lint && npm run build && npm run test`
5. Do NOT proceed to the next phase if the current phase review fails
6. Fix any issues before moving forward
7. Commit all changes together in Phase 7
