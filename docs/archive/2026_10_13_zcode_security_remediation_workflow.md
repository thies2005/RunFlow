# RunFlow Z Code (C4AI / Z.ai) Post-Upgrade Security Remediation & Hardening Workflow

## Multi-Agent + Review-Gate Execution Blueprint for 3.8 Flash Orchestrator & Sub-Agents

Date: 2026-10-13 · Prerequisite: Run **after** `2026_10_13_zcode_master_workflow.md` (`DB-1` through `QA-1`) completes

> **CRITICAL INSTRUCTIONS FOR THE EXECUTING MODEL (3.8 FLASH) & ORCHESTRATOR:**
> 1. **Sequential Execution Only**: Execute tasks strictly in order: `SEC-1` → `SEC-2` → `SEC-3` → `SEC-4` → `SEC-5` → `SEC-6` → `SEC-QA`. Never run two code-writing sub-agents in parallel on the same working tree.
> 2. **Mandatory Two-Agent Loop Per Task (Coder Agent + Adversarial Security Reviewer Agent)**:
>    - For every task `SEC-1` through `SEC-6`, first spawn the **Coder Sub-Agent** with the exact task specification below.
>    - Immediately after the Coder Sub-Agent finishes and passes the automated command gate, spawn a fresh **Adversarial Reviewer Sub-Agent** (read-only) using the task's **Reviewer Gate Checklist**.
>    - The Orchestrator MUST NOT advance to the next task until the Reviewer Sub-Agent returns `VERDICT: PASS` with exact `file:line` citations for every checklist item. If the Reviewer returns `FAIL`, feed the exact failed items back to the Coder Sub-Agent and re-run the gate.
> 3. **Preserve All Newly Built Features**: The preceding workflow (`2026_10_13_zcode_master_workflow.md`) added Structured Workouts v2 (`Web/src/lib/plans/structured.ts`), Day-to-Day Calendar (`/calendar`), Advanced Plan Studio (`/plan-advanced/[goalId]`), Deep Cycling Power Analytics (`Web/src/lib/metrics/power.ts`, `/api/analytics/cycling`, `ActivityDetailsModal.tsx`, Android `AnalyticsScreen.kt`), and Dual-MCP (`/mcp`, `/mcp/public`, `/mcp/oauth/*`). **Never revert or delete those features**—apply the surgical security fixes below on top of the upgraded codebase.
> 4. **Git Hygiene**: Never run `git add .` or `git add -A`. Stage only the explicit files modified in each task.

| Gate Name | Command to Execute | Pass Requirement |
| :--- | :--- | :--- |
| `pg-gate` | `cd Web && npx prisma validate && npx prisma generate` | Exit code `0` |
| `web-gate` | `cd Web && npm test -- --passWithNoTests` | Exit code `0`, 0 failed tests |
| `web-ui-gate` | `cd Web && npm test -- --passWithNoTests && npm run build` | Exit code `0`, clean Next.js build |
| `android-gate` | `cd android && ./gradlew :app:compileDebugKotlin testDebugUnitTest --console=plain` | Exit code `0`, 0 failed unit tests |

## Task `SEC-1` — `fix(security): resolve global admin rate-limit lockout, enforce admin CSRF across all mutations, and bind fallback admin username`

* **Fixes Audit Findings**:
  * `dos-admin-rate-limit-global-lockout` (High)
  * `csrf-admin-state-changing-routes` (Medium)
  * `deploy-proxy-trust-header-alignment` (Deployment Hardening)
* **Gate**: `web-gate`
* **Files**:
  * Modify: `Web/src/lib/rateLimitAdmin.ts`
  * Modify: `Web/src/lib/admin/auth.ts`
  * Modify: `Web/src/app/api/admin/users/[id]/route.ts`
  * Modify: `Web/src/app/api/admin/run-migration/route.ts`
  * Modify: `Web/src/app/api/admin/recalculate-fitness/route.ts`
  * Modify: `Web/src/app/api/admin/releases/route.ts`
  * Modify: `Web/src/app/api/admin/error-logs/[id]/route.ts`
  * Modify: `Web/docker-compose.yml`
  * Modify: `Web/docker-compose.coolify.yml`
  * Create: `Web/src/lib/__tests__/rateLimitAdmin.security.test.ts`

### Step-by-Step Instructions for Coder Sub-Agent:

1. **Fix Redis Self-DoS Bug in `Web/src/lib/rateLimitAdmin.ts` (`isIPBlockedRedis`)**:
   * Open `Web/src/lib/rateLimitAdmin.ts` around lines `150–163`.
   * **Bug**: `isIPBlockedRedis` currently calls `await client.incr(key)` on `admin:violations:<ip>` during every `adminRateLimitRedis` check (line 221), incrementing the violation counter on every normal admin request and locking out all admins after 4 requests!
   * **Replace `isIPBlockedRedis` with a pure read-only check**:
     ```ts
     async function isIPBlockedRedis(client: RedisClient, ip: string): Promise<boolean> {
         try {
             const key = getViolationKey(ip);
             const raw = await client.get(key);
             const count = raw ? parseInt(raw, 10) : 0;
             if (!Number.isFinite(count) || count < VIOLATION_THRESHOLD) {
                 return false;
             }
             const ttl = await client.ttl(key);
             return ttl > 0;
         } catch {
             return false;
         }
     }
     ```

2. **Isolate Unauthenticated `/api/admin/login` Rate-Limit Buckets from Authenticated Admin Operations in `Web/src/lib/rateLimitAdmin.ts`**:
   * **Bug**: When `TRUSTED_PROXY_COUNT` is `0` or unset, `getClientIP(request)` returns `'unknown'` for every caller. Because `POST /api/admin/login` calls `adminRateLimit(request, 'sensitive')` before credential verification, an unauthenticated attacker sending 8 requests to `/api/admin/login` blocks `'unknown'` for 15 minutes across **all** `/api/admin/*` endpoints, locking out every legitimate administrator.
   * **Fix in `Web/src/lib/rateLimitAdmin.ts`**:
     * In `adminRateLimit(request: Request, operation: AdminOperation)` (around line 195), determine whether the request carries a valid admin token or session cookie header (`request.headers.get('authorization')?.startsWith('Bearer ') || request.headers.get('cookie')?.includes('runflow_admin_token=')`).
     * Key the rate-limit and violation buckets by scope so unauthenticated requests cannot poison the authenticated bucket when `ip === 'unknown'`:
       ```ts
       const rawIp = getClientIP(request);
       const hasAdminCookieOrBearer =
           Boolean(request.headers.get('authorization')?.startsWith('Bearer ')) ||
           Boolean(request.headers.get('cookie')?.includes('runflow_admin_token='));
       const effectiveBucketId =
           rawIp === 'unknown'
               ? `${hasAdminCookieOrBearer ? 'auth-admin' : 'anon-login'}:${operation}`
               : rawIp;
       ```
     * Pass `effectiveBucketId` (instead of bare `ip`) to `adminRateLimitRedis` and `adminRateLimitInMemory`.

3. **Bind Fallback Username in `verifyAdminCredentials` (`Web/src/lib/admin/auth.ts:84-88`)**:
   * Open `Web/src/lib/admin/auth.ts` around lines `84–88`:
     ```ts
     if (adminPasswordHash && !adminUsername) {
         if (await bcrypt.compare(password, adminPasswordHash)) {
             return true;
         }
     }
     ```
   * **Bug**: When `ADMIN_PASSWORD_HASH` is set without `ADMIN_USERNAME`, `verifyAdminCredentials` accepts **any** `username` string and `POST /api/admin/login` signs that arbitrary string into the JWT and `AdminAuditLog`.
   * **Replace lines `84–88` with**:
     ```ts
     if (adminPasswordHash && !adminUsername) {
         if (safeCompare(username, 'admin') && (await bcrypt.compare(password, adminPasswordHash))) {
             return true;
         }
     }
     ```

4. **Enforce `validateCsrfToken(request)` on All Cookie-Authenticated Admin Mutations**:
   * **Centralized Defense-in-Depth in `Web/src/lib/admin/auth.ts` (`requireAdmin`)**:
     * Inside `requireAdmin(request: NextRequest)` (around line 159), after authenticating via cookie (when `Authorization: Bearer ...` was NOT used to authenticate), check if `request.method` is a mutating HTTP method (`!['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())`). If so, call `validateCsrfToken(request)` from `@/lib/admin/csrf` and return `csrfErrorResponse()` (`status: 403`) when invalid!
   * **Explicit Route-Level Enforcement**: Also add explicit `if (!validateCsrfToken(request)) { return csrfErrorResponse(); }` (and `adminRateLimit` on `run-migration`) at the top of the mutation handlers in:
     * `Web/src/app/api/admin/users/[id]/route.ts` (`DELETE`)
     * `Web/src/app/api/admin/run-migration/route.ts` (`POST` — also add `adminRateLimit(request, 'sensitive')`)
     * `Web/src/app/api/admin/recalculate-fitness/route.ts` (`POST`)
     * `Web/src/app/api/admin/releases/route.ts` (`POST`, `DELETE`)
     * `Web/src/app/api/admin/error-logs/[id]/route.ts` (`PATCH`, `DELETE`)
   * Update any existing unit tests for those 5 admin routes so mocked `NextRequest` objects in tests include either an `Authorization: Bearer ...` header or a valid CSRF cookie/header pair.

5. **Document & Default `TRUSTED_PROXY_COUNT` in Docker Compose Files**:
   * In `Web/docker-compose.yml` and `Web/docker-compose.coolify.yml` under `services.runflow-app.environment`, add:
     ```yaml
     TRUSTED_PROXY_COUNT: ${TRUSTED_PROXY_COUNT:-0}
     TRUSTED_CLIENT_IP_HEADER: ${TRUSTED_CLIENT_IP_HEADER:-}
     ```

6. **Write Unit Tests in `Web/src/lib/__tests__/rateLimitAdmin.security.test.ts`**:
   * Test 1: 10 consecutive valid `adminRateLimit(req, 'read')` calls with Redis mocked (`get`, `incr`, `expire`, `ttl`) do **not** increment `admin:violations:*` and all 10 succeed.
   * Test 2: 10 unauthenticated `adminRateLimit(req, 'sensitive')` calls without `runflow_admin_token` cookie (when `TRUSTED_PROXY_COUNT=0`) block the `anon-login` bucket on the 8th call, while a subsequent request carrying `Cookie: runflow_admin_token=...` still succeeds.
   * Test 3: `verifyAdminCredentials('spoofed-actor', validPassword)` returns `false` when `ADMIN_PASSWORD_HASH` is set and `ADMIN_USERNAME` is unset, while `verifyAdminCredentials('admin', validPassword)` returns `true`.

### Reviewer Gate Checklist (`SEC-1`):
* [ ] Confirm `Web/src/lib/rateLimitAdmin.ts` `isIPBlockedRedis` calls `client.get(key)` and NEVER calls `client.incr(key)`.
* [ ] Confirm unauthenticated `/api/admin/login` requests with `rawIp === 'unknown'` cannot block authenticated `/api/admin/*` requests.
* [ ] Confirm `Web/src/lib/admin/auth.ts` `verifyAdminCredentials` requires `safeCompare(username, 'admin')` when `ADMIN_PASSWORD_HASH` is set without `ADMIN_USERNAME`.
* [ ] Confirm `validateCsrfToken` is enforced on all 5 admin mutation routes and inside `requireAdmin` for cookie-authenticated non-GET/HEAD/OPTIONS requests.

## Task `SEC-2` — `fix(security): close BYOK customApiKey quota bypass, meter all Plan/Health AI routes, unify daily counter resets, and redact aiInsightApiKey`

* **Fixes Audit Findings**:
  * `authz-ai-tier-quota-bypass-custom-key` (High)
  * `dos-ai-quota-bypass-and-shared-reset-clobber` (Medium)
  * `data-exposure-nutrition-target-api-key` (Medium)
* **Gate**: `web-gate`
* **Files**:
  * Modify: `Web/src/lib/ai/usage.ts`
  * Modify: `Web/src/app/api/ai/settings/route.ts`
  * Modify: `Web/src/app/api/plan-advanced/[goalId]/ai-chat/route.ts`
  * Modify: `Web/src/app/api/plan-advanced/[goalId]/ai-analysis/route.ts`
  * Modify: `Web/src/app/api/health/insights/generate/route.ts`
  * Modify: `Web/src/app/api/health/nutrition/suggest/route.ts`
  * Modify: `Web/src/app/api/mobile/v1/health/nutrition/suggest/route.ts`
  * Modify: `Web/src/app/api/health/nutrition/scan-image/route.ts`
  * Modify: `Web/src/lib/ai/feedback.ts`
  * Modify: `Web/src/app/api/health/nutrition/target/route.ts`
  * Modify: `Web/src/app/api/mobile/v1/health/nutrition/target/route.ts`
  * Create: `Web/src/lib/ai/__tests__/usage.security.test.ts`

### Step-by-Step Instructions for Coder Sub-Agent:

1. **Fix Managed-Tier BYOK Quota Bypass in `Web/src/lib/ai/usage.ts` (`lines 80 & 330`)**:
   * **Bug**: `checkUsageLimit` (`line 80`) and `reserveUsageSlot` (`line 330`) check `if (userSettings?.customApiKey)` without checking `userSettings.usageTier === 'none'`. Meanwhile, `getAiConfig` (`providers.ts:297`) and `getAiConfigForModel` (`providers.ts:404`) only use `customApiKey` when `userSettings.customApiKey && userSettings.usageTier === 'none'`. Thus, any user on `tier1`, `tier2`, or `tier3` who sets a dummy `customApiKey` gets `dailyLimit: Infinity` while billing the platform's `activeProvider` API key!
   * **Fix in `Web/src/lib/ai/usage.ts`**:
     * Add an exported helper:
       ```ts
       export function isByokActive(
           userSettings?: { customApiKey?: string | null; usageTier?: string | null } | null
       ): boolean {
           return Boolean(userSettings?.customApiKey && (userSettings.usageTier || 'none') === 'none');
       }
       ```
     * In `checkUsageLimit` (`line 80`), replace `if (userSettings?.customApiKey)` with `if (isByokActive(userSettings))`.
     * In `reserveUsageSlot` (`line 330`), replace `if (userSettings.customApiKey)` with `if (isByokActive(userSettings))`.
     * In `incrementUsage` (around lines `190–255`), only skip platform provider token accounting when `isByokActive(userSettings)` is `true`!

2. **Eliminate the Shared `lastUsageReset` Daily Rollover Clobber Across All 4 AI Features**:
   * **Bug**: `UserAiSettings.lastUsageReset` is shared across chat (`usage.ts`), calorie image scans (`scan-image/route.ts:96`), activity feedback (`feedback.ts:119`), and meal suggestions (`nutrition/suggest/route.ts:199`). When any one feature runs first on a new day, it updates `lastUsageReset = now` while resetting *only* its own counter, leaving the other 3 features' daily counters permanently stuck at yesterday's values!
   * **Fix in `Web/src/lib/ai/usage.ts`**:
     * Create and export an atomic daily/monthly reset function `ensurePeriodUsageReset(userId: string)` in `Web/src/lib/ai/usage.ts`:
       ```ts
       export async function ensurePeriodUsageReset(userId: string): Promise<void> {
           const now = new Date();
           const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
           const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

           // 1. If lastUsageReset is from a previous month, reset BOTH monthly and daily counters atomically
           await prisma.userAiSettings.updateMany({
               where: { userId, lastUsageReset: { lt: startOfMonth } },
               data: {
                   messagesUsedToday: 0,
                   messagesUsedThisMonth: 0,
                   inputTokensUsedToday: 0,
                   outputTokensUsedToday: 0,
                   inputTokensUsedThisMonth: 0,
                   outputTokensUsedThisMonth: 0,
                   calScansUsedToday: 0,
                   mealSuggestsUsedToday: 0,
                   activityFeedbackUsedToday: 0,
                   lastUsageReset: now,
               },
           });

           // 2. If lastUsageReset is from earlier this month (before startOfToday), reset ALL daily counters atomically
           await prisma.userAiSettings.updateMany({
               where: { userId, lastUsageReset: { gte: startOfMonth, lt: startOfToday } },
               data: {
                   messagesUsedToday: 0,
                   inputTokensUsedToday: 0,
                   outputTokensUsedToday: 0,
                   calScansUsedToday: 0,
                   mealSuggestsUsedToday: 0,
                   activityFeedbackUsedToday: 0,
                   lastUsageReset: now,
               },
           });
       }
       ```
     * Call `await ensurePeriodUsageReset(userId)` at the beginning of `checkUsageLimit`, `reserveUsageSlot`, `incrementUsage`, `Web/src/app/api/health/nutrition/scan-image/route.ts`, `Web/src/lib/ai/feedback.ts`, `Web/src/app/api/health/nutrition/suggest/route.ts`, and `Web/src/app/api/mobile/v1/health/nutrition/suggest/route.ts`.
     * In `Web/src/app/api/health/nutrition/suggest/route.ts` and `Web/src/app/api/mobile/v1/health/nutrition/suggest/route.ts`, replace the non-atomic post-LLM `usedToday + 1` write with an atomic pre-LLM conditional reservation:
       ```ts
       await ensurePeriodUsageReset(userId);
       if (!isByokActive(userSettings)) {
           const claimed = await prisma.userAiSettings.updateMany({
               where: { userId, mealSuggestsUsedToday: { lt: dailyLimit } },
               data: { mealSuggestsUsedToday: { increment: 1 } },
           });
           if (claimed.count === 0) {
               return NextResponse.json(
                   { error: `Daily limit of ${dailyLimit} meal suggestions reached for your tier.` },
                   { status: 429 }
               );
           }
       }
       ```
       (And if `generateCompletion` throws before returning a response, decrement `mealSuggestsUsedToday` by 1 in the `catch` block).

3. **Enforce Quota Reservation, Provider Cap, and Token Accounting on Plan AI & Health Insights Routes**:
   * In `Web/src/app/api/plan-advanced/[goalId]/ai-chat/route.ts` (`POST`):
     * Bound input size: reject `message.length > 4000`, cap `history` to at most `10` entries with each `msg.content` truncated/validated to `<= 4000` characters (`typeof msg.content === 'string'`).
     * Before calling `streamChat`, call `const reservation = await reserveUsageSlot(session.user.id);` and if `!reservation.allowed`, return HTTP `429` (`{ error: reservation.reason || 'AI usage limit reached' }`).
     * If `builderConfig.config.providerId`, call `const provLimit = await checkProviderLimit(builderConfig.config.providerId)` and return HTTP `429` if `!provLimit.canUse`.
     * After streaming completes, call `await incrementUsage(session.user.id, inputTokensEstimate, outputTokensEstimate, builderConfig.config.providerId, { skipMessageIncrement: reservation.claimed })`; if streaming errors before yielding tokens and `reservation.claimed` is true, call `await releaseUsageReservation(session.user.id)`.
   * In `Web/src/app/api/plan-advanced/[goalId]/ai-analysis/route.ts` (`POST`) and `Web/src/app/api/health/insights/generate/route.ts` (`POST`):
     * Call `reserveUsageSlot(userId)` (and `checkProviderLimit(providerId)` when `providerId` is present) before invoking `generateCompletion`.
     * On success, call `incrementUsage(userId, inputTokensEstimate, outputTokensEstimate, providerId, { skipMessageIncrement: reservation.claimed })`. On failure before response, call `releaseUsageReservation(userId)` when `reservation.claimed` is true.

4. **Redact `aiInsightApiKey` in Web and Mobile Nutrition Target Endpoints**:
   * In `Web/src/app/api/health/nutrition/target/route.ts` (`GET` at lines `78–83` and `POST` at line `155`) and `Web/src/app/api/mobile/v1/health/nutrition/target/route.ts` (`GET` at lines `71–76` and `POST` at line `147`):
     * Destructure and strip `aiInsightApiKey` before returning JSON:
       ```ts
       const { aiInsightApiKey: _redactedKey, ...safeTarget } = returnTarget;
       return NextResponse.json({
           ...safeTarget,
           hasAiInsightApiKey: Boolean(returnTarget.aiInsightApiKey),
           userProfile: user,
           avgActiveCalories,
           isDefault: !target,
       });
       ```
     * And in `POST` on both routes:
       ```ts
       const { aiInsightApiKey: _redactedKey, ...safeTarget } = target;
       return NextResponse.json({
           ...safeTarget,
           hasAiInsightApiKey: Boolean(target.aiInsightApiKey),
       });
       ```

5. **Write Unit Tests in `Web/src/lib/ai/__tests__/usage.security.test.ts`**:
   * Test 1: User on `tier1` with `customApiKey: 'enc:dummy'` and `messagesUsedToday: 50` receives `canUse: false` from `checkUsageLimit` and `allowed: false` from `reserveUsageSlot`.
   * Test 2: User on `usageTier: 'none'` with `customApiKey: 'enc:valid'` receives `canUse: true` (`tier: 'byok'`).
   * Test 3: Calling `ensurePeriodUsageReset` on a new day resets all daily counters (`messagesUsedToday`, `calScansUsedToday`, `mealSuggestsUsedToday`, `activityFeedbackUsedToday`, `inputTokensUsedToday`, `outputTokensUsedToday`) together so using meal suggest first never blocks chat reset.

### Reviewer Gate Checklist (`SEC-2`):
* [ ] Confirm `isByokActive` (`customApiKey && usageTier === 'none'`) is used in `checkUsageLimit`, `reserveUsageSlot`, and `incrementUsage`.
* [ ] Confirm `ensurePeriodUsageReset` resets all 6 daily counters atomically in a single `updateMany` so no single feature clobbers `lastUsageReset`.
* [ ] Confirm `plan-advanced/[goalId]/ai-chat`, `plan-advanced/[goalId]/ai-analysis`, and `health/insights/generate` all enforce `reserveUsageSlot`, `checkProviderLimit`, and `incrementUsage`.
* [ ] Confirm `aiInsightApiKey` is never present in `GET` or `POST` JSON responses from `/api/health/nutrition/target` or `/api/mobile/v1/health/nutrition/target`.

## Task `SEC-3` — `fix(security): enforce strict tenant ownership on progression delete/apply, week copy, supplement stacks, and push subscriptions`

* **Fixes Audit Findings**:
  * `authz-idor-progression-delete` (High)
  * `authz-idor-supplement-stack-link` (Medium)
  * `authz-push-subscription-hijack` (Medium)
  * Hardening of new `A2` (`progression/apply`) and `A4` (`copy-week`) routes
* **Gate**: `web-gate`
* **Files**:
  * Modify: `Web/src/app/api/plan-advanced/[goalId]/progression/route.ts`
  * Modify: `Web/src/app/api/plan-advanced/[goalId]/progression/apply/route.ts`
  * Modify: `Web/src/app/api/plan-advanced/[goalId]/copy-week/route.ts`
  * Modify: `Web/src/app/api/health/supplements/route.ts`
  * Modify: `Web/src/app/api/mobile/v1/health/supplements/route.ts`
  * Modify: `Web/src/app/api/push/subscribe/route.ts`
  * Create: `Web/src/app/api/__tests__/tenant-isolation.security.test.ts`

### Step-by-Step Instructions for Coder Sub-Agent:

1. **Fix Cross-Tenant IDOR in `DELETE /api/plan-advanced/[goalId]/progression` (`Web/src/app/api/plan-advanced/[goalId]/progression/route.ts:186-223`)**:
   * Update the signature to `export async function DELETE(req: Request, ctx: RouteContext)` so `goalId` is read from `await ctx.params`.
   * Verify ownership of both the `Goal` and the `IntervalProgression` before unlinking workouts or deleting:
     ```ts
     const { goalId } = await ctx.params;
     const url = new URL(req.url);
     const id = url.searchParams.get('id');
     if (!id) {
         return NextResponse.json({ error: 'Progression id query parameter is required' }, { status: 400 });
     }

     const existing = await prisma.intervalProgression.findFirst({
         where: { id, goalId, goal: { userId: session.user.id } },
         select: { id: true },
     });
     if (!existing) {
         return NextResponse.json({ error: 'Progression not found' }, { status: 404 });
     }

     await prisma.workout.updateMany({
         where: { intervalProgressionId: existing.id, goalId },
         data: { intervalProgressionId: null },
     });

     await prisma.intervalProgression.delete({
         where: { id: existing.id },
     });
     ```
   * Also check `PUT` / `PATCH` in `Web/src/app/api/plan-advanced/[goalId]/progression/route.ts` to ensure `where: { id: body.id, goalId }` verifies that `existingProgression.goalId === goalId` (where `goal` is owned by `session.user.id`) before calling `prisma.intervalProgression.update`.

2. **Harden `POST /api/plan-advanced/[goalId]/progression/apply/route.ts` and `POST /api/plan-advanced/[goalId]/copy-week/route.ts`**:
   * In `progression/apply/route.ts`:
     * Verify `const goal = await prisma.goal.findFirst({ where: { id: goalId, userId } })` first.
     * When `progressionId` is supplied, query `prisma.intervalProgression.findFirst({ where: { id: progressionId, goalId } })` and return `404` if it does not belong to `goalId`.
     * Bound `startWeek` and `endWeek` (`1 <= startWeek <= endWeek <= 52`, `endWeek - startWeek <= 26`).
   * In `copy-week/route.ts`:
     * Authenticate via `getAuthenticatedUser(req)` and verify `prisma.goal.findFirst({ where: { id: goalId, userId: user.id } })`.
     * Validate `scaleFactor` (`typeof scaleFactor === 'number' && Number.isFinite(scaleFactor) && scaleFactor >= 0.5 && scaleFactor <= 2.0`) and cap copied workouts per operation to `<= 28`.

3. **Fix Cross-Tenant `SupplementStack` Linking in Web & Mobile Supplement Routes**:
   * In `Web/src/app/api/health/supplements/route.ts` (`POST` around line 35 and `PUT` around line 70) and `Web/src/app/api/mobile/v1/health/supplements/route.ts` (`POST` around line 49 and `PUT` around line 89):
     * Whenever `stackId` is truthy (`if (stackId)`), verify stack ownership before `create` or `update`:
       ```ts
       if (stackId) {
           const ownedStack = await prisma.supplementStack.findFirst({
               where: { id: String(stackId), userId },
               select: { id: true },
           });
           if (!ownedStack) {
               return NextResponse.json({ error: 'Supplement stack not found' }, { status: 404 });
           }
       }
       ```
       (Use `session.user.id` for `userId` in the Web route and `authUser.id` in the Mobile route).

4. **Fix Cross-Tenant `PushSubscription` Hijacking in `Web/src/app/api/push/subscribe/route.ts`**:
   * Open `Web/src/app/api/push/subscribe/route.ts` around lines `20–45`.
   * Validate that `endpoint` is a valid `https:` URL (`new URL(endpoint).protocol === 'https:'` and `endpoint.length <= 2048`).
   * Before upserting, check if a subscription with `endpoint` already exists for a **different** `userId`:
     ```ts
     const existing = await prisma.pushSubscription.findUnique({
         where: { endpoint },
         select: { id: true, userId: true },
     });
     if (existing && existing.userId !== session.user.id) {
         return NextResponse.json(
             { error: 'Push subscription endpoint is already bound to another account. Please re-subscribe.' },
             { status: 409 }
         );
     }
     ```
   * Only create or update when `!existing || existing.userId === session.user.id`.

5. **Write Unit Tests in `Web/src/app/api/__tests__/tenant-isolation.security.test.ts`**:
   * Test 1: `DELETE /api/plan-advanced/goal-attacker/progression?id=prog-victim` returns `404` and does not call `workout.updateMany` or `intervalProgression.delete`.
   * Test 2: `POST /api/health/supplements` and `PUT /api/mobile/v1/health/supplements` with `stackId` belonging to another user return `404`.
   * Test 3: `POST /api/push/subscribe` with an `endpoint` owned by `user-victim` returns `409` when called by `user-attacker`.

### Reviewer Gate Checklist (`SEC-3`):
* [ ] Confirm `DELETE` and `PUT`/`PATCH` in `progression/route.ts` verify `goal: { userId: session.user.id }` and `goalId` before mutating.
* [ ] Confirm both `Web/src/app/api/health/supplements/route.ts` and `Web/src/app/api/mobile/v1/health/supplements/route.ts` verify `supplementStack` ownership on `POST` and `PUT`.
* [ ] Confirm `POST /api/push/subscribe` rejects cross-tenant `endpoint` overwrites with HTTP `409` and validates `https:` protocol.

## Task `SEC-4` — `fix(security): sanitize ReactMarkdown rehypeRaw sinks, fence nutrition prompt inputs, and evict all auth-bound SW caches on sign-out`

* **Fixes Audit Findings**:
  * `client-xss-rehype-raw-ai-markdown` (High)
  * `client-sw-cache-eviction-bypass` (Medium)
* **Gate**: `web-ui-gate`
* **Files**:
  * Modify: `Web/src/components/views/WeeklyInsightsCard.tsx`
  * Modify: `Web/src/components/ActivityDetailsModal.tsx`
  * Modify: `Web/src/app/api/health/nutrition/suggest/route.ts`
  * Modify: `Web/src/app/api/mobile/v1/health/nutrition/suggest/route.ts`
  * Modify: `Web/src/lib/pwa/authCacheEviction.ts`
  * Modify: `Web/public/sw-auth-guard.js`
  * Modify: `Web/src/components/UserMenu.tsx`
  * Modify: `Web/src/components/ProfileModal.tsx`
  * Modify: `Web/src/components/MinimalistPillsMenu.tsx`
  * Create: `Web/src/components/__tests__/markdown-sanitization.security.test.tsx`

### Step-by-Step Instructions for Coder Sub-Agent:

1. **Sanitize All `ReactMarkdown` + `rehypeRaw` Sinks in `WeeklyInsightsCard.tsx` and `ActivityDetailsModal.tsx`**:
   * **IMPORTANT**: Task `C2` of the master workflow added Cycling Power Analysis panels to `Web/src/components/ActivityDetailsModal.tsx`. Preserve all Cycling Power Analysis code intact!
   * In `Web/src/components/views/WeeklyInsightsCard.tsx`:
     * Import `rehypeSanitize from 'rehype-sanitize'` and `DOMPurify from 'dompurify'`.
     * Replace `<ReactMarkdown rehypePlugins={[rehypeRaw]}>{insight.content}</ReactMarkdown>` with:
       ```tsx
       <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]}>
           {DOMPurify.sanitize(insight.content)}
       </ReactMarkdown>
       ```
   * In `Web/src/components/ActivityDetailsModal.tsx`:
     * Import `rehypeSanitize from 'rehype-sanitize'` and `DOMPurify from 'dompurify'`.
     * At all three AI Coach Feedback `<ReactMarkdown rehypePlugins={[rehypeRaw]}>` instances (`plannedComparison`, `progressAnalysis`, and `goalTrajectory`), change `rehypePlugins={[rehypeRaw]}` to `rehypePlugins={[rehypeRaw, rehypeSanitize]}` and wrap the child string in `DOMPurify.sanitize(...)`.
   * Check the entire `Web/src/` directory (`grep -rn "rehypeRaw" Web/src/`) to ensure ZERO `<ReactMarkdown>` components use `rehypeRaw` without `rehypeSanitize` and `DOMPurify.sanitize`.

2. **Fence Untrusted Food & Meal Names in Nutrition AI Prompt Construction**:
   * In `Web/src/app/api/health/nutrition/suggest/route.ts` (around lines `92–99`) and `Web/src/app/api/mobile/v1/health/nutrition/suggest/route.ts`:
     * Import `{ fenceUntrusted } from '@/lib/ai/prompts'`.
     * Wrap `item.name`, `item.servingSize`, and `meal.name` with `fenceUntrusted(..., 120)` when building `frequentFoodsText` and `savedMealsText` so shared `FoodItem` catalog entries (from OpenFoodFacts/FatSecret/other users) cannot inject raw prompt instructions.

3. **Fix Service Worker Auth Cache Eviction & Logout Call Sites (`authCacheEviction.ts`, `sw-auth-guard.js`, `UserMenu.tsx`, `ProfileModal.tsx`, `MinimalistPillsMenu.tsx`)**:
   * In `Web/src/lib/pwa/authCacheEviction.ts`:
     * Update `AUTH_BOUND_RUNTIME_CACHES` to include all personalized Workbox runtime caches defined in `Web/next.config.mjs`:
       ```ts
       export const AUTH_BOUND_RUNTIME_CACHES = ['apis', 'pages', 'next-data'];
       ```
   * In `Web/public/sw-auth-guard.js`:
     * Update line 29 to:
       ```js
       var AUTH_BOUND_CACHE_NAMES = ['apis', 'pages', 'next-data'];
       ```
     * Note on `sw-auth-guard.js` `fetch` listener: because `request.headers.get('cookie')` is always `null` in a Service Worker `fetch` event per the WHATWG Fetch Standard (forbidden header name), do NOT rely on `request.headers.get('cookie')` to distinguish authenticated vs. unauthenticated requests. Instead, keep the `RUNFLOW_EVICT_AUTH_CACHES` message handler deleting all three caches (`apis`, `pages`, `next-data`), and in the `fetch` listener, bypass runtime caching (network-only) for `/api/auth/`, `/api/admin/`, `/api/ai/settings`, `/api/health/nutrition/target`, `/api/mobile/`, and `/mcp` paths so credentials/tokens/auth state are never written to Cache Storage!
   * Verify in `Web/src/components/UserMenu.tsx`, `Web/src/components/ProfileModal.tsx`, and `Web/src/components/MinimalistPillsMenu.tsx` that every `signOut(...)` call site awaits `evictAuthBoundCaches()` before calling `signOut(...)`.

4. **Write Unit Tests in `Web/src/components/__tests__/markdown-sanitization.security.test.tsx`**:
   * Verify that `WeeklyInsightsCard.tsx` and `ActivityDetailsModal.tsx` both include `rehypeSanitize` and `DOMPurify.sanitize` on all `ReactMarkdown` instances and that `DOMPurify.sanitize('<img src=x onerror=alert(1)><details open ontoggle=alert(2)>')` strips `onerror` and `ontoggle`.
   * Verify that `AUTH_BOUND_RUNTIME_CACHES` in `authCacheEviction.ts` and `AUTH_BOUND_CACHE_NAMES` in `sw-auth-guard.js` both equal `['apis', 'pages', 'next-data']`.

### Reviewer Gate Checklist (`SEC-4`):
* [ ] Confirm `grep -rn "rehypeRaw" Web/src/` shows `rehypeSanitize` and `DOMPurify.sanitize` on every match.
* [ ] Confirm `ActivityDetailsModal.tsx` retains all Cycling Power Analysis UI added in Task `C2`.
* [ ] Confirm `AUTH_BOUND_RUNTIME_CACHES` and `AUTH_BOUND_CACHE_NAMES` both contain `'apis'`, `'pages'`, and `'next-data'`.

## Task `SEC-5` — `fix(security): bound analytics date ranges, cap v2 structured workout flattening, and limit plan generation horizons`

* **Fixes Audit Findings**:
  * `dos-unbounded-date-range-analytics` (Medium)
  * Resource-exhaustion hardening on new `A1`/`A5` (`StructuredWorkoutV2` nested repeats), `C1` (`/api/analytics/cycling`), and `B1` (`/api/public/plan/export`, `/mcp/public`)
* **Gate**: `web-gate` + `android-gate`
* **Files**:
  * Create: `Web/src/lib/validation/dateRange.ts`
  * Modify: `Web/src/app/api/health/supplements/analytics/route.ts`
  * Modify: `Web/src/app/api/mobile/v1/health/supplements/analytics/route.ts`
  * Modify: `Web/src/app/api/mobile/v1/analytics/history/route.ts`
  * Modify: `Web/src/app/api/analytics/cycling/route.ts`
  * Modify: `Web/src/app/api/mobile/v1/analytics/cycling/route.ts`
  * Modify: `Web/src/lib/plans/structured.ts`
  * Modify: `Web/src/app/api/public/plan/export/route.ts`
  * Modify: `Web/src/app/api/public/plan/generate/route.ts`
  * Modify: `android/app/src/main/java/com/runflow2/app/domain/plan/StructuredStepsParser.kt`
  * Create: `Web/src/lib/validation/__tests__/dateRange.security.test.ts`

### Step-by-Step Instructions for Coder Sub-Agent:

1. **Create Shared Bounded Date-Range Validator (`Web/src/lib/validation/dateRange.ts`)**:
   ```ts
   export interface BoundedDateRangeResult {
       ok: boolean;
       error?: string;
       start?: Date;
       end?: Date;
       totalDays?: number;
   }

   export function parseBoundedDateRange(
       startDateStr: string | null | undefined,
       endDateStr: string | null | undefined,
       maxDays = 366
   ): BoundedDateRangeResult {
       if (!startDateStr || !endDateStr) {
           return { ok: false, error: 'startDate and endDate are required' };
       }
       if (!/^\d{4}-\d{2}-\d{2}/.test(startDateStr) || !/^\d{4}-\d{2}-\d{2}/.test(endDateStr)) {
           return { ok: false, error: 'Dates must be in YYYY-MM-DD format' };
       }
       const start = new Date(startDateStr.slice(0, 10) + 'T00:00:00.000Z');
       const end = new Date(endDateStr.slice(0, 10) + 'T23:59:59.999Z');
       if (isNaN(start.getTime()) || isNaN(end.getTime())) {
           return { ok: false, error: 'Invalid date format' };
       }
       if (end.getTime() < start.getTime()) {
           return { ok: false, error: 'endDate must be on or after startDate' };
       }
       const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
       if (totalDays < 1 || totalDays > maxDays) {
           return { ok: false, error: `Date range cannot exceed ${maxDays} days` };
       }
       return { ok: true, start, end, totalDays };
   }
   ```

2. **Enforce `parseBoundedDateRange` Across All Analytics Routes**:
   * In `Web/src/app/api/health/supplements/analytics/route.ts` and `Web/src/app/api/mobile/v1/health/supplements/analytics/route.ts`:
     * Call `parseBoundedDateRange(startDate, endDate, 366)` before querying Prisma or running the `for (let i = 0; i < totalDays; i++)` loop. Return HTTP `400` (`{ error: range.error }`) when `!range.ok`.
   * In `Web/src/app/api/mobile/v1/analytics/history/route.ts`:
     * Call `parseBoundedDateRange(startDateParam, endDateParam, 730)` and return `errorResponses.badRequest(range.error)` when `!range.ok`.
   * In `Web/src/app/api/analytics/cycling/route.ts` and `Web/src/app/api/mobile/v1/analytics/cycling/route.ts`:
     * Bound the `range` query parameter to `42d | 90d | 180d | 365d | all`, and when `range === 'all'`, cap the query window to at most the last `1095` days (3 years) and `take: 1000` rides so unbounded historical stream queries cannot exhaust heap memory.

3. **Cap Exponential Step Expansion in `StructuredWorkoutV2` (`Web/src/lib/plans/structured.ts` & Android `StructuredStepsParser.kt`)**:
   * **Bug**: A depth-3 `RepeatGroup` with `times: 100` at each nesting level (`100 × 100 × 100`) expands to `1,000,000` flattened steps during `flattenStructuredWorkout` or `summarizeStructuredWorkout`!
   * **Fix in `Web/src/lib/plans/structured.ts`**:
     * Export `export const MAX_FLATTENED_STEPS = 500;`.
     * In `parseStructuredWorkout` (Zod `.superRefine` or post-parse check) and inside `flattenStructuredWorkout`: count total expanded steps across `RepeatGroup` multipliers; if total expanded steps exceed `MAX_FLATTENED_STEPS` (`500`), reject validation in strict mode or truncate expansion at `500` steps in `flattenStructuredWorkout`.
   * **Fix in `android/app/src/main/java/com/runflow2/app/domain/plan/StructuredStepsParser.kt`**:
     * Enforce the same `MAX_FLATTENED_STEPS = 500` cap inside the recursive flattener so malformed JSON from sync or deep links cannot freeze the Android UI or `RecordingController`.

4. **Bound `raceDate` Horizon in Public Plan Generator & Export Routes**:
   * In `Web/src/app/api/public/plan/generate/route.ts` and `Web/src/app/api/public/plan/export/route.ts` (both `GET` and `POST`):
     * Reject `raceDate` values more than `104` weeks (2 years) in the future or in the past (`400 Bad Request`) so callers cannot force stateless generation of multi-decade workout arrays.

5. **Write Unit Tests in `Web/src/lib/validation/__tests__/dateRange.security.test.ts`**:
   * Verify `parseBoundedDateRange('0001-01-01', '9999-12-31')` and extended ISO years return `{ ok: false }` with HTTP 400.
   * Verify a 3-level nested `RepeatGroup` (`times: 50` × `times: 50`) is rejected/capped by `MAX_FLATTENED_STEPS = 500`.

### Reviewer Gate Checklist (`SEC-5`):
* [ ] Confirm `parseBoundedDateRange` is called in Web and Mobile supplement analytics and mobile fitness history routes before any Prisma query or loop.
* [ ] Confirm `MAX_FLATTENED_STEPS = 500` is enforced in both `Web/src/lib/plans/structured.ts` and Android `StructuredStepsParser.kt`.
* [ ] Confirm `GET` and `POST` on `/api/public/plan/export` and `/api/public/plan/generate` reject `raceDate` > 104 weeks out.

## Task `SEC-6` — `fix(security): harden Dual-MCP (/mcp & /mcp/public) and OAuth 2.1 PKCE/DCR against redirect manipulation, code replay, CSRF, and cross-tenant IDOR`

* **Fixes New Attack Surface Introduced in Tasks `B1` & `B2`**:
  * OAuth 2.1 Dynamic Client Registration (`POST /mcp/oauth/register`) redirect URI validation & rate limiting
  * OAuth 2.1 Consent CSRF & Open Redirect protection (`GET/POST /mcp/oauth/authorize` & `/mcp/authorize`)
  * Atomic single-use `McpOAuthCode` exchange & timing-safe PKCE `S256` verification (`POST /mcp/oauth/token`)
  * Cross-tenant ownership verification across all 10 `/mcp` write tools & strict Strava field scrubbing on `get_recent_activities`
* **Gate**: `web-ui-gate`
* **Files**:
  * Modify: `Web/src/lib/mcp/oauth.ts`
  * Modify: `Web/src/app/mcp/oauth/register/route.ts`
  * Modify: `Web/src/app/mcp/oauth/authorize/route.ts`
  * Modify: `Web/src/app/mcp/oauth/token/route.ts`
  * Modify: `Web/src/app/mcp/authorize/page.tsx`
  * Modify: `Web/src/app/mcp/route.ts`
  * Modify: `Web/src/app/mcp/public/route.ts`
  * Modify: `Web/src/middleware.ts`
  * Modify: `Web/src/app/mcp/__tests__/route.test.ts`

### Step-by-Step Instructions for Coder Sub-Agent:

1. **Strict Redirect URI Validation & Rate Limiting on Dynamic Client Registration (`Web/src/lib/mcp/oauth.ts` & `POST /mcp/oauth/register`)**:
   * **Enforce Rate Limiting**: At the top of `POST /mcp/oauth/register`, enforce `checkRateLimitAsync(getClientIdentifier(request), { limit: 10, windowSeconds: 3600, prefix: 'mcp-dcr' })` and cap `redirect_uris` to `1..5` URIs and `client_name` to `1..100` chars.
   * **Strict `isAllowedMcpRedirectUri(uri: string)` Parser in `Web/src/lib/mcp/oauth.ts`**:
     * Never use regex or prefix matching on raw strings. Parse with `new URL(uri)`:
       * Reject if `url.username || url.password || url.hash` is non-empty, or if `url.pathname.includes('..')` or `decodeURIComponent(url.pathname).includes('..')`.
       * If `url.protocol === 'http:'`: allow **only** when `url.hostname === '127.0.0.1' || url.hostname === 'localhost'`.
       * If `url.protocol === 'https:'`: allow **only** when `url.hostname === 'claude.ai' || url.hostname.endsWith('.claude.ai') || url.hostname.endsWith('.anthropic.com') || url.hostname === 'aistudio.google.com' || url.hostname === 'gemini.google.com'`.
       * Reject all other protocols and hosts.
   * **Exact Redirect URI Match on Authorize & Token**:
     * In `GET/POST /mcp/oauth/authorize`, verify that the requested `redirect_uri` is an **exact string element** of the `McpOAuthClient.redirectUris` JSON array (`registeredUris.includes(redirectUri)`) AND passes `isAllowedMcpRedirectUri(redirectUri)`.

2. **Enforce Cryptographic CSRF Binding on OAuth Consent Approval (`POST /mcp/oauth/authorize` & `/mcp/authorize`)**:
   * In `Web/src/lib/mcp/oauth.ts`, implement `createConsentCsrfToken(params: { userId: string; clientId: string; redirectUri: string; codeChallenge: string; state: string; expiresAtMs: number })` and `verifyConsentCsrfToken(...)` using HMAC-SHA256 (`process.env.NEXTAUTH_SECRET`) and `crypto.timingSafeEqual`.
   * When `/mcp/authorize` renders the consent card (or `GET /mcp/oauth/authorize` prepares the consent state), generate a 10-minute `consentCsrfToken` bound to the current `session.user.id` and OAuth parameters.
   * In `POST /mcp/oauth/authorize`, require and verify `consentCsrfToken` (plus verify `Origin` matches the server's own origin when the `Origin` header is present) before issuing a `McpOAuthCode`!

3. **Enforce Atomic Single-Use Code Consumption & Timing-Safe PKCE `S256` in `POST /mcp/oauth/token`**:
   * **Reject Non-`S256` Challenges**: Require `codeChallengeMethod === 'S256'` and `typeof codeVerifier === 'string' && /^[A-Za-z0-9._~-]{43,128}$/.test(codeVerifier)`.
   * **Atomic Single-Use Conditional Update**:
     * Do NOT read `usedAt` and update it later. Instead, atomically claim the code first:
       ```ts
       const now = new Date();
       const claimed = await prisma.mcpOAuthCode.updateMany({
           where: {
               codeHash,
               clientId,
               redirectUri,
               usedAt: null,
               expiresAt: { gt: now },
           },
           data: { usedAt: now },
       });
       if (claimed.count !== 1) {
           return NextResponse.json({ error: 'invalid_grant', error_description: 'Authorization code is invalid, expired, or already used' }, { status: 400 });
       }
       ```
   * **Timing-Safe PKCE Verification**:
     * Compute `const computedChallenge = crypto.createHash('sha256').update(codeVerifier, 'ascii').digest('base64url');`.
     * Compare `Buffer.from(computedChallenge)` and `Buffer.from(codeRecord.codeChallenge)` using `crypto.timingSafeEqual` (checking equal byte lengths first).

4. **Audit & Lock Down Every `/mcp` Tool for Tenant Isolation and Strava API Compliance (`Web/src/app/mcp/route.ts`)**:
   * Verify that **every** `/mcp` write tool scopes its lookup and mutation by `authenticatedUser.id`:
     * `create_structured_workout` & `update_training_plan_phases`: verify `prisma.goal.findFirst({ where: { id: goalId, userId: user.id } })`.
     * `modify_workout`, `reschedule_workout`, `delete_workout`: verify `prisma.workout.findFirst({ where: { id: workoutId, goal: { userId: user.id } } })` before creating a snapshot or mutating.
     * `swap_workouts`: verify that **both** `workoutIdA` and `workoutIdB` belong to goals owned by `user.id` (`where: { id: { in: [workoutIdA, workoutIdB] }, goal: { userId: user.id } }` and check `workouts.length === 2` when `workoutIdA !== workoutIdB`).
     * `mark_workout_status`: verify `workout.goal.userId === user.id`, AND if `linkedActivityId` is provided, verify `prisma.activity.findFirst({ where: { id: linkedActivityId, userId: user.id } })` before linking!
   * Verify on `get_recent_activities` that any activity with `stravaId != null` deletes/omits `name`, `description`, `rawJson`, `streams`, `laps`, and `splits`, and includes `stravaComplianceNotice`.
   * Verify in `Web/src/middleware.ts` that CORS headers on `/mcp` and `/mcp/public` never combine `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true`.

5. **Expand Jest Security Tests in `Web/src/app/mcp/__tests__/route.test.ts`**:
   * Test 1: `POST /mcp/oauth/register` rejects evil redirect URIs (`https://claude.ai.evil.com/cb`, `javascript:alert(1)`, `http://example.com/cb`, `https://claude.ai/../evil`) with HTTP `400`.
   * Test 2: `POST /mcp/oauth/authorize` without a valid `consentCsrfToken` returns HTTP `403`.
   * Test 3: Replaying the same `authorization_code` a second time at `POST /mcp/oauth/token` returns `400 invalid_grant`.
   * Test 4: Calling `modify_workout`, `swap_workouts`, `delete_workout`, or `mark_workout_status` (with another user's `workoutId` or `linkedActivityId`) on `/mcp` returns an error and leaves the victim's rows unmodified.

### Reviewer Gate Checklist (`SEC-6`):
* [ ] Confirm `isAllowedMcpRedirectUri` uses `new URL(uri)` and rejects `https://claude.ai.evil.com` and non-loopback `http://`.
* [ ] Confirm `POST /mcp/oauth/authorize` verifies `consentCsrfToken` with `crypto.timingSafeEqual`.
* [ ] Confirm `POST /mcp/oauth/token` claims `McpOAuthCode` via atomic `updateMany({ where: { codeHash, usedAt: null, expiresAt: { gt: now } } })`.
* [ ] Confirm all 10 `/mcp` write tools verify `goal: { userId: user.id }` (and `activity.userId === user.id` for `linkedActivityId`).

## Task `SEC-QA` — Final Security Regression Gate & End-to-End Verification

* **Gate**: `pg-gate` + `web-ui-gate` + `android-gate`

### Step-by-Step Instructions for Orchestrator:

1. Run the full verification suite across PostgreSQL/Prisma, Web Jest tests, Next.js production build, and Android Kotlin/unit tests:
   ```bash
   cd Web && npx prisma validate && npx prisma generate
   cd Web && npm test
   cd Web && npm run build
   cd android && ./gradlew :app:compileDebugKotlin testDebugUnitTest --console=plain
   ```
2. Run the static security invariant assertions:
   ```bash
   node -e '
   const fs = require("fs");
   function assert(cond, msg) { if (!cond) { console.error("FAIL:", msg); process.exit(1); } }

   const rlAdmin = fs.readFileSync("Web/src/lib/rateLimitAdmin.ts", "utf8");
   const blockedFn = rlAdmin.slice(rlAdmin.indexOf("async function isIPBlockedRedis"), rlAdmin.indexOf("function recordViolation"));
   assert(!blockedFn.includes("client.incr"), "isIPBlockedRedis must not call client.incr");

   const usage = fs.readFileSync("Web/src/lib/ai/usage.ts", "utf8");
   assert(usage.includes("isByokActive") || usage.includes("usageTier === '\''none'\''"), "usage.ts must require usageTier === none for customApiKey quota bypass");

   const weekly = fs.readFileSync("Web/src/components/views/WeeklyInsightsCard.tsx", "utf8");
   assert(weekly.includes("rehypeSanitize") && weekly.includes("DOMPurify.sanitize"), "WeeklyInsightsCard must sanitize markdown");

   const modal = fs.readFileSync("Web/src/components/ActivityDetailsModal.tsx", "utf8");
   assert(modal.includes("rehypeSanitize") && modal.includes("DOMPurify.sanitize"), "ActivityDetailsModal must sanitize markdown");

   const evict = fs.readFileSync("Web/src/lib/pwa/authCacheEviction.ts", "utf8");
   assert(evict.includes("pages") && evict.includes("next-data"), "authCacheEviction.ts must evict pages and next-data");

   console.log("ALL STATIC SECURITY INVARIANTS PASSED.");
   '
   ```
3. Commit any final test adjustments and output a final summary table mapping each task (`SEC-1` through `SEC-6`) to its passing test suites and reviewer verdicts.
