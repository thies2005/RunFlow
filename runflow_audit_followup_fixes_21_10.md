# Multi-Agent Post-Audit Remediation Playbook for Google Antigravity (Gemini 3.8 Flash Medium)

* **Target Environment**: Google Antigravity IDE / Agent Manager

* **Target Model**: **Gemini 3.8 Flash Medium** (`gemini-3.8-flash`, `thinking_level: medium`)

* **Base Commit**: `a5f0c478` (`feat: security remediations (RF-001 - RF-012), PMC chart fix, triathlon plan builder, and MyWhoosh catalog integration`)

* **Scope**: Fix all **7 post-audit defects and edge cases** across Security (`RF-003`, `RF-004`, `RF-006`, `RF-007`, `RF-012`) and Plan Builder / MyWhoosh (`.zwo` interval export, mid-plan regeneration past-workout deduplication, MyWhoosh toggle detection, and `EngineGenerateModal` payload).

## 1. Execution Rules for the Coordinator & Subagents

1. **Single Parallel Wave (3 Disjoint Subagents)**:
   Spawn **Agent-Fix-1**, **Agent-Fix-2**, and **Agent-Fix-3** in parallel. Their file write scopes are 100% disjoint (zero shared files).

2. **Exact `FIND` / `REPLACE` Execution**:
   Every subagent prompt below contains exact `FIND` and `REPLACE WITH` blocks verified against commit `a5f0c478`. Do **not** skip any block, do **not** improvise alternative logic, and do **not** revert source changes to satisfy outdated tests—update the test files as instructed in the `FIND` / `REPLACE WITH` blocks.

3. **Final Coordinator Barrier Gate**:
   Wait until all 3 subagents finish before running the full `tsc`, `npm test`, and `./gradlew testDebugUnitTest` suite.

| **Wave** | **Agent ID** | **Assigned Fixes** | **Exclusive Write-Lock Files** | **Per-Agent Test Command** | 
| **Wave 1** | **Agent-Fix-1** (`security-hardening-followup`) | **RF-004** (Anon Admin Rate-Limit Fallback)  **RF-003** (`testAiConfig` `allowedUrls` Guard)  **RF-007** (`authorize` `forwardedOrigin` Guard)  **RF-006** (`auth/reset-password` Transaction) | `Web/src/lib/rateLimitAdmin.ts`  `Web/src/lib/__tests__/rateLimitAdmin.test.ts`  `Web/src/lib/ai/providers.ts`  `Web/src/app/mcp/oauth/authorize/route.ts`  `Web/src/app/api/auth/reset-password/route.ts` | `cd Web && npm test -- src/lib/__tests__/rateLimitAdmin.test.ts src/lib/ai/__tests__/providers-ssrf.test.ts src/app/mcp/__tests__/route.test.ts` | 
| **Wave 1** | **Agent-Fix-2** (`zwo-and-plan-regeneration`) | **Phase 5** (`.zwo` `<IntervalsT>` & `structuredSteps` Export)  **Phase 3** (Mid-Plan Regeneration Past-Workout Deduplication & MyWhoosh Toggle)  **Phase 4** (`EngineGenerateModal` `weeklyMileageGoal`) | `Web/src/lib/plans/zwoExporter.ts`  `Web/src/components/PlanEditor/WorkoutDetailPanel.tsx`  `Web/src/components/PlanEditor/EngineGenerateModal.tsx`  `Web/src/app/api/plan-advanced/[goalId]/regenerate/route.ts`  `Web/src/app/api/settings/update-vdot/route.ts` | `cd Web && npx tsc --noEmit && npm test -- src/lib/mywhoosh/__tests__/parser.test.ts` | 
| **Wave 1** | **Agent-Fix-3** (`android-rf012-hardening`) | **RF-012** (Strict Loopback Host Allowlist in `Api.kt` & Immediate `previousBaseUrl` Initialization in `NetworkClient.kt`) | `android/app/src/main/java/com/runflow2/app/data/net/Api.kt`  `android/app/src/main/java/com/runflow2/app/data/net/NetworkClient.kt`  `android/app/src/test/java/com/runflow2/app/StravaAuthTest.kt`  `android/app/src/test/java/com/runflow2/app/ApiContractTest.kt` | `cd android && ./gradlew testDebugUnitTest --tests com.runflow2.app.ApiContractTest --tests com.runflow2.app.StravaAuthTest` | 

## 2. Subagent Prompts (Spawn All 3 in Parallel)

### Agent-Fix-1 Prompt (`security-hardening-followup`)

> **Role**: Security Follow-Up Agent `security-hardening-followup` (Model: Gemini 3.8 Flash Medium)
> **Exclusive Write Scope**:
>
> * `Web/src/lib/rateLimitAdmin.ts`
>
> * `Web/src/lib/__tests__/rateLimitAdmin.test.ts`
>
> * `Web/src/lib/ai/providers.ts`
>
> * `Web/src/app/mcp/oauth/authorize/route.ts`
>
> * `Web/src/app/api/auth/reset-password/route.ts`
>   **Do NOT edit any files outside your Exclusive Write Scope.**
>
> Apply the following 5 exact `FIND` / `REPLACE WITH` edits in order:
>
> #### Edit 1.1: Fix `RF-004` Per-Caller Anonymous Fallback Bucket in `Web/src/lib/rateLimitAdmin.ts`
>
> Open `Web/src/lib/rateLimitAdmin.ts` (lines 209–218).
>
> **FIND:**
>
> ```
>     let effectiveBucketId: string;
>     if (adminToken) {
>         const tokenHash = createHash('sha256').update(adminToken).digest('hex').slice(0, 16);
>         effectiveBucketId = rawIp === 'unknown' ? `auth-admin:${tokenHash}` : `${rawIp}:auth-admin:${tokenHash}`;
>     } else if (rawIp === 'unknown') {
>         effectiveBucketId = `anon-login:${operation}`;
>     } else {
>         effectiveBucketId = rawIp;
>     }
> 
> ```
>
> **REPLACE WITH:**
>
> ```
>     let effectiveBucketId: string;
>     if (adminToken) {
>         const tokenHash = createHash('sha256').update(adminToken).digest('hex').slice(0, 16);
>         effectiveBucketId = rawIp === 'unknown' ? `auth-admin:${tokenHash}` : `${rawIp}:auth-admin:${tokenHash}`;
>     } else if (rawIp === 'unknown') {
>         const cfIp = request.headers.get('cf-connecting-ip')?.trim();
>         const realIp = request.headers.get('x-real-ip')?.trim();
>         const lastForwardedIp = request.headers.get('x-forwarded-for')?.split(',').pop()?.trim();
>         const ua = request.headers.get('user-agent')?.trim();
>         // Only partition when a proxy/client context signal is present; bare requests
>         // with only a single spoofed XFF/X-Real-IP header and no User-Agent stay in a
>         // shared bucket so header-rotation attacks cannot mint unlimited buckets.
>         if (cfIp || (ua && (realIp || lastForwardedIp))) {
>             const fallbackSignal = `${cfIp || realIp || lastForwardedIp || 'no-ip'}|${ua || 'no-ua'}`;
>             const fallbackHash = createHash('sha256').update(fallbackSignal).digest('hex').slice(0, 16);
>             effectiveBucketId = `anon-login:${operation}:${fallbackHash}`;
>         } else {
>             effectiveBucketId = `anon-login:${operation}`;
>         }
>     } else {
>         effectiveBucketId = rawIp;
>     }
> 
> ```
>
> #### Edit 1.2: Add Regression Test for `RF-004` Per-Caller Isolation in `Web/src/lib/__tests__/rateLimitAdmin.test.ts`
>
> Open `Web/src/lib/__tests__/rateLimitAdmin.test.ts` (lines 272–288).
>
> **FIND:**
>
> ```
>     it('honors a configured TRUSTED_CLIENT_IP_HEADER over forwarded headers', async () => {
>       process.env.TRUSTED_CLIENT_IP_HEADER = 'Cf-Connecting-Ip';
> 
>       const results: boolean[] = [];
>       for (let i = 0; i < 4; i++) {
>         const request = new Request('http://localhost', {
>           headers: {
>             'cf-connecting-ip': '198.51.100.77',
>             'x-forwarded-for': `spoofed-${i}`,
>           },
>         });
>         results.push((await adminRateLimit(request, 'sensitive')).success);
>       }
>       expect(results).toEqual([true, true, true, false]);
>     });
>   });
> });
> 
> ```
>
> **REPLACE WITH:**
>
> ```
>     it('honors a configured TRUSTED_CLIENT_IP_HEADER over forwarded headers', async () => {
>       process.env.TRUSTED_CLIENT_IP_HEADER = 'Cf-Connecting-Ip';
> 
>       const results: boolean[] = [];
>       for (let i = 0; i < 4; i++) {
>         const request = new Request('http://localhost', {
>           headers: {
>             'cf-connecting-ip': '198.51.100.77',
>             'x-forwarded-for': `spoofed-${i}`,
>           },
>         });
>         results.push((await adminRateLimit(request, 'sensitive')).success);
>       }
>       expect(results).toEqual([true, true, true, false]);
>     });
> 
>     it('isolates distinct proxy-forwarded callers when TRUSTED_PROXY_COUNT=0 so one attacker cannot lock out other admins (RF-004)', async () => {
>       for (let i = 0; i < 4; i++) {
>         const attackerReq = new Request('http://localhost', {
>           headers: {
>             'x-forwarded-for': `1.1.1.${i}, 198.51.100.99`,
>             'user-agent': 'AttackerBot/1.0',
>           },
>         });
>         const res = await adminRateLimit(attackerReq, 'sensitive');
>         if (i < 3) expect(res.success).toBe(true);
>         else expect(res.success).toBe(false);
>       }
> 
>       const legitAdminReq = new Request('http://localhost', {
>         headers: {
>           'x-forwarded-for': '203.0.113.42',
>           'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)',
>         },
>       });
>       const legitRes = await adminRateLimit(legitAdminReq, 'sensitive');
>       expect(legitRes.success).toBe(true);
>     });
>   });
> });
> 
> ```
>
> #### Edit 1.3: Fix `RF-003` `allowedUrls` Fallback in `Web/src/lib/ai/providers.ts`
>
> Open `Web/src/lib/ai/providers.ts` (lines 1159–1167). When `options` is passed with `{ statusOnly: true, allowedUrls: undefined }` (for non-admin users in `/api/ai/test-key`), `options?.allowedUrls ?? ...` must NOT fall back to `[config.baseUrl]`.
>
> **FIND:**
>
> ```
> export async function testAiConfig(
>     config: AiConfig,
>     options?: { statusOnly?: boolean; allowedUrls?: string[] }
> ): Promise<{ success: boolean; error?: string; model?: string }> {
>     try {
>         const allowedUrls = options?.allowedUrls ?? (config.allowedUrls ?? [config.baseUrl]);
>         const statusOnly = options?.statusOnly ?? config.statusOnly ?? false;
> 
> ```
>
> **REPLACE WITH:**
>
> ```
> export async function testAiConfig(
>     config: AiConfig,
>     options?: { statusOnly?: boolean; allowedUrls?: string[] }
> ): Promise<{ success: boolean; error?: string; model?: string }> {
>     try {
>         const allowedUrls =
>             options && 'allowedUrls' in options
>                 ? options.allowedUrls
>                 : (config.allowedUrls ?? [config.baseUrl]);
>         const statusOnly = options?.statusOnly ?? config.statusOnly ?? false;
> 
> ```
>
> #### Edit 1.4: Fix `RF-007` Canonical Origin Precedence in `POST /mcp/oauth/authorize` (`Web/src/app/mcp/oauth/authorize/route.ts`)
>
> Open `Web/src/app/mcp/oauth/authorize/route.ts` (lines 70–93). Only fall back to `forwardedOrigin` when neither `nextAuthOrigin` nor `appUrlOrigin` is configured.
>
> **FIND:**
>
> ```
>             // Reverse-proxy deployments: also accept the origin derived from the
>             // forwarded proto/host headers so consent posts do not 403 behind a proxy
>             const forwardedOrigin = `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('x-forwarded-host') || request.headers.get('host')}`;
> 
>             const allowedOrigins = new Set(
>                 [request.nextUrl.origin, getPublicOrigin(request), forwardedOrigin, nextAuthOrigin, appUrlOrigin].filter(Boolean)
>             );
> 
> ```
>
> **REPLACE WITH:**
>
> ```
>             const canonicalConfigured = Boolean(
>                 (nextAuthOrigin && !nextAuthOrigin.includes('0.0.0.0')) ||
>                 (appUrlOrigin && !appUrlOrigin.includes('0.0.0.0'))
>             );
>             const forwardedOrigin = canonicalConfigured
>                 ? ''
>                 : `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('x-forwarded-host') || request.headers.get('host')}`;
> 
>             const allowedOrigins = new Set(
>                 [request.nextUrl.origin, getPublicOrigin(request), forwardedOrigin, nextAuthOrigin, appUrlOrigin].filter(Boolean)
>             );
> 
> ```
>
> #### Edit 1.5: Wrap Password Reset + MCP Token Revocation in `prisma.$transaction` (`Web/src/app/api/auth/reset-password/route.ts`)
>
> Open `Web/src/app/api/auth/reset-password/route.ts` (lines 54–82).
>
> **FIND:**
>
> ```
>         const user = await prisma.user.update({
>             where: { email },
>             data: {
>                 passwordHash,
>                 // Bump tokenVersion to invalidate all existing mobile refresh+access
>                 // tokens AND all outstanding web sessions (the NextAuth session JWT
>                 // carries the version and is revoked on mismatch in the session
>                 // callback)
>                 tokenVersion: { increment: 1 },
>                 // Also verify email if not already verified, as they proved ownership via email code
>                 emailVerified: new Date()
>             }
>         });
> 
>         if (prisma.mcpOAuthToken?.updateMany) {
>             await prisma.mcpOAuthToken.updateMany({
>                 where: { userId: user.id, revokedAt: null },
>                 data: { revokedAt: new Date() },
>             });
>         }
> 
>         if (prisma.mcpOAuthCode?.deleteMany) {
>             await prisma.mcpOAuthCode.deleteMany({
>                 where: { userId: user.id },
>             });
>         }
> 
> ```
>
> **REPLACE WITH:**
>
> ```
>         const runReset = async (tx: typeof prisma) => {
>             const updatedUser = await tx.user.update({
>                 where: { email },
>                 data: {
>                     passwordHash,
>                     tokenVersion: { increment: 1 },
>                     emailVerified: new Date(),
>                 },
>             });
>             if (tx.mcpOAuthToken?.updateMany) {
>                 await tx.mcpOAuthToken.updateMany({
>                     where: { userId: updatedUser.id, revokedAt: null },
>                     data: { revokedAt: new Date() },
>                 });
>             }
>             if (tx.mcpOAuthCode?.deleteMany) {
>                 await tx.mcpOAuthCode.deleteMany({
>                     where: { userId: updatedUser.id },
>                 });
>             }
>         };
> 
>         if (typeof prisma.$transaction === 'function') {
>             await prisma.$transaction(async (tx) => runReset(tx as typeof prisma));
>         } else {
>             await runReset(prisma);
>         }
> 
> ```
>
> #### Verify Agent-Fix-1:
>
> Run:
>
> ```
> cd Web && npm test -- src/lib/__tests__/rateLimitAdmin.test.ts src/lib/ai/__tests__/providers-ssrf.test.ts src/app/mcp/__tests__/route.test.ts
> 
> ```

### Agent-Fix-2 Prompt (`zwo-and-plan-regeneration`)

> **Role**: Plan Builder & MyWhoosh Follow-Up Agent `zwo-and-plan-regeneration` (Model: Gemini 3.8 Flash Medium)
> **Exclusive Write Scope**:
>
> * `Web/src/lib/plans/zwoExporter.ts`
>
> * `Web/src/components/PlanEditor/WorkoutDetailPanel.tsx`
>
> * `Web/src/components/PlanEditor/EngineGenerateModal.tsx`
>
> * `Web/src/app/api/plan-advanced/[goalId]/regenerate/route.ts`
>
> * `Web/src/app/api/settings/update-vdot/route.ts`
>   **Do NOT edit any files outside your Exclusive Write Scope.**
>
> Apply the following 5 exact `FIND` / `REPLACE WITH` edits in order:
>
> #### Edit 2.1: Support `<IntervalsT>` and `structuredSteps` in `Web/src/lib/plans/zwoExporter.ts`
>
> Replace the entire contents of `Web/src/lib/plans/zwoExporter.ts` with the following implementation so both `StructuredWorkoutV2` trees (`repeat` groups) and catalog `MyWhooshStep` (`type === 'interval'`) serialize into valid `<IntervalsT Repeat="..." OnDuration="..." OffDuration="..." OnPower="..." OffPower="..."/>` ZWO tags:
>
> **FIND:**
>
> ```
> import { MyWhooshWorkout, findClosestMyWhooshWorkout } from './mywhooshMatcher';
> 
> function escapeXml(unsafe: string): string {
>     return unsafe
>         .replace(/&/g, '&amp;')
>         .replace(/</g, '&lt;')
>         .replace(/>/g, '&gt;')
>         .replace(/"/g, '&quot;')
>         .replace(/'/g, '&apos;');
> }
> 
> export function generateMyWhooshZwoXml(params: {
>     name: string;
>     description: string;
>     workoutType: string;
>     targetDurationSeconds: number;
>     phase?: string;
>     matchedWorkout?: MyWhooshWorkout | null;
> }): string {
>     const match = params.matchedWorkout ?? findClosestMyWhooshWorkout({
>         workoutType: params.workoutType,
>         targetDurationSeconds: params.targetDurationSeconds,
>         description: params.description,
>         phase: params.phase,
>     });
> 
>     const totalSec = params.targetDurationSeconds > 0 ? params.targetDurationSeconds : (match?.durationSeconds || 3600);
>     const scale = match && match.durationSeconds > 0 ? totalSec / match.durationSeconds : 1.0;
> 
>     const stepLines: string[] = [];
>     if (match && match.steps && match.steps.length > 0) {
>         for (const step of match.steps) {
>             const dur = Math.max(30, Math.round((step.durationSeconds * scale) / 15) * 15);
>             const cadAttr = step.cadenceRpm ? ` Cadence="${step.cadenceRpm}"` : '';
>             if (step.type === 'warmup') {
>                 stepLines.push(`        <Warmup Duration="${dur}" PowerLow="${step.powerLowPct.toFixed(2)}" PowerHigh="${step.powerHighPct.toFixed(2)}"${cadAttr}/>`);
>             } else if (step.type === 'cooldown') {
>                 stepLines.push(`        <Cooldown Duration="${dur}" PowerLow="${step.powerHighPct.toFixed(2)}" PowerHigh="${step.powerLowPct.toFixed(2)}"${cadAttr}/>`);
>             } else if (Math.abs(step.powerHighPct - step.powerLowPct) > 0.03) {
>                 stepLines.push(`        <Ramp Duration="${dur}" PowerLow="${step.powerLowPct.toFixed(2)}" PowerHigh="${step.powerHighPct.toFixed(2)}"${cadAttr}/>`);
>             } else {
>                 stepLines.push(`        <SteadyState Duration="${dur}" Power="${step.powerLowPct.toFixed(2)}"${cadAttr}/>`);
>             }
>         }
>     } else {
>         const warmup = Math.min(600, Math.round(totalSec * 0.15));
>         const cooldown = Math.min(600, Math.round(totalSec * 0.15));
>         const main = Math.max(600, totalSec - warmup - cooldown);
>         stepLines.push(`        <Warmup Duration="${warmup}" PowerLow="0.50" PowerHigh="0.68" Cadence="85"/>`);
>         stepLines.push(`        <SteadyState Duration="${main}" Power="0.70" Cadence="90"/>`);
>         stepLines.push(`        <Cooldown Duration="${cooldown}" PowerLow="0.65" PowerHigh="0.50" Cadence="85"/>`);
>     }
> 
>     return `<?xml version="1.0" encoding="UTF-8"?>
> <workout_file>
>     <author>RunFlow</author>
>     <name>${escapeXml(params.name)}</name>
>     <description>${escapeXml(params.description)}</description>
>     <sportType>bike</sportType>
>     <tags>
>         <tag name="RunFlow"/>
>         <tag name="MyWhoosh"/>
>     </tags>
>     <workout>
> ${stepLines.join('\n')}
>     </workout>
> </workout_file>`;
> }
> 
> ```
>
> **REPLACE WITH:**
>
> ```
> import { MyWhooshWorkout, findClosestMyWhooshWorkout } from './mywhooshMatcher';
> import type { StructuredWorkoutV2, StepNode, StructuredStep } from './structured';
> 
> function escapeXml(unsafe: string): string {
>     return unsafe
>         .replace(/&/g, '&amp;')
>         .replace(/</g, '&lt;')
>         .replace(/>/g, '&gt;')
>         .replace(/"/g, '&quot;')
>         .replace(/'/g, '&apos;');
> }
> 
> function resolveStepPowerPct(step: StructuredStep, fallbackPct: number): number {
>     if (step.target?.type === 'power' && typeof step.target.ftpPercent === 'number' && step.target.ftpPercent > 0) {
>         return step.target.ftpPercent / 100;
>     }
>     return fallbackPct;
> }
> 
> function resolveStepSeconds(step: StructuredStep, fallbackSeconds: number): number {
>     if (step.duration?.type === 'time' && typeof step.duration.seconds === 'number' && step.duration.seconds > 0) {
>         return Math.max(10, Math.round(step.duration.seconds));
>     }
>     return fallbackSeconds;
> }
> 
> function serializeStructuredNodesToZwoLines(nodes: StepNode[]): string[] {
>     const lines: string[] = [];
>     for (const node of nodes) {
>         if (node.kind === 'repeat') {
>             const reps = Math.max(1, Math.round(node.times || 1));
>             const innerSteps = node.steps.filter((s): s is StructuredStep => s.kind !== 'repeat');
>             if (innerSteps.length === 2 && innerSteps[0].kind === 'work' && innerSteps[1].kind === 'recovery') {
>                 const onDur = resolveStepSeconds(innerSteps[0], 180);
>                 const offDur = resolveStepSeconds(innerSteps[1], 60);
>                 const onPow = resolveStepPowerPct(innerSteps[0], 0.95).toFixed(2);
>                 const offPow = resolveStepPowerPct(innerSteps[1], 0.55).toFixed(2);
>                 const cadAttr = innerSteps[0].cadenceRpm ? ` Cadence="${innerSteps[0].cadenceRpm}"` : '';
>                 lines.push(`        <IntervalsT Repeat="${reps}" OnDuration="${onDur}" OffDuration="${offDur}" OnPower="${onPow}" OffPower="${offPow}"${cadAttr}/>`);
>             } else {
>                 for (let i = 0; i < reps; i++) {
>                     lines.push(...serializeStructuredNodesToZwoLines(node.steps));
>                 }
>             }
>         } else {
>             const dur = resolveStepSeconds(node, 300);
>             const cadAttr = node.cadenceRpm ? ` Cadence="${node.cadenceRpm}"` : '';
>             if (node.target?.type === 'free') {
>                 lines.push(`        <FreeRide Duration="${dur}"${cadAttr}/>`);
>             } else if (node.kind === 'warmup') {
>                 const pHigh = resolveStepPowerPct(node, 0.70);
>                 const pLow = Math.max(0.40, Number((pHigh - 0.15).toFixed(2)));
>                 lines.push(`        <Warmup Duration="${dur}" PowerLow="${pLow.toFixed(2)}" PowerHigh="${pHigh.toFixed(2)}"${cadAttr}/>`);
>             } else if (node.kind === 'cooldown') {
>                 const pHigh = resolveStepPowerPct(node, 0.60);
>                 const pLow = Math.max(0.40, Number((pHigh - 0.15).toFixed(2)));
>                 lines.push(`        <Cooldown Duration="${dur}" PowerLow="${pHigh.toFixed(2)}" PowerHigh="${pLow.toFixed(2)}"${cadAttr}/>`);
>             } else {
>                 const p = resolveStepPowerPct(node, 0.70).toFixed(2);
>                 lines.push(`        <SteadyState Duration="${dur}" Power="${p}"${cadAttr}/>`);
>             }
>         }
>     }
>     return lines;
> }
> 
> export function generateMyWhooshZwoXml(params: {
>     name: string;
>     description: string;
>     workoutType: string;
>     targetDurationSeconds: number;
>     phase?: string;
>     matchedWorkout?: MyWhooshWorkout | null;
>     structuredSteps?: StructuredWorkoutV2 | null;
> }): string {
>     const stepLines: string[] = [];
> 
>     if (params.structuredSteps && Array.isArray(params.structuredSteps.steps) && params.structuredSteps.steps.length > 0 && !params.matchedWorkout) {
>         stepLines.push(...serializeStructuredNodesToZwoLines(params.structuredSteps.steps));
>     }
> 
>     if (stepLines.length === 0) {
>         const match = params.matchedWorkout ?? findClosestMyWhooshWorkout({
>             workoutType: params.workoutType,
>             targetDurationSeconds: params.targetDurationSeconds,
>             description: params.description,
>             phase: params.phase,
>         });
> 
>         const totalSec = params.targetDurationSeconds > 0 ? params.targetDurationSeconds : (match?.durationSeconds || 3600);
>         const scale = match && match.durationSeconds > 0 ? totalSec / match.durationSeconds : 1.0;
> 
>         if (match && match.steps && match.steps.length > 0) {
>             for (const step of match.steps) {
>                 const dur = Math.max(10, Math.round((step.durationSeconds * scale) / 5) * 5);
>                 const cadAttr = step.cadenceRpm ? ` Cadence="${step.cadenceRpm}"` : '';
>                 if (step.type === 'interval' && (step.repeatCount ?? 1) > 1) {
>                     const reps = Math.max(1, Math.round(step.repeatCount ?? 1));
>                     const offDur = Math.max(10, Math.round(((step.offDurationSeconds ?? 60) * scale) / 5) * 5);
>                     const offPow = (step.offPowerPct ?? 0.50).toFixed(2);
>                     stepLines.push(`        <IntervalsT Repeat="${reps}" OnDuration="${dur}" OffDuration="${offDur}" OnPower="${step.powerLowPct.toFixed(2)}" OffPower="${offPow}"${cadAttr}/>`);
>                 } else if (step.type === 'warmup') {
>                     stepLines.push(`        <Warmup Duration="${dur}" PowerLow="${step.powerLowPct.toFixed(2)}" PowerHigh="${step.powerHighPct.toFixed(2)}"${cadAttr}/>`);
>                 } else if (step.type === 'cooldown') {
>                     stepLines.push(`        <Cooldown Duration="${dur}" PowerLow="${step.powerHighPct.toFixed(2)}" PowerHigh="${step.powerLowPct.toFixed(2)}"${cadAttr}/>`);
>                 } else if (Math.abs(step.powerHighPct - step.powerLowPct) > 0.03) {
>                     stepLines.push(`        <Ramp Duration="${dur}" PowerLow="${step.powerLowPct.toFixed(2)}" PowerHigh="${step.powerHighPct.toFixed(2)}"${cadAttr}/>`);
>                 } else {
>                     stepLines.push(`        <SteadyState Duration="${dur}" Power="${step.powerLowPct.toFixed(2)}"${cadAttr}/>`);
>                 }
>             }
>         } else {
>             const warmup = Math.min(600, Math.round(totalSec * 0.15));
>             const cooldown = Math.min(600, Math.round(totalSec * 0.15));
>             const main = Math.max(600, totalSec - warmup - cooldown);
>             stepLines.push(`        <Warmup Duration="${warmup}" PowerLow="0.50" PowerHigh="0.68" Cadence="85"/>`);
>             stepLines.push(`        <SteadyState Duration="${main}" Power="0.70" Cadence="90"/>`);
>             stepLines.push(`        <Cooldown Duration="${cooldown}" PowerLow="0.65" PowerHigh="0.50" Cadence="85"/>`);
>         }
>     }
> 
>     return `<?xml version="1.0" encoding="UTF-8"?>
> <workout_file>
>     <author>RunFlow</author>
>     <name>${escapeXml(params.name)}</name>
>     <description>${escapeXml(params.description)}</description>
>     <sportType>bike</sportType>
>     <tags>
>         <tag name="RunFlow"/>
>         <tag name="MyWhoosh"/>
>     </tags>
>     <workout>
> ${stepLines.join('\n')}
>     </workout>
> </workout_file>`;
> }
> 
> ```
>
> #### Edit 2.2: Pass `matchedWorkout` and `structuredSteps` When Exporting `.zwo` in `Web/src/components/PlanEditor/WorkoutDetailPanel.tsx`
>
> Open `Web/src/components/PlanEditor/WorkoutDetailPanel.tsx` (lines 608–631).
>
> **FIND:**
>
> ```
>                             <button
>                                 type="button"
>                                 onClick={() => {
>                                     const xml = generateMyWhooshZwoXml({
>                                         name: form.customName || form.description || 'RunFlow Bike Workout',
>                                         description: form.description || '',
>                                         workoutType: form.workoutType,
>                                         targetDurationSeconds: form.targetDuration || 3600,
>                                         phase: form.phase,
>                                     });
> 
> ```
>
> **REPLACE WITH:**
>
> ```
>                             <button
>                                 type="button"
>                                 onClick={() => {
>                                     const explicitMatch = MYWHOOSH_WORKOUTS.find(
>                                         (w) =>
>                                             form.customName === `MyWhoosh: ${w.name}` ||
>                                             (form.description && form.description.includes(w.name))
>                                     ) ?? null;
>                                     const xml = generateMyWhooshZwoXml({
>                                         name: form.customName || form.description || 'RunFlow Bike Workout',
>                                         description: form.description || '',
>                                         workoutType: form.workoutType,
>                                         targetDurationSeconds: form.targetDuration || 3600,
>                                         phase: form.phase,
>                                         matchedWorkout: explicitMatch,
>                                         structuredSteps: form.structuredSteps,
>                                     });
> 
> ```
>
> #### Edit 2.3: Send `weeklyMileageGoal` in `POST /api/plans` Create Branch of `Web/src/components/PlanEditor/EngineGenerateModal.tsx`
>
> Open `Web/src/components/PlanEditor/EngineGenerateModal.tsx` (lines 154–166).
>
> **FIND:**
>
> ```
>                         runsPerWeek,
>                         ridesPerWeek,
>                         swimsPerWeek,
>                         strengthPerWeek,
>                         targetVolume: weeklyMileageGoal * 1000,
>                         buildWeeks,
> 
> ```
>
> **REPLACE WITH:**
>
> ```
>                         runsPerWeek,
>                         ridesPerWeek,
>                         swimsPerWeek,
>                         strengthPerWeek,
>                         weeklyMileageGoal: weeklyMileageGoal * 1000,
>                         targetVolume: weeklyMileageGoal * 1000,
>                         buildWeeks,
> 
> ```
>
> #### Edit 2.4: Deduplicate Past Weeks Containing Completed Workouts in `Web/src/app/api/plan-advanced/[goalId]/regenerate/route.ts`
>
> Open `Web/src/app/api/plan-advanced/[goalId]/regenerate/route.ts` (lines 222–264). Filter out generated workouts on or before the latest completed workout's date so mid-plan regeneration does not insert duplicate uncompleted workouts into already-completed weeks.
>
> **FIND:**
>
> ```
>             await prisma.$transaction(async (tx) => {
>                 await tx.workout.deleteMany({
>                     where: { goalId, isCompleted: false },
>                 });
>                 await tx.goal.update({
>                     where: { id: goalId },
>                     data: {
>                         sport: nextSport,
>                         raceType: nextRaceType,
>                         raceDate: nextRaceDate,
>                         planWeeks: totalWeeks,
>                         currentVdot: nextVdot,
>                         ftpAtCreation: nextFtp,
>                         swimCssAtCreation: nextCss,
>                         runsPerWeek: nextRuns,
>                         ridesPerWeek: nextRides,
>                         swimsPerWeek: nextSwims,
>                         strengthPerWeek: nextStrength,
>                         weeklyMileageGoal: nextMileageMeters,
>                         buildWeeks: nextBuild,
>                         peakWeeks: nextPeak,
>                         taperWeeks: nextTaper,
>                         weeklyBikeTssGoal: weeklyGoals.bikeTss,
>                         weeklySwimMetersGoal: weeklyGoals.swimMeters,
>                         targetWeeklyTss: weeklyGoals.totalTss,
>                         ...(phaseBlocks.length > 0 && { phaseBlocks: phaseBlocks as unknown as Prisma.InputJsonValue }),
>                     },
>                 });
>                 if (generated.length > 0) {
>                     await tx.workout.createMany({
>                         data: mapWorkoutsForDb(generated, { goalId, ftpWatts: nextFtp }),
>                     });
>                 }
>             });
> 
>             return NextResponse.json({
>                 success: true,
>                 regeneratedWorkouts: generated.length,
>                 sport: nextSport,
>                 raceType: nextRaceType,
>                 totalWeeks,
>             });
> 
> ```
>
> **REPLACE WITH:**
>
> ```
>             const lastCompletedWorkout = await prisma.workout.findFirst({
>                 where: { goalId, isCompleted: true },
>                 orderBy: { scheduledDate: 'desc' },
>                 select: { scheduledDate: true },
>             });
>             const workoutsToInsert = lastCompletedWorkout?.scheduledDate
>                 ? generated.filter((w) => new Date(w.date).getTime() > new Date(lastCompletedWorkout.scheduledDate).getTime())
>                 : generated;
> 
>             await prisma.$transaction(async (tx) => {
>                 await tx.workout.deleteMany({
>                     where: { goalId, isCompleted: false },
>                 });
>                 await tx.goal.update({
>                     where: { id: goalId },
>                     data: {
>                         sport: nextSport,
>                         raceType: nextRaceType,
>                         raceDate: nextRaceDate,
>                         planWeeks: totalWeeks,
>                         currentVdot: nextVdot,
>                         ftpAtCreation: nextFtp,
>                         swimCssAtCreation: nextCss,
>                         runsPerWeek: nextRuns,
>                         ridesPerWeek: nextRides,
>                         swimsPerWeek: nextSwims,
>                         strengthPerWeek: nextStrength,
>                         weeklyMileageGoal: nextMileageMeters,
>                         buildWeeks: nextBuild,
>                         peakWeeks: nextPeak,
>                         taperWeeks: nextTaper,
>                         weeklyBikeTssGoal: weeklyGoals.bikeTss,
>                         weeklySwimMetersGoal: weeklyGoals.swimMeters,
>                         targetWeeklyTss: weeklyGoals.totalTss,
>                         ...(phaseBlocks.length > 0 && { phaseBlocks: phaseBlocks as unknown as Prisma.InputJsonValue }),
>                     },
>                 });
>                 if (workoutsToInsert.length > 0) {
>                     await tx.workout.createMany({
>                         data: mapWorkoutsForDb(workoutsToInsert, { goalId, ftpWatts: nextFtp }),
>                     });
>                 }
>             });
> 
>             return NextResponse.json({
>                 success: true,
>                 regeneratedWorkouts: workoutsToInsert.length,
>                 sport: nextSport,
>                 raceType: nextRaceType,
>                 totalWeeks,
>             });
> 
> ```
>
> #### Edit 2.5: Detect `matchToMyWhoosh` Toggle and Deduplicate Completed Past Weeks in `Web/src/app/api/settings/update-vdot/route.ts`
>
> Open `Web/src/app/api/settings/update-vdot/route.ts` (lines 257–266 and lines 333–466).
>
> First, in `Web/src/app/api/settings/update-vdot/route.ts` (lines 257–266):
>
> **FIND:**
>
> ```
>         // Fetch current user profile for HR zone fallback values
>         const currentUser = await prisma.user.findUnique({
>             where: { id: session.user.id },
>             select: {
>                 hrMax: true, hrRest: true, thresholdHeartRate: true,
>                 hrZone1Max: true, hrZone2Max: true, hrZone3Max: true,
>                 hrZone4Max: true, hrZone5Max: true, hrZone6Max: true,
>             },
>         });
> 
> ```
>
> **REPLACE WITH:**
>
> ```
>         // Fetch current user profile for HR zone fallback values and MyWhoosh preference
>         const currentUser = await prisma.user.findUnique({
>             where: { id: session.user.id },
>             select: {
>                 hrMax: true, hrRest: true, thresholdHeartRate: true,
>                 hrZone1Max: true, hrZone2Max: true, hrZone3Max: true,
>                 hrZone4Max: true, hrZone5Max: true, hrZone6Max: true,
>                 matchToMyWhoosh: true,
>             },
>         });
> 
> ```
>
> Second, in `Web/src/app/api/settings/update-vdot/route.ts` (lines 333–466):
>
> **FIND:**
>
> ```
>             const raceTypeChanged = raceType !== undefined && raceType !== activeGoal.raceType;
>             const sportChanged = sport !== undefined && sport !== activeGoal.sport;
>             const ridesChanged = typeof ridesPerWeek === 'number' && ridesPerWeek !== activeGoal.ridesPerWeek;
>             const swimsChanged = typeof swimsPerWeek === 'number' && swimsPerWeek !== activeGoal.swimsPerWeek;
>             const runsChanged = typeof runsPerWeek === 'number' && runsPerWeek !== activeGoal.runsPerWeek;
>             const mywhooshProvided = Boolean(mywhooshPlanId);
> 
>             const shouldRegenerate =
>                 raceTypeChanged ||
>                 sportChanged ||
>                 sport === 'TRIATHLON' ||
>                 ridesChanged ||
>                 swimsChanged ||
>                 runsChanged ||
>                 mywhooshProvided;
> 
>             if (shouldRegenerate) {
>                 const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
>                 const startDate = (planStartDate ? new Date(planStartDate) : null) || firstPendingWorkout?.scheduledDate || activeGoal.planStartDate || new Date();
>                 const nextRaceDate = (raceDate ? new Date(raceDate) : null) || activeGoal.raceDate || new Date(startDate.getTime() + 12 * MS_PER_WEEK);
>                 const totalWeeks = Math.max(4, Math.ceil((new Date(nextRaceDate).getTime() - new Date(startDate).getTime()) / MS_PER_WEEK));
> 
>                 const userThresholds = await prisma.user.findUnique({
>                     where: { id: session.user.id },
>                     select: { ftpWatts: true, swimCssSecPer100m: true },
>                 });
>                 const nextFtp = userThresholds?.ftpWatts || activeGoal.ftpAtCreation || 220;
>                 const nextCss = userThresholds?.swimCssSecPer100m || activeGoal.swimCssAtCreation || 115;
> 
>                 const rawMileage = typeof weeklyMileageGoal === 'number' ? weeklyMileageGoal : (activeGoal.weeklyMileageGoal || 40000);
>                 const nextMileageMeters = rawMileage < 500 ? rawMileage * 1000 : rawMileage;
> 
>                 const nextRuns = typeof runsPerWeek === 'number' ? runsPerWeek : (activeGoal.runsPerWeek || 4);
>                 const nextRides = typeof ridesPerWeek === 'number' ? ridesPerWeek : (isTri ? Math.max(2, activeGoal.ridesPerWeek || 0) : (activeGoal.ridesPerWeek || 0));
>                 const nextSwims = typeof swimsPerWeek === 'number' ? swimsPerWeek : (isTri ? Math.max(2, activeGoal.swimsPerWeek || 0) : (activeGoal.swimsPerWeek || 0));
>                 const nextStrength = typeof strengthPerWeek === 'number' ? strengthPerWeek : (activeGoal.strengthPerWeek || 0);
> 
>                 const nextLongRunDay = typeof longRunDay === 'number' ? longRunDay : activeGoal.longRunDay;
>                 const nextWorkoutDay = typeof qualityDay === 'number' ? qualityDay : activeGoal.workoutDay;
>                 const nextSwimDay = typeof swimDay === 'number' ? swimDay : (activeGoal.swimDay ?? undefined);
>                 const nextRestDays = Array.isArray(restDays) ? (restDays as number[]) : (Array.isArray(activeGoal.restDays) ? (activeGoal.restDays as number[]) : undefined);
> 
>                 const planConfig: PlanConfig = {
>                     vdot: newVdot,
>                     raceType: nextRaceType,
>                     raceDate: nextRaceDate,
>                     startDate,
>                     sport: nextSport,
>                     runsPerWeek: nextRuns,
>                     ridesPerWeek: nextRides,
>                     swimsPerWeek: nextSwims,
>                     strengthPerWeek: nextStrength,
>                     weeklyMileageGoal: nextMileageMeters,
>                     buildWeeks: build,
>                     peakWeeks: peak,
>                     taperWeeks: taper,
>                     weeksTotal: totalWeeks,
>                     ftpWatts: nextFtp,
>                     swimCssSecPer100m: nextCss,
>                     matchToMyWhoosh: Boolean(matchToMyWhoosh),
>                     mywhooshPlanId: typeof mywhooshPlanId === 'string' && mywhooshPlanId ? mywhooshPlanId : null,
>                     longRunDay: nextLongRunDay,
>                     workoutDay: nextWorkoutDay,
>                     swimDay: nextSwimDay,
>                     restDays: nextRestDays,
>                     maxLongRunKm: normalizedMaxLongRunKm,
>                     thresholdHeartRate: typeof thresholdHeartRate === 'number' ? Math.round(thresholdHeartRate) : currentUser?.thresholdHeartRate ?? null,
>                     hrZone1Max: typeof hrZone1Max === 'number' ? Math.round(hrZone1Max) : currentUser?.hrZone1Max ?? null,
>                     hrZone2Max: typeof hrZone2Max === 'number' ? Math.round(hrZone2Max) : currentUser?.hrZone2Max ?? null,
>                     hrZone3Max: typeof hrZone3Max === 'number' ? Math.round(hrZone3Max) : currentUser?.hrZone3Max ?? null,
>                     hrZone4Max: typeof hrZone4Max === 'number' ? Math.round(hrZone4Max) : currentUser?.hrZone4Max ?? null,
>                     hrZone5Max: typeof hrZone5Max === 'number' ? Math.round(hrZone5Max) : currentUser?.hrZone5Max ?? null,
>                     hrZone6Max: typeof hrZone6Max === 'number' ? Math.round(hrZone6Max) : currentUser?.hrZone6Max ?? null,
>                     hrMax: typeof maxHeartRate === 'number' ? Math.round(maxHeartRate) : currentUser?.hrMax ?? null,
>                     hrRest: typeof restingHeartRate === 'number' ? Math.round(restingHeartRate) : currentUser?.hrRest ?? null,
>                 };
> 
>                 const generated = generateTrainingPlan(planConfig);
>                 for (const w of generated) {
>                     if (w.plannedTss == null) {
>                         w.plannedTss = calculateWorkoutPlannedTss({
>                             workoutType: w.type as WorkoutType,
>                             sport: w.sport ?? null,
>                             targetDistance: w.totalDistance,
>                             targetDuration: w.targetDuration ?? null,
>                             targetPace: w.targetPace ?? null,
>                             structuredSteps: w.structuredSteps ?? null,
>                             ftpWatts: nextFtp,
>                         });
>                     }
>                 }
>                 const phaseBlocks = buildPlanPhaseBlocks(planConfig, generated);
>                 const weeklyGoals = computePlanWeeklyVolumeGoals(planConfig, generated);
> 
>                 await prisma.$transaction(async (tx) => {
>                     await tx.workout.deleteMany({
>                         where: { goalId: activeGoal.id, isCompleted: false },
>                     });
>                     await tx.goal.update({
>                         where: { id: activeGoal.id },
>                         data: {
>                             sport: nextSport,
>                             raceType: nextRaceType,
>                             raceDate: nextRaceDate,
>                             planStartDate: startDate,
>                             planWeeks: totalWeeks,
>                             currentVdot: newVdot,
>                             ftpAtCreation: nextFtp,
>                             swimCssAtCreation: nextCss,
>                             runsPerWeek: nextRuns,
>                             ridesPerWeek: nextRides,
>                             swimsPerWeek: nextSwims,
>                             strengthPerWeek: nextStrength,
>                             weeklyMileageGoal: nextMileageMeters,
>                             buildWeeks: build,
>                             peakWeeks: peak,
>                             taperWeeks: taper,
>                             longRunDay: nextLongRunDay,
>                             workoutDay: nextWorkoutDay,
>                             swimDay: typeof nextSwimDay === 'number' ? nextSwimDay : null,
>                             ...(nextRestDays && { restDays: nextRestDays }),
>                             weeklyBikeTssGoal: weeklyGoals.bikeTss,
>                             weeklySwimMetersGoal: weeklyGoals.swimMeters,
>                             targetWeeklyTss: weeklyGoals.totalTss,
>                             ...(phaseBlocks.length > 0 && { phaseBlocks: phaseBlocks as unknown as Prisma.InputJsonValue }),
>                         },
>                     });
>                     if (generated.length > 0) {
>                         await tx.workout.createMany({
>                             data: mapWorkoutsForDb(generated, { goalId: activeGoal.id, ftpWatts: nextFtp }),
>                         });
>                     }
>                 });
> 
> ```
>
> **REPLACE WITH:**
>
> ```
>             const raceTypeChanged = raceType !== undefined && raceType !== activeGoal.raceType;
>             const sportChanged = sport !== undefined && sport !== activeGoal.sport;
>             const ridesChanged = typeof ridesPerWeek === 'number' && ridesPerWeek !== activeGoal.ridesPerWeek;
>             const swimsChanged = typeof swimsPerWeek === 'number' && swimsPerWeek !== activeGoal.swimsPerWeek;
>             const runsChanged = typeof runsPerWeek === 'number' && runsPerWeek !== activeGoal.runsPerWeek;
>             const mywhooshChanged = typeof matchToMyWhoosh === 'boolean' && matchToMyWhoosh !== Boolean(currentUser?.matchToMyWhoosh);
>             const mywhooshProvided = Boolean(mywhooshPlanId);
> 
>             const shouldRegenerate =
>                 raceTypeChanged ||
>                 sportChanged ||
>                 sport === 'TRIATHLON' ||
>                 ridesChanged ||
>                 swimsChanged ||
>                 runsChanged ||
>                 mywhooshChanged ||
>                 mywhooshProvided;
> 
>             if (shouldRegenerate) {
>                 const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
>                 const startDate = (planStartDate ? new Date(planStartDate) : null) || firstPendingWorkout?.scheduledDate || activeGoal.planStartDate || new Date();
>                 const nextRaceDate = (raceDate ? new Date(raceDate) : null) || activeGoal.raceDate || new Date(startDate.getTime() + 12 * MS_PER_WEEK);
>                 const totalWeeks = Math.max(4, Math.ceil((new Date(nextRaceDate).getTime() - new Date(startDate).getTime()) / MS_PER_WEEK));
> 
>                 const userThresholds = await prisma.user.findUnique({
>                     where: { id: session.user.id },
>                     select: { ftpWatts: true, swimCssSecPer100m: true },
>                 });
>                 const nextFtp = userThresholds?.ftpWatts || activeGoal.ftpAtCreation || 220;
>                 const nextCss = userThresholds?.swimCssSecPer100m || activeGoal.swimCssAtCreation || 115;
> 
>                 const rawMileage = typeof weeklyMileageGoal === 'number' ? weeklyMileageGoal : (activeGoal.weeklyMileageGoal || 40000);
>                 const nextMileageMeters = rawMileage < 500 ? rawMileage * 1000 : rawMileage;
> 
>                 const nextRuns = typeof runsPerWeek === 'number' ? runsPerWeek : (activeGoal.runsPerWeek || 4);
>                 const nextRides = typeof ridesPerWeek === 'number' ? ridesPerWeek : (isTri ? Math.max(2, activeGoal.ridesPerWeek || 0) : (activeGoal.ridesPerWeek || 0));
>                 const nextSwims = typeof swimsPerWeek === 'number' ? swimsPerWeek : (isTri ? Math.max(2, activeGoal.swimsPerWeek || 0) : (activeGoal.swimsPerWeek || 0));
>                 const nextStrength = typeof strengthPerWeek === 'number' ? strengthPerWeek : (activeGoal.strengthPerWeek || 0);
> 
>                 const nextLongRunDay = typeof longRunDay === 'number' ? longRunDay : activeGoal.longRunDay;
>                 const nextWorkoutDay = typeof qualityDay === 'number' ? qualityDay : activeGoal.workoutDay;
>                 const nextSwimDay = typeof swimDay === 'number' ? swimDay : (activeGoal.swimDay ?? undefined);
>                 const nextRestDays = Array.isArray(restDays) ? (restDays as number[]) : (Array.isArray(activeGoal.restDays) ? (activeGoal.restDays as number[]) : undefined);
> 
>                 const planConfig: PlanConfig = {
>                     vdot: newVdot,
>                     raceType: nextRaceType,
>                     raceDate: nextRaceDate,
>                     startDate,
>                     sport: nextSport,
>                     runsPerWeek: nextRuns,
>                     ridesPerWeek: nextRides,
>                     swimsPerWeek: nextSwims,
>                     strengthPerWeek: nextStrength,
>                     weeklyMileageGoal: nextMileageMeters,
>                     buildWeeks: build,
>                     peakWeeks: peak,
>                     taperWeeks: taper,
>                     weeksTotal: totalWeeks,
>                     ftpWatts: nextFtp,
>                     swimCssSecPer100m: nextCss,
>                     matchToMyWhoosh: Boolean(matchToMyWhoosh),
>                     mywhooshPlanId: typeof mywhooshPlanId === 'string' && mywhooshPlanId ? mywhooshPlanId : null,
>                     longRunDay: nextLongRunDay,
>                     workoutDay: nextWorkoutDay,
>                     swimDay: nextSwimDay,
>                     restDays: nextRestDays,
>                     maxLongRunKm: normalizedMaxLongRunKm,
>                     thresholdHeartRate: typeof thresholdHeartRate === 'number' ? Math.round(thresholdHeartRate) : currentUser?.thresholdHeartRate ?? null,
>                     hrZone1Max: typeof hrZone1Max === 'number' ? Math.round(hrZone1Max) : currentUser?.hrZone1Max ?? null,
>                     hrZone2Max: typeof hrZone2Max === 'number' ? Math.round(hrZone2Max) : currentUser?.hrZone2Max ?? null,
>                     hrZone3Max: typeof hrZone3Max === 'number' ? Math.round(hrZone3Max) : currentUser?.hrZone3Max ?? null,
>                     hrZone4Max: typeof hrZone4Max === 'number' ? Math.round(hrZone4Max) : currentUser?.hrZone4Max ?? null,
>                     hrZone5Max: typeof hrZone5Max === 'number' ? Math.round(hrZone5Max) : currentUser?.hrZone5Max ?? null,
>                     hrZone6Max: typeof hrZone6Max === 'number' ? Math.round(hrZone6Max) : currentUser?.hrZone6Max ?? null,
>                     hrMax: typeof maxHeartRate === 'number' ? Math.round(maxHeartRate) : currentUser?.hrMax ?? null,
>                     hrRest: typeof restingHeartRate === 'number' ? Math.round(restingHeartRate) : currentUser?.hrRest ?? null,
>                 };
> 
>                 const generated = generateTrainingPlan(planConfig);
>                 for (const w of generated) {
>                     if (w.plannedTss == null) {
>                         w.plannedTss = calculateWorkoutPlannedTss({
>                             workoutType: w.type as WorkoutType,
>                             sport: w.sport ?? null,
>                             targetDistance: w.totalDistance,
>                             targetDuration: w.targetDuration ?? null,
>                             targetPace: w.targetPace ?? null,
>                             structuredSteps: w.structuredSteps ?? null,
>                             ftpWatts: nextFtp,
>                         });
>                     }
>                 }
>                 const phaseBlocks = buildPlanPhaseBlocks(planConfig, generated);
>                 const weeklyGoals = computePlanWeeklyVolumeGoals(planConfig, generated);
> 
>                 const lastCompletedWorkout = prisma.workout?.findFirst
>                     ? await prisma.workout.findFirst({
>                           where: { goalId: activeGoal.id, isCompleted: true },
>                           orderBy: { scheduledDate: 'desc' },
>                           select: { scheduledDate: true },
>                       })
>                     : null;
>                 const workoutsToInsert =
>                     lastCompletedWorkout?.scheduledDate && lastCompletedWorkout.scheduledDate !== firstPendingWorkout?.scheduledDate
>                         ? generated.filter((w) => new Date(w.date).getTime() > new Date(lastCompletedWorkout.scheduledDate).getTime())
>                         : generated;
> 
>                 await prisma.$transaction(async (tx) => {
>                     await tx.workout.deleteMany({
>                         where: { goalId: activeGoal.id, isCompleted: false },
>                     });
>                     await tx.goal.update({
>                         where: { id: activeGoal.id },
>                         data: {
>                             sport: nextSport,
>                             raceType: nextRaceType,
>                             raceDate: nextRaceDate,
>                             planStartDate: startDate,
>                             planWeeks: totalWeeks,
>                             currentVdot: newVdot,
>                             ftpAtCreation: nextFtp,
>                             swimCssAtCreation: nextCss,
>                             runsPerWeek: nextRuns,
>                             ridesPerWeek: nextRides,
>                             swimsPerWeek: nextSwims,
>                             strengthPerWeek: nextStrength,
>                             weeklyMileageGoal: nextMileageMeters,
>                             buildWeeks: build,
>                             peakWeeks: peak,
>                             taperWeeks: taper,
>                             longRunDay: nextLongRunDay,
>                             workoutDay: nextWorkoutDay,
>                             swimDay: typeof nextSwimDay === 'number' ? nextSwimDay : null,
>                             ...(nextRestDays && { restDays: nextRestDays }),
>                             weeklyBikeTssGoal: weeklyGoals.bikeTss,
>                             weeklySwimMetersGoal: weeklyGoals.swimMeters,
>                             targetWeeklyTss: weeklyGoals.totalTss,
>                             ...(phaseBlocks.length > 0 && { phaseBlocks: phaseBlocks as unknown as Prisma.InputJsonValue }),
>                         },
>                     });
>                     if (workoutsToInsert.length > 0) {
>                         await tx.workout.createMany({
>                             data: mapWorkoutsForDb(workoutsToInsert, { goalId: activeGoal.id, ftpWatts: nextFtp }),
>                         });
>                     }
>                 });
> 
> ```
>
> #### Verify Agent-Fix-2:
>
> Run:
>
> ```
> cd Web && npx tsc --noEmit && npm test -- src/lib/mywhoosh/__tests__/parser.test.ts
> 
> ```

### Agent-Fix-3 Prompt (`android-rf012-hardening`)

> **Role**: Android Security Follow-Up Agent `android-rf012-hardening` (Model: Gemini 3.8 Flash Medium)
> **Exclusive Write Scope**:
>
> * `android/app/src/main/java/com/runflow2/app/data/net/Api.kt`
>
> * `android/app/src/main/java/com/runflow2/app/data/net/NetworkClient.kt`
>
> * `android/app/src/test/java/com/runflow2/app/StravaAuthTest.kt`
>
> * `android/app/src/test/java/com/runflow2/app/ApiContractTest.kt`
>   **Do NOT edit any files outside your Exclusive Write Scope.**
>
> Apply the following 4 exact `FIND` / `REPLACE WITH` edits in order:
>
> #### Edit 3.1: Restrict `isLoopback` in `android/app/src/main/java/com/runflow2/app/data/net/Api.kt` to Strict Loopback/Emulator Addresses Only
>
> Open `android/app/src/main/java/com/runflow2/app/data/net/Api.kt` (lines 78–82). Remove `.local` mDNS exceptions so only `10.0.2.2`, `localhost`, `127.0.0.1`, `::1`, and `[::1]` are permitted over `http://`.
>
> **FIND:**
>
> ```
>             val isLoopback = host == "10.0.2.2" || host == "localhost" || host == "127.0.0.1" ||
>                 host == "::1" || host == "[::1]" || host == "staging.local" || host.endsWith(".local")
> 
> ```
>
> **REPLACE WITH:**
>
> ```
>             val isLoopback = host == "10.0.2.2" || host == "localhost" || host == "127.0.0.1" ||
>                 host == "::1" || host == "[::1]"
> 
> ```
>
> #### Edit 3.2: Initialize `previousBaseUrl` Immediately in `android/app/src/main/java/com/runflow2/app/data/net/NetworkClient.kt`
>
> Open `android/app/src/main/java/com/runflow2/app/data/net/NetworkClient.kt` (lines 34–85). Initialize `previousBaseUrl = Api.normalizeServerUrl(initialBaseUrl)` so direct `client.baseUrl = "https://other.example.com"` assignments immediately clear `authStore`, while using `isInitialEmission` inside `observeServerUrl` so the initial DataStore value loaded at startup does not clear `authStore` when restoring a saved custom server URL.
>
> **FIND:**
>
> ```
>     @Volatile
>     var previousBaseUrl: String? = null
>         internal set
> 
>     @Volatile
>     internal var onOriginSwitched: (() -> Unit)? = null
> 
>     @Volatile
>     var baseUrl: String = Api.normalizeServerUrl(initialBaseUrl)
>         set(value) {
>             val normalized = Api.normalizeServerUrl(value)
>             val prev = previousBaseUrl
>             if (prev != null && prev != normalized) {
>                 AppLog.i("Net", "Server origin changed from $prev to $normalized via baseUrl setter — clearing session")
>                 runCatching { runBlocking { authStore?.clear() } }
>                 onOriginSwitched?.invoke()
>             }
>             previousBaseUrl = normalized
>             field = normalized
>         }
> 
>     @Volatile private var cachedApi: RunFlowApi? = null
>     private val apiLock = Any()
> 
>     init {
>         val targetSettings = settings ?: SettingsRepository.instance
>         if (targetSettings != null) {
>             observeSettings(targetSettings, scope)
>         }
>     }
> 
>     fun observeSettings(settings: SettingsRepository, scope: CoroutineScope): Job =
>         observeServerUrl(settings.settings.map { it.serverUrl }, scope)
> 
>     fun observeServerUrl(serverUrlFlow: Flow<String>, scope: CoroutineScope): Job {
>         return scope.launch {
>             serverUrlFlow.collect { rawUrl ->
>                 val normalized = Api.normalizeServerUrl(rawUrl)
>                 val prev = previousBaseUrl
>                 if (prev != null && prev != normalized) {
>                     AppLog.i("Net", "Server origin changed from $prev to $normalized — clearing session")
>                     runCatching { authStore?.clear() }
>                     onOriginSwitched?.invoke()
>                 }
>                 previousBaseUrl = normalized
>                 if (baseUrl != normalized) {
>                     baseUrl = normalized
>                     reset()
>                 }
>             }
>         }
>     }
> 
> ```
>
> **REPLACE WITH:**
>
> ```
>     @Volatile
>     var previousBaseUrl: String? = Api.normalizeServerUrl(initialBaseUrl)
>         internal set
> 
>     @Volatile
>     internal var onOriginSwitched: (() -> Unit)? = null
> 
>     @Volatile
>     var baseUrl: String = Api.normalizeServerUrl(initialBaseUrl)
>         set(value) {
>             val normalized = Api.normalizeServerUrl(value)
>             val prev = previousBaseUrl
>             if (prev != null && prev != normalized) {
>                 AppLog.i("Net", "Server origin changed from $prev to $normalized via baseUrl setter — clearing session")
>                 runCatching { runBlocking { authStore?.clear() } }
>                 onOriginSwitched?.invoke()
>             }
>             previousBaseUrl = normalized
>             field = normalized
>         }
> 
>     @Volatile private var cachedApi: RunFlowApi? = null
>     private val apiLock = Any()
> 
>     init {
>         val targetSettings = settings ?: SettingsRepository.instance
>         if (targetSettings != null) {
>             observeSettings(targetSettings, scope)
>         }
>     }
> 
>     fun observeSettings(settings: SettingsRepository, scope: CoroutineScope): Job =
>         observeServerUrl(settings.settings.map { it.serverUrl }, scope)
> 
>     fun observeServerUrl(serverUrlFlow: Flow<String>, scope: CoroutineScope): Job {
>         return scope.launch {
>             var isFirstEmission = true
>             serverUrlFlow.collect { rawUrl ->
>                 val normalized = Api.normalizeServerUrl(rawUrl)
>                 val prev = previousBaseUrl
>                 if (!isFirstEmission && prev != null && prev != normalized) {
>                     AppLog.i("Net", "Server origin changed from $prev to $normalized — clearing session")
>                     runCatching { authStore?.clear() }
>                     onOriginSwitched?.invoke()
>                 }
>                 isFirstEmission = false
>                 previousBaseUrl = normalized
>                 if (baseUrl != normalized) {
>                     baseUrl = normalized
>                     reset()
>                 }
>             }
>         }
>     }
> 
> ```
>
> #### Edit 3.3: Update `StravaAuthTest.kt` to Expect HTTPS Upgrade for `http://staging.local:8080/api`
>
> Open `android/app/src/test/java/com/runflow2/app/StravaAuthTest.kt` (lines 135–139).
>
> **FIND:**
>
> ```
>         assertEquals(
>             "http://staging.local:8080",
>             com.runflow2.app.data.net.Api.normalizeServerUrl("http://staging.local:8080/api"),
>         )
> 
> ```
>
> **REPLACE WITH:**
>
> ```
>         assertEquals(
>             "https://staging.local:8080",
>             com.runflow2.app.data.net.Api.normalizeServerUrl("http://staging.local:8080/api"),
>         )
> 
> ```
>
> #### Edit 3.4: Update `ApiContractTest.kt` Setter Test for Pre-Initialized `previousBaseUrl`
>
> Open `android/app/src/test/java/com/runflow2/app/ApiContractTest.kt` (lines 574–598).
>
> **FIND:**
>
> ```
>     @Test
>     fun `network client baseUrl setter triggers origin switch when changed from non-null previousBaseUrl`() {
>         var originSwitchedCount = 0
>         val client = NetworkClient(
>             authStore = null,
>             initialBaseUrl = Api.DEFAULT_BASE_URL,
>         ).apply {
>             onOriginSwitched = { originSwitchedCount++ }
>         }
> 
>         // Initially previousBaseUrl is null
>         assertEquals(null, client.previousBaseUrl)
> 
>         // Setting same origin sets previousBaseUrl without origin switch
>         client.baseUrl = Api.DEFAULT_BASE_URL
>         assertEquals(Api.DEFAULT_BASE_URL, client.previousBaseUrl)
>         assertEquals(0, originSwitchedCount)
> 
>         // Setting different origin triggers origin switch
>         client.baseUrl = "http://evil.example.com"
>         assertEquals("https://evil.example.com", client.baseUrl)
>         assertEquals("https://evil.example.com", client.previousBaseUrl)
>         assertEquals(1, originSwitchedCount)
>     }
> 
> ```
>
> **REPLACE WITH:**
>
> ```
>     @Test
>     fun `network client baseUrl setter triggers origin switch immediately on first origin change`() {
>         var originSwitchedCount = 0
>         val client = NetworkClient(
>             authStore = null,
>             initialBaseUrl = Api.DEFAULT_BASE_URL,
>         ).apply {
>             onOriginSwitched = { originSwitchedCount++ }
>         }
> 
>         // Initially previousBaseUrl is initialized to the normalized initialBaseUrl
>         assertEquals(Api.DEFAULT_BASE_URL, client.previousBaseUrl)
> 
>         // Setting same origin does not trigger origin switch
>         client.baseUrl = Api.DEFAULT_BASE_URL
>         assertEquals(Api.DEFAULT_BASE_URL, client.previousBaseUrl)
>         assertEquals(0, originSwitchedCount)
> 
>         // Setting different origin immediately triggers origin switch on first call
>         client.baseUrl = "http://evil.example.com"
>         assertEquals("https://evil.example.com", client.baseUrl)
>         assertEquals("https://evil.example.com", client.previousBaseUrl)
>         assertEquals(1, originSwitchedCount)
>     }
> 
> ```
>
> #### Verify Agent-Fix-3:
>
> Run:
>
> ```
> cd android && ./gradlew testDebugUnitTest --tests com.runflow2.app.ApiContractTest --tests com.runflow2.app.StravaAuthTest
> 
> ```

## 3. Final Coordinator Verification Gate

After **Agent-Fix-1**, **Agent-Fix-2**, and **Agent-Fix-3** complete, run the full verification suite:

```
cd Web && npx tsc --noEmit && npm test
cd ../android && ./gradlew :app:compileDebugKotlin && ./gradlew testDebugUnitTest

```