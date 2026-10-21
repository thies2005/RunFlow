# Multi-Agent Security Remediation Plan for Google Antigravity (Gemini 3.8 Flash Medium)

- **Target Environment**: Google Antigravity IDE / Agent Manager
- **Target Model**: **Gemini 3.8 Flash Medium** (`gemini-3.8-flash`, `thinking_level: medium`)
- **Scope**: End-to-end remediation and regression testing for all **12 confirmed findings (`RF-001` – `RF-012`)** in `RunFlow`

## 1. Why This Architecture Is Tuned for Google Antigravity + Gemini 3.8 Flash Medium

When orchestrating multiple parallel coding agents in **Google Antigravity** powered by **Gemini 3.8 Flash Medium**, three operational constraints determine whether a multi-agent run succeeds cleanly on the first pass:

1. **Strict Disjoint File Ownership (Zero Merge/Lock Conflicts)**:
   Antigravity agents operating concurrently in a shared workspace will overwrite each other's changes or trigger dirty-tree conflicts if two agents touch the same file in the same wave. Every agent below is assigned an **exclusive write-lock set of 2–5 files** that never overlaps with any other agent in the same wave.
2. **Tight Context Budgets (`<15K` Input Tokens / 2–5 Files per Agent)**:
   Gemini 3.8 Flash with `medium` thinking achieves highest accuracy and lowest latency when given **exact file paths, line ranges, and explicit pre/post-conditions** instead of broad repository-wide searches. Each agent prompt below is self-contained and bounded to a single subsystem.
3. **Fast Per-Agent Verification Gates (`<10s` Targeted Vitest / JUnit Runs)**:
   Rather than running the entire test suite inside every sub-agent (which causes CPU/IO contention across parallel agents), each agent runs a **single targeted test file** to verify its fix, followed by a **Wave Barrier Gate** run by the Coordinator Agent.

## 2. Multi-Agent Wave Topology & File-Lock Matrix

All 12 findings are grouped into **6 specialized Fix Agents** executed across **2 Parallel Waves** (3 concurrent agents per wave), followed by **1 Final Verification & Regression Gate**:

| Wave | Agent ID | Assigned Findings | Exclusive Write-Lock Files (No Overlap Across Wave) | Per-Agent Test Command |
| :--- | :--- | :--- | :--- | :--- |
| **Wave 1** | **Agent-1A** (`mcp-oauth-guard`) | **RF-001**, **RF-002**, **RF-007** | `Web/src/lib/mcp/oauth.ts`<br>`Web/src/app/mcp/oauth/authorize/route.ts`<br>`Web/src/app/mcp/authorize/page.tsx`<br>`Web/src/app/mcp/oauth/register/route.ts`<br>`Web/src/app/mcp/route.ts`<br>`Web/src/app/mcp/public/route.ts`<br>`Web/src/app/mcp/__tests__/route.test.ts` | `cd Web && npx vitest run src/app/mcp/__tests__/route.test.ts` |
| **Wave 1** | **Agent-1B** (`ai-ssrf-and-optin`) | **RF-003**, **RF-010** | `Web/src/lib/ai/providers.ts`<br>`Web/src/lib/ai/usage.ts`<br>`Web/src/app/api/ai/test-key/route.ts`<br>`Web/src/app/api/plan-advanced/[goalId]/ai-analysis/route.ts`<br>`Web/src/app/api/plan-advanced/[goalId]/ai-chat/route.ts` | `cd Web && npx vitest run src/lib/ai/__tests__/providers.test.ts` |
| **Wave 1** | **Agent-1C** (`admin-ratelimit-and-tokens`) | **RF-004**, **RF-006** | `Web/src/lib/rateLimitAdmin.ts`<br>`Web/docker-compose.yml`<br>`Web/src/app/api/admin/users/[id]/reset-password/route.ts`<br>`Web/src/app/api/auth/reset-password/route.ts`<br>`Web/src/app/api/settings/mcp-tokens/route.ts` *(new)* | `cd Web && npx vitest run src/lib/__tests__/rateLimitAdmin.test.ts` |
| **Wave 2** | **Agent-2A** (`plan-tenant-and-bounds`) | **RF-005**, **RF-009** | `Web/src/lib/plan/snapshot.ts`<br>`Web/src/lib/plan/__tests__/snapshot.test.ts`<br>`Web/src/app/api/workouts/[id]/route.ts`<br>`Web/src/app/api/plan-advanced/[goalId]/workouts/route.ts`<br>`Web/src/app/api/plan-advanced/[goalId]/workouts/[workoutId]/route.ts`<br>`Web/src/app/api/mobile/v1/workouts/[id]/route.ts`<br>`Web/src/app/api/plan-advanced/[goalId]/apply-template/route.ts`<br>`Web/src/app/api/plan-advanced/[goalId]/template/route.ts` | `cd Web && npx vitest run src/lib/plan/__tests__/snapshot.test.ts` |
| **Wave 2** | **Agent-2B** (`health-and-gdpr-lifecycle`) | **RF-008**, **RF-011** | `Web/src/app/api/health/nutrition/log/route.ts`<br>`Web/src/app/api/mobile/v1/health/nutrition/log/route.ts`<br>`Web/src/app/api/webhooks/strava/route.ts`<br>`Web/src/app/api/cron/cleanup-inactive-users/route.ts`<br>`Web/src/app/api/user/delete/route.ts` | `cd Web && npx vitest run src/app/api/webhooks/strava/__tests__/route.test.ts` |
| **Wave 2** | **Agent-2C** (`android-origin-auth-guard`) | **RF-012** | `android/app/src/main/java/com/runflow2/app/data/net/Api.kt`<br>`android/app/src/main/java/com/runflow2/app/data/repo/SettingsRepository.kt`<br>`android/app/src/main/java/com/runflow2/app/data/net/NetworkClient.kt`<br>`android/app/src/test/java/com/runflow2/app/ApiContractTest.kt` | `cd android && ./gradlew testDebugUnitTest --tests com.runflow2.app.ApiContractTest` |

## 3. Ready-to-Paste Google Antigravity Agent Prompts

### Wave 1 — Spawn Agents 1A, 1B, and 1C in Parallel

#### Agent-1A Prompt (`mcp-oauth-guard` — Fixes `RF-001`, `RF-002`, `RF-007`)

> **Role**: Security Fix Agent `mcp-oauth-guard` (Model: Gemini 3.8 Flash Medium)
> **Exclusive Write Scope**:
> - `Web/src/lib/mcp/oauth.ts`
> - `Web/src/app/mcp/oauth/authorize/route.ts`
> - `Web/src/app/mcp/authorize/page.tsx`
> - `Web/src/app/mcp/oauth/register/route.ts`
> - `Web/src/app/mcp/route.ts`
> - `Web/src/app/mcp/public/route.ts`
> - `Web/src/app/mcp/__tests__/route.test.ts`
> **Do NOT edit any files outside your Exclusive Write Scope.**
>
> **Tasks**:
> 1. **Fix `RF-007` (Canonical Origin Precedence)**:
>    - In `Web/src/lib/mcp/oauth.ts` (`getPublicOrigin`, lines 45–64), `Web/src/app/mcp/route.ts` (`getOrigin`, lines 24–42), and `Web/src/app/mcp/public/route.ts` (lines 529–540), check `process.env.NEXTAUTH_URL` and `process.env.NEXT_PUBLIC_APP_URL` **first** (whenever they are set and do not contain `0.0.0.0`), before reading `x-forwarded-host` or `host` request headers.
> 2. **Fix `RF-001` (OAuth 2.1 Redirect URI Injection, Client ID Spoofing & Consent Display)**:
>    - In `Web/src/app/mcp/oauth/register/route.ts` (lines 104–106), delete `if (client_id && typeof client_id === 'string') { clientData.clientId = client_id; }` so `clientId` is always server-generated by Prisma (`cuid()`), and require `normalizedRedirectUris.length >= 1`.
>    - In `Web/src/app/mcp/oauth/authorize/route.ts` (`GET` lines 26–57 and `POST` lines 164–201) and `Web/src/app/mcp/authorize/page.tsx` (lines 97–165), **remove all automatic `prisma.mcpOAuthClient.create` and `prisma.mcpOAuthClient.update` calls**. Instead, look up `client = await prisma.mcpOAuthClient.findUnique({ where: { clientId } })`, verify `client` exists, and verify `Array.isArray(client.redirectUris) && (client.redirectUris as string[]).includes(redirectUri)`. If the client does not exist or `redirectUri` is not in `client.redirectUris`, reject with HTTP 400 (`invalid_client` or `invalid_redirect_uri`).
>    - In `Web/src/app/mcp/authorize/page.tsx` (around line 275), display the exact callback target (`redirect_uri` origin/scheme, e.g., `Callback URL: ${new URL(redirect_uri).origin}${new URL(redirect_uri).pathname}`) inside the consent card so the user sees where their authorization code will be sent.
> 3. **Fix `RF-002` (Read-Only External API Key Privilege Escalation on `/mcp`)**:
>    - In `Web/src/app/mcp/route.ts` (`authenticatePaidUser`, lines 1575–1626), include `authType: 'oauth' | 'api_key'` in the returned object (`'oauth'` when authenticated via `validateMcpAccessToken`, `'api_key'` when authenticated via `validateApiKey`).
>    - In `POST /mcp` (`tools/call` handler), define `const WRITE_MCP_TOOLS = new Set(['log_workout_completion', 'modify_workout', 'create_training_plan', 'delete_workout', 'recalibrate_thresholds', 'save_coaching_summary']);` and reject calls where `auth.authType === 'api_key' && WRITE_MCP_TOOLS.has(toolName)` with HTTP 403 / JSON-RPC error `-32003` (`"External API keys (rf_*) are read-only; authorize via MCP OAuth 2.1 for write tools"`).
> 4. **Verify**:
>    - Update `Web/src/app/mcp/__tests__/route.test.ts` to add regression tests for `RF-001`, `RF-002`, and `RF-007` and run:
>      `cd Web && npx vitest run src/app/mcp/__tests__/route.test.ts`

#### Agent-1B Prompt (`ai-ssrf-and-optin` — Fixes `RF-003`, `RF-010`)

> **Role**: Security Fix Agent `ai-ssrf-and-optin` (Model: Gemini 3.8 Flash Medium)
> **Exclusive Write Scope**:
> - `Web/src/lib/ai/providers.ts`
> - `Web/src/lib/ai/usage.ts`
> - `Web/src/app/api/ai/test-key/route.ts`
> - `Web/src/app/api/plan-advanced/[goalId]/ai-analysis/route.ts`
> - `Web/src/app/api/plan-advanced/[goalId]/ai-chat/route.ts`
> **Do NOT edit any files outside your Exclusive Write Scope.**
>
> **Tasks**:
> 1. **Fix `RF-003` (`POST /api/ai/test-key` SSRF, Model Path Traversal & Response Reflection)**:
>    - In `Web/src/app/api/ai/test-key/route.ts`:
>      - Add rate limiting at the start of `POST`: `const clientId = getClientIdentifier(request); const rl = await checkRateLimitAsync(clientId, RATE_LIMITS.settings); if (!rl.allowed) return NextResponse.json({ valid: false, error: 'Too many requests' }, { status: 429 });`
>      - Validate `baseUrl`: unless the authenticated user is an admin (`session.user.isAdmin`), enforce `if (!validateBaseUrl(baseUrl)) return NextResponse.json({ valid: false, error: 'Base URL must be a supported HTTPS AI provider endpoint' }, { status: 400 });`
>      - Validate `model`: `if (typeof model !== 'string' || !/^[A-Za-z0-9._:/-]+$/.test(model) || model.includes('..')) return NextResponse.json({ valid: false, error: 'Invalid model identifier' }, { status: 400 });`
>    - In `Web/src/lib/ai/providers.ts`:
>      - In `validateUrl` (line 131), require `parsed.protocol === 'https:'` (reject `http:`).
>      - In `testAiConfig` (lines 1179–1241), encode `config.model` in the Google branch (`const url = `${config.baseUrl.replace(/\/$/, '')}/v1beta/models/${encodeURIComponent(config.model)}`;`), remove `allowedUrls: [config.baseUrl]` (or pass `allowedUrls` only when explicitly authorized by admin), and return status-code-only error messages (`API returned ${res.status}`) without reflecting raw upstream response bodies via `boundEchoText`.
> 2. **Fix `RF-010` (AI Opt-In Gate & Prompt Fencing in Advanced Plan AI Routes)**:
>    - In `Web/src/app/api/plan-advanced/[goalId]/ai-chat/route.ts` (`checkPremium`, lines 19–29) and `Web/src/app/api/plan-advanced/[goalId]/ai-analysis/route.ts` (`checkPremium`, lines 9–19), select `aiSettings: { select: { usageTier: true, aiEnabled: true, adminAllowed: true } }` and require `Boolean(user?.aiSettings?.aiEnabled && user?.aiSettings?.adminAllowed)` in addition to `tier === 'tier2' || tier === 'tier3' || user?.isAdmin`.
>    - In `Web/src/lib/ai/usage.ts` (`reserveUsageSlot`, lines 364–378), check `if (!userSettings.aiEnabled || (!userSettings.adminAllowed && !isByokActive(userSettings))) return { allowed: false, claimed: false, reason: 'AI features are not enabled for your account' };`.
>    - In `Web/src/app/api/plan-advanced/[goalId]/ai-analysis/route.ts` (`buildUserPrompt`, lines 72–91), import `fenceUntrusted` from `@/lib/ai/prompts` and wrap `goal.name`, `w.description`, and `context` (capped to 2,000 characters) with `fenceUntrusted(...)`.
> 3. **Verify**:
>    - Run `cd Web && npx vitest run src/lib/ai` (or `npx tsc --noEmit`) to verify all AI provider and route types compile cleanly.

#### Agent-1C Prompt (`admin-ratelimit-and-tokens` — Fixes `RF-004`, `RF-006`)

> **Role**: Security Fix Agent `admin-ratelimit-and-tokens` (Model: Gemini 3.8 Flash Medium)
> **Exclusive Write Scope**:
> - `Web/src/lib/rateLimitAdmin.ts`
> - `Web/docker-compose.yml`
> - `Web/src/app/api/admin/users/[id]/reset-password/route.ts`
> - `Web/src/app/api/auth/reset-password/route.ts`
> - `Web/src/app/api/settings/mcp-tokens/route.ts` *(new file)*
> **Do NOT edit any files outside your Exclusive Write Scope.**
>
> **Tasks**:
> 1. **Fix `RF-004` (Global Admin Rate-Limit Lockout When `TRUSTED_PROXY_COUNT=0`)**:
>    - In `Web/src/lib/rateLimitAdmin.ts`:
>      - Never classify a caller into the shared `'auth-admin'` bucket based on unverified `Authorization: Bearer` or `Cookie: runflow_admin_token=` headers.
>      - When `getClientIP(request)` returns `'unknown'` (because `TRUSTED_PROXY_COUNT === 0`), derive a per-caller fallback bucket identifier using a SHA-256 prefix of `(request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',').pop()?.trim() || 'no-ip') + '|' + (request.headers.get('user-agent') || 'no-ua')` so a single unauthenticated client cannot lock out `anon-login:sensitive` or `auth-admin:*` for all other administrators.
>    - In `Web/docker-compose.yml` (line 26), update `TRUSTED_PROXY_COUNT=${TRUSTED_PROXY_COUNT:-1}` with a comment explaining that Docker/reverse-proxy deployments have 1 trusted proxy hop.
> 2. **Fix `RF-006` (Password Reset Token Revocation & MCP Token Revocation Endpoint)**:
>    - In `Web/src/app/api/admin/users/[id]/reset-password/route.ts` (lines 50–56), wrap the password update in `prisma.$transaction` that increments `tokenVersion: { increment: 1 }`, sets `revokedAt: new Date()` on all unrevoked `prisma.mcpOAuthToken` rows for `userId`, and deletes `prisma.mcpOAuthCode` rows for `userId`.
>    - In `Web/src/app/api/auth/reset-password/route.ts` (lines 55–65), include `prisma.mcpOAuthToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } })` and `prisma.mcpOAuthCode.deleteMany({ where: { userId: user.id } })` alongside the `tokenVersion` increment.
>    - Create `Web/src/app/api/settings/mcp-tokens/route.ts` implementing authenticated `GET` (lists active `McpOAuthToken` grants with `id`, `clientId`, `client.clientName`, `scope`, `createdAt`, `lastUsedAt`, `expiresAt`) and `DELETE` (revokes a specific `tokenId` or all MCP tokens for `session.user.id` by setting `revokedAt: new Date()`).
> 3. **Verify**:
>    - Run `cd Web && npx vitest run` on admin/auth rate-limit tests or `npx tsc --noEmit`.

### Wave 2 — Spawn Agents 2A, 2B, and 2C in Parallel (After Wave 1 Completes)

#### Agent-2A Prompt (`plan-tenant-and-bounds` — Fixes `RF-005`, `RF-009`)

> **Role**: Security Fix Agent `plan-tenant-and-bounds` (Model: Gemini 3.8 Flash Medium)
> **Exclusive Write Scope**:
> - `Web/src/lib/plan/snapshot.ts`
> - `Web/src/lib/plan/__tests__/snapshot.test.ts`
> - `Web/src/app/api/workouts/[id]/route.ts`
> - `Web/src/app/api/plan-advanced/[goalId]/workouts/route.ts`
> - `Web/src/app/api/plan-advanced/[goalId]/workouts/[workoutId]/route.ts`
> - `Web/src/app/api/mobile/v1/workouts/[id]/route.ts`
> - `Web/src/app/api/plan-advanced/[goalId]/apply-template/route.ts`
> - `Web/src/app/api/plan-advanced/[goalId]/template/route.ts`
> **Do NOT edit any files outside your Exclusive Write Scope.**
>
> **Tasks**:
> 1. **Fix `RF-005` (`PlanSnapshot` Cross-Goal IDOR & `subGoalId` Ownership Validation)**:
>    - In `Web/src/lib/plan/snapshot.ts` (`restoreFromSnapshot`, lines 86–96), replace `prisma.planSnapshot.findUnique({ where: { id: snapshotId } })` with:
>      ```ts
>      const snapshot = await prisma.planSnapshot.findFirst({
>          where: {
>              goalId,
>              ...(snapshotId ? { id: snapshotId } : {}),
>              OR: [{ operation: null }, { operation: { not: 'coaching_summary' } }],
>          },
>          orderBy: { createdAt: 'desc' },
>      });
>      ```
>    - In `Web/src/app/api/workouts/[id]/route.ts`, `Web/src/app/api/plan-advanced/[goalId]/workouts/route.ts`, `Web/src/app/api/plan-advanced/[goalId]/workouts/[workoutId]/route.ts`, and `Web/src/app/api/mobile/v1/workouts/[id]/route.ts`, whenever `body.subGoalId` (or `subGoalId`) is a non-empty string, verify ownership before creating/updating the workout:
>      ```ts
>      const subGoal = await prisma.goal.findFirst({
>          where: { id: String(body.subGoalId), userId: user.id, parentGoalId: goalId },
>          select: { id: true },
>      });
>      if (!subGoal) return NextResponse.json({ error: 'Sub-goal not found' }, { status: 404 });
>      ```
> 2. **Fix `RF-009` (Unbounded Week Template Range & `days` Array DoS)**:
>    - In `Web/src/app/api/plan-advanced/[goalId]/template/route.ts` (`POST` line 79 and `PUT` line 139), enforce `days.length <= 28` (`if (!Array.isArray(days) || days.length === 0 || days.length > 28)` -> return 400).
>    - In `Web/src/app/api/plan-advanced/[goalId]/apply-template/route.ts` (lines 79–99), enforce `weekEndIndex <= 52 && (weekEndIndex - weekStartIndex) <= 26` and `days.length <= 28` (matching `progression/apply/route.ts`), and batch the workout creations with `tx.workout.createMany({ data: rows })`.
> 3. **Verify**:
>    - Update `Web/src/lib/plan/__tests__/snapshot.test.ts` to assert that `restoreFromSnapshot(goalId, snapshotId)` scopes the query by `goalId` and run:
>      `cd Web && npx vitest run src/lib/plan/__tests__/snapshot.test.ts`

#### Agent-2B Prompt (`health-and-gdpr-lifecycle` — Fixes `RF-008`, `RF-011`)

> **Role**: Security Fix Agent `health-and-gdpr-lifecycle` (Model: Gemini 3.8 Flash Medium)
> **Exclusive Write Scope**:
> - `Web/src/app/api/health/nutrition/log/route.ts`
> - `Web/src/app/api/mobile/v1/health/nutrition/log/route.ts`
> - `Web/src/app/api/webhooks/strava/route.ts`
> - `Web/src/app/api/cron/cleanup-inactive-users/route.ts`
> - `Web/src/app/api/user/delete/route.ts`
> **Do NOT edit any files outside your Exclusive Write Scope.**
>
> **Tasks**:
> 1. **Fix `RF-008` (Global `FoodItem` Barcode Poisoning & Web `HEALTH_DATA` Consent Gate)**:
>    - In `Web/src/app/api/health/nutrition/log/route.ts`:
>      - Import and enforce `healthDataConsentWithdrawn(userId)` from `@/lib/health/consent-gate` (returning HTTP 400 `HEALTH_DATA_WITHDRAWN_MESSAGE` when withdrawn).
>      - Validate `quantity` (`typeof quantity === 'number' && Number.isFinite(quantity) && quantity > 0 && quantity <= 1000`) and `foodItem` numeric fields (`calories`, `protein`, `carbs`, `fats` finite and `>= 0`).
>      - Do **not** upsert caller-supplied `foodItem` macros onto a global `barcode` in `FoodItem`. Instead, if `foodItem.barcode` is provided, look up `existing = await prisma.foodItem.findUnique({ where: { barcode: String(foodItem.barcode) } })`; if found, use `existing`, and if not found, create the user's custom `FoodItem` with `barcode: null` so unverified client payloads cannot poison the global barcode catalog for other users. Apply the same `barcode: null` rule on unverified client creates in `Web/src/app/api/mobile/v1/health/nutrition/log/route.ts` (lines 53–68).
>      - Replace the raw `error.message` 500 response on line 90 of `Web/src/app/api/health/nutrition/log/route.ts` with `{ error: 'Internal server error' }`.
> 2. **Fix `RF-011` (Complete Non-FK Telemetry Deletion & Safe Strava Deauthorization)**:
>    - In `Web/src/app/api/cron/cleanup-inactive-users/route.ts` (lines 74–81), replace `prisma.user.deleteMany` with a `prisma.$transaction` that deletes `apiRouteMetric`, `errorLog`, `sessionReplay` (`where: { userId: { in: userIds } }`), and `user` (`where: { id: { in: userIds } }`).
>    - In `Web/src/app/api/webhooks/strava/route.ts` (lines 157–179):
>      - If `account.user.passwordHash` is non-null (the user has an email/password login and merely linked Strava), disconnect Strava inside a transaction (`tx.account.deleteMany({ where: { userId: account.userId, provider: 'strava' } })` and clear `stravaId`, `stravaAccessToken`, `stravaRefreshToken`, `stravaTokenExpiry` on `tx.user`) instead of wiping their entire RunFlow account.
>      - If `account.user.passwordHash` is null (Strava-only account), delete `apiRouteMetric`, `errorLog`, `sessionReplay`, and `user` inside a single `prisma.$transaction`.
> 3. **Verify**:
>    - Run `cd Web && npx tsc --noEmit` to confirm clean compilation.

#### Agent-2C Prompt (`android-origin-auth-guard` — Fixes `RF-012`)

> **Role**: Security Fix Agent `android-origin-auth-guard` (Model: Gemini 3.8 Flash Medium)
> **Exclusive Write Scope**:
> - `android/app/src/main/java/com/runflow2/app/data/net/Api.kt`
> - `android/app/src/main/java/com/runflow2/app/data/repo/SettingsRepository.kt`
> - `android/app/src/main/java/com/runflow2/app/data/net/NetworkClient.kt`
> - `android/app/src/test/java/com/runflow2/app/ApiContractTest.kt`
> **Do NOT edit any files outside your Exclusive Write Scope.**
>
> **Tasks**:
> 1. **Fix `RF-012` (Enforce HTTPS in `Api.normalizeServerUrl` & Clear `AuthStore` on Server Origin Switch)**:
>    - In `android/app/src/main/java/com/runflow2/app/data/net/Api.kt` (`normalizeServerUrl`, lines 64–73), reject or upgrade `http://` to `https://` for all non-loopback hosts (only allowing `http://10.0.2.2`, `http://localhost`, or `http://127.0.0.1` for local emulator testing, and forcing `https://` for everything else).
>    - In `android/app/src/main/java/com/runflow2/app/data/net/NetworkClient.kt`, track the `previousBaseUrl` when observing `settings.settings`; whenever the normalized `baseUrl` changes from a non-null `previousBaseUrl` to a different origin, call `authStore.clear()` before rebuilding the OkHttp/Retrofit client so production Bearer and refresh tokens are never transmitted to a newly configured server URL.
> 2. **Verify**:
>    - Add unit test assertions in `android/app/src/test/java/com/runflow2/app/ApiContractTest.kt` verifying that `Api.normalizeServerUrl("http://evil.example.com")` normalizes to `"https://evil.example.com"` and run:
>      `cd android && ./gradlew testDebugUnitTest --tests com.runflow2.app.ApiContractTest`

## 4. Final Coordinator Gate (Post-Wave 2 Verification)

Once Wave 1 and Wave 2 agents report completion in Google Antigravity, run the Coordinator Gate to confirm zero regressions across both `Web/` and `android/`:

1. **TypeScript Typecheck & Linting**:
   ```bash
   cd Web && npx tsc --noEmit
   ```
2. **Web Vitest Unit & Integration Suite**:
   ```bash
   cd Web && npx vitest run
   ```
3. **Android Unit Test Suite**:
   ```bash
   cd android && ./gradlew testDebugUnitTest
   ```
4. **Security Invariant Re-Verification**:
   Re-run the verification scripts (`verify_batch1.js` and `verify_batch2.js`) to confirm all 12 vulnerability checks flip from vulnerable to remediated.
