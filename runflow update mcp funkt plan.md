# RunFlow Subagent Execution Playbook (Copy-Paste Spec for Orchestrator + Subagents)

> **INSTRUCTIONS FOR THE ORCHESTRATOR MODEL:**
> 1. Follow the phases below in exact order.
> 2. **Run Phase 0 first** in the main thread (Prisma schema update + `npx prisma generate`) before spawning any subagents.
> 3. **Spawn Subagents 1–6 in parallel** (or sequentially). Every subagent has a **strictly disjoint set of files** so they will never conflict with each other.
> 4. When spawning each subagent, **copy and paste that subagent's entire section verbatim** as its prompt.
> 5. Do **not** skip any `FIND` / `REPLACE` block or file creation step.
> 6. Run **Phase 7 (Final Verification)** after all subagents finish.

---

## Subagent File Ownership Matrix (Zero Overlap)

| Phase / Subagent | Exclusive File Ownership |
|---|---|
| **Phase 0 (Orchestrator)** | `Web/prisma/schema.prisma` |
| **Subagent 1: MCP & OAuth Universal Redirects** | `Web/src/lib/mcp/oauth.ts`<br>`Web/src/lib/mcp/server.ts`<br>`Web/src/app/mcp/route.ts`<br>`Web/src/app/mcp/authorize/page.tsx`<br>`Web/src/app/mcp/authorize/AuthorizeClientActions.tsx`<br>`Web/src/app/mcp/oauth/authorize/route.ts`<br>`Web/src/app/mcp/oauth/register/route.ts`<br>`Web/src/app/mcp/oauth/token/route.ts`<br>`Web/src/middleware.ts` |
| **Subagent 2: Prediction Engine, Effective VO2max & API Routes** | `Web/src/lib/metrics/runalyze.ts`<br>`Web/src/lib/metrics/coreMetrics.ts`<br>`Web/src/app/api/dashboard/route.ts`<br>`Web/src/app/api/v1/dashboard/route.ts`<br>`Web/src/app/api/analytics/stats/route.ts`<br>`Web/src/app/api/analytics/history/route.ts`<br>`Web/src/app/api/settings/update-vdot/route.ts`<br>`Web/src/app/api/settings/vdot-correction/route.ts`<br>`Web/src/app/api/settings/cycling/route.ts`<br>`Web/src/app/api/external/v1/stats/route.ts`<br>`Web/src/app/api/mobile/v1/analytics/stats/route.ts`<br>`Web/src/app/api/mobile/v1/dashboard/route.ts` |
| **Subagent 3: MyWhoosh Matcher, Custom `.zwo` Exporter & Plan Generators** | `Web/src/lib/plans/mywhooshMatcher.ts` *(NEW)*<br>`Web/src/lib/plans/zwoExporter.ts` *(NEW)*<br>`Web/src/lib/plans/index.ts`<br>`Web/src/lib/plans/generators/triathlon.ts` |
| **Subagent 4: Web UI — Editor Back Button, Dashboard Goal/Now & Conditional Analytics Tabs** | `Web/src/components/PlanEditor/Toolbar.tsx`<br>`Web/src/app/plan-advanced/[goalId]/page.tsx`<br>`Web/src/components/RaceCountdown.tsx`<br>`Web/src/app/analytics/page.tsx` |
| **Subagent 5: Web UI — Settings, Calibration Modal, Plan Setup Wizards & MyWhoosh UI** | `Web/src/components/MinimalistPillsMenu.tsx`<br>`Web/src/components/ProfileModal.tsx`<br>`Web/src/components/ShapeCalibrationModal.tsx`<br>`Web/src/components/PlanSetupForm.tsx`<br>`Web/src/components/OnboardingModal.tsx`<br>`Web/src/components/EditPlanModal.tsx`<br>`Web/src/components/WorkoutScheduleCard.tsx` |
| **Subagent 6: Android App — 3 Conditional Headers, Combined Health Data, Dashboard, Math & Settings** | `android/app/src/main/java/com/runflow2/app/ui/screens/AnalyticsScreen.kt`<br>`android/app/src/main/java/com/runflow2/app/ui/screens/DashboardScreen.kt`<br>`android/app/src/main/java/com/runflow2/app/ui/screens/SettingsScreen.kt`<br>`android/app/src/main/java/com/runflow2/app/ui/screens/PlanWizardScreen.kt`<br>`android/app/src/main/java/com/runflow2/app/domain/MarathonShape.kt`<br>`android/app/src/main/java/com/runflow2/app/domain/AnalyticsEngine.kt`<br>`android/app/src/main/java/com/runflow2/app/domain/VdotMath.kt`<br>`android/app/src/main/java/com/runflow2/app/data/repo/RunFlowRepository.kt`<br>`android/app/src/main/java/com/runflow2/app/data/repo/SettingsRepository.kt` |

---

## PHASE 0: Orchestrator Pre-Flight (Run Before Spawning Subagents)

### Step 0.1: Edit `Web/prisma/schema.prisma`
Open `Web/prisma/schema.prisma` and locate the `User` model (around lines 37–50).

**FIND:**
```prisma
  vdotCorrectionFactor  Float                @default(1.0)
  vdotReferenceRaceDate DateTime?
  vdotReferenceRaceTime Int?
  vdotReferenceRaceType String?
  autoRevolvingVo2max      Float?
  autoRevolvingCalculatedAt DateTime?
  includeCrossTraining  Boolean              @default(true)
  useImperial           Boolean              @default(false)
  ftpWatts                  Int?
  autoEstimateFtp           Boolean              @default(true)
```

**REPLACE WITH:**
```prisma
  vdotCorrectionFactor             Float                @default(1.0)
  effectiveVo2maxCorrectionFactor  Float                @default(1.0)
  vdotReferenceRaceDate            DateTime?
  vdotReferenceRaceTime            Int?
  vdotReferenceRaceType            String?
  autoRevolvingVo2max              Float?
  autoRevolvingCalculatedAt        DateTime?
  includeCrossTraining             Boolean              @default(false)
  useImperial                      Boolean              @default(false)
  ftpWatts                         Int?
  autoEstimateFtp                  Boolean              @default(true)
  matchToMyWhoosh                  Boolean              @default(false)
```

### Step 0.2: Regenerate Prisma Client
Run in `Web/`:
```bash
cd Web && npx prisma generate
```

---

## SUBAGENT 1 PROMPT: MCP & OAuth Universal App Compatibility

```markdown
You are Subagent 1.
STRICT SCOPE: You may ONLY edit the following files:
- Web/src/lib/mcp/oauth.ts
- Web/src/lib/mcp/server.ts
- Web/src/app/mcp/route.ts
- Web/src/app/mcp/authorize/page.tsx
- Web/src/app/mcp/authorize/AuthorizeClientActions.tsx
- Web/src/app/mcp/oauth/authorize/route.ts
- Web/src/app/mcp/oauth/register/route.ts
- Web/src/app/mcp/oauth/token/route.ts
- Web/src/middleware.ts
Do NOT modify any other files.

### Task 1.1: Universal Redirect URI Validation in `Web/src/lib/mcp/oauth.ts`
In `Web/src/lib/mcp/oauth.ts`, replace `ALLOWED_REDIRECT_SCHEMES`, `ALLOWED_HTTPS_REDIRECT_HOSTS`, `isAllowedHttpsHost`, and `isAllowedMcpRedirectUri` (lines 6–55) with the following so that all valid HTTPS clients, RFC 8252 loopback clients (`localhost`, `127.0.0.1`, `[::1]`), and safe custom app URI schemes (`cursor:`, `vscode:`, `claude:`, `windsurf:`, `perplexity:`, `chatgpt:`, `raycast:`, `zed:`, etc.) work without failing `invalid_redirect_uri`:

FIND:
const ALLOWED_REDIRECT_SCHEMES = ['cursor:', 'vscode:', 'claude:', 'windsurf:'];

const ALLOWED_HTTPS_REDIRECT_HOSTS = [
    'claude.ai',
    'anthropic.com',
    'google.com',
    'googleusercontent.com',
    'gstatic.com',
    'chatgpt.com',
    'openai.com',
];

function isAllowedHttpsHost(hostname: string): boolean {
    const host = hostname.toLowerCase();
    return ALLOWED_HTTPS_REDIRECT_HOSTS.some(
        (allowed) => host === allowed || host.endsWith(`.${allowed}`)
    );
}

/**
 * Validates OAuth redirect URIs for MCP clients.
 * Allows:
 *  - Local loopback callbacks (RFC 8252 §7.3) over http/https
 *  - Known AI assistant / IDE custom URI schemes
 *  - Known AI provider HTTPS callback domains (Claude, Gemini/Google, ChatGPT/OpenAI)
 */
export function isAllowedMcpRedirectUri(uri: string): boolean {
    try {
        const parsed = new URL(uri);
        if (parsed.username || parsed.password) return false;

        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            const host = parsed.hostname.toLowerCase();
            if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
                return true;
            }
            if (parsed.protocol === 'https:' && isAllowedHttpsHost(host)) {
                return true;
            }
            return false;
        }
        return ALLOWED_REDIRECT_SCHEMES.includes(parsed.protocol.toLowerCase());
    } catch {
        return false;
    }
}

REPLACE WITH:
const BLOCKED_REDIRECT_SCHEMES = new Set([
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'blob:',
    'about:',
    'ws:',
    'wss:',
]);

/**
 * Validates OAuth redirect URIs for MCP clients across all apps.
 * Allows:
 *  - Local loopback callbacks (RFC 8252 §7.3) over http/https (localhost, 127.0.0.1, [::1])
 *  - Any valid HTTPS callback URL (with no embedded credentials)
 *  - Any valid RFC 8252 custom app URI scheme (e.g. cursor:, vscode:, claude:, windsurf:, raycast:, perplexity:, etc.)
 */
export function isAllowedMcpRedirectUri(uri: string): boolean {
    try {
        const parsed = new URL(uri);
        if (parsed.username || parsed.password) return false;
        const protocol = parsed.protocol.toLowerCase();

        if (BLOCKED_REDIRECT_SCHEMES.has(protocol)) {
            return false;
        }

        if (protocol === 'http:') {
            const host = parsed.hostname.toLowerCase();
            return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
        }

        if (protocol === 'https:') {
            return Boolean(parsed.hostname && parsed.hostname.includes('.'));
        }

        return /^[a-z][a-z0-9+.-]*:$/i.test(protocol);
    } catch {
        return false;
    }
}

### Task 1.2: Fix Dynamic Client Registration in `Web/src/app/mcp/oauth/register/route.ts`
In `Web/src/app/mcp/oauth/register/route.ts`:
1. Make `client_name` optional per RFC 7591 (defaulting to `'MCP Client'` if omitted).
2. Add CORS headers (`Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: POST, OPTIONS`, `Access-Control-Allow-Headers: Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version`) and an `OPTIONS` handler.

FIND:
        const { client_name, redirect_uris } = body;

        if (!client_name || typeof client_name !== 'string') {
            return NextResponse.json({ error: 'client_name is required' }, { status: 400 });
        }

REPLACE WITH:
        const { redirect_uris } = body;
        const client_name =
            typeof body.client_name === 'string' && body.client_name.trim().length > 0
                ? body.client_name.trim()
                : 'MCP Client';

### Task 1.3: Fix Reverse Proxy Origin Check & Static Client Reuse in `Web/src/app/mcp/oauth/authorize/route.ts` and `Web/src/app/mcp/authorize/page.tsx`
1. In `Web/src/app/mcp/oauth/authorize/route.ts`:
   - In `resolveOrCreateClient(clientId, redirectUri)`: if `client.redirectUris.includes(redirectUri)` is false, as long as `isAllowedMcpRedirectUri(redirectUri)` is true, append `redirectUri` to `client.redirectUris` in `prisma.mcpOAuthClient.update(...)` instead of rejecting when `isSameProviderOrLoopback` is false.
   - In `POST /mcp/oauth/authorize` origin check (lines 116–133): also add the forwarded origin (`${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('x-forwarded-host') || request.headers.get('host')}`) to `allowedOrigins` so reverse-proxy deployments do not fail with `403 Invalid origin`.
2. In `Web/src/app/mcp/authorize/page.tsx`:
   - Apply the same `resolveOrCreateClient` update (accept any `redirectUri` that passes `isAllowedMcpRedirectUri(redirect_uri)` and append it to `client.redirectUris`).
   - When `!session?.user?.id` (lines 72–82), include `response_type: response_type || 'code'` and any `scope` parameter in `currentParams` before redirecting to `/login?callbackUrl=...`.
3. In `Web/src/app/mcp/authorize/AuthorizeClientActions.tsx`:
   - Store the returned `data.redirect_uri` in state (`const [fallbackUrl, setFallbackUrl] = useState<string | null>(null)`) before calling `window.location.href = data.redirect_uri`, and render a visible fallback `<a href={fallbackUrl} className="block mt-3 text-xs text-accent-cyan underline text-center">Click here if your app did not open automatically</a>` so custom app schemes (`cursor://`, `claude://`, `vscode://`) always have a clickable launch link if the browser blocks automatic custom-scheme navigation.

### Task 1.4: Support `client_secret_basic` & Safe Form Parsing in `Web/src/app/mcp/oauth/token/route.ts`
In `Web/src/app/mcp/oauth/token/route.ts`:
1. Parse `application/x-www-form-urlencoded` using `new URLSearchParams(await request.text())` instead of `await request.formData()`.
2. Check `request.headers.get('authorization')` for `Basic <base64>`: if present, decode `client_id` and `client_secret` from the Basic Auth header when not present in the body.
3. Add `Access-Control-Allow-Origin: *` to all JSON responses and export an `OPTIONS` handler.

### Task 1.5: Add `DELETE /mcp` and MCP CORS Headers in `Web/src/app/mcp/route.ts` & `Web/src/lib/mcp/server.ts` & `Web/src/middleware.ts`
1. In `Web/src/lib/mcp/server.ts`:
   - Update `Access-Control-Allow-Headers` to `'Content-Type, Authorization, Accept, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID'`.
   - Update `Access-Control-Expose-Headers` to `'Mcp-Session-Id, MCP-Protocol-Version, WWW-Authenticate'`.
   - In `handleMcpRequest`, derive the public base URL using `x-forwarded-proto` and `x-forwarded-host` (falling back to `process.env.NEXTAUTH_URL || request.nextUrl.origin`) for the `WWW-Authenticate` `resource_metadata` URL.
2. In `Web/src/app/mcp/route.ts`:
   - Add and export a `DELETE` handler that returns `new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id, MCP-Protocol-Version' } })`.
3. In `Web/src/middleware.ts`:
   - Change `form-action 'self'` to `form-action 'self' https: http:` in the CSP header so OAuth redirects are never blocked by CSP.
```

---

## SUBAGENT 2 PROMPT: Prediction Engine, Effective VO2max & Backend API Routes

```markdown
You are Subagent 2.
STRICT SCOPE: You may ONLY edit the following files:
- Web/src/lib/metrics/runalyze.ts
- Web/src/lib/metrics/coreMetrics.ts
- Web/src/app/api/dashboard/route.ts
- Web/src/app/api/v1/dashboard/route.ts
- Web/src/app/api/analytics/stats/route.ts
- Web/src/app/api/analytics/history/route.ts
- Web/src/app/api/settings/update-vdot/route.ts
- Web/src/app/api/settings/vdot-correction/route.ts
- Web/src/app/api/settings/cycling/route.ts
- Web/src/app/api/external/v1/stats/route.ts
- Web/src/app/api/mobile/v1/analytics/stats/route.ts
- Web/src/app/api/mobile/v1/dashboard/route.ts
Do NOT modify any other files.

### Task 2.1: Fix `calculateEffectiveVO2max`, `calculateMarathonShape`, and `calculateShapePenalty` in `Web/src/lib/metrics/runalyze.ts`
Open `Web/src/lib/metrics/runalyze.ts`:

1. **Fix `calculateEffectiveVO2max` (around lines 80–105)** so Easy/Zone-2 runs at 70% HRmax map to ~62% VO2max (Runalyze exponential HR-to-%VO2max model) instead of 56.5% VO2max:
FIND:
    const percentVO2max = Math.min(
        1.0,
        Math.max(0, 1.45 * hrPercent - 0.45)
    );

REPLACE WITH:
    // Runalyze exponential %HRmax -> %VO2max relation:
    // %VO2max = 0.64 * e^(1.92 * (hrPercent - 1)) blended with Swain above 85% HRmax
    // At 70% HRmax -> ~61.5% VO2max (prevents 10% VO2max inflation on easy Zone 2 runs)
    const expPctVo2 = Math.exp(1.92 * (hrPercent - 1.0)) * 0.64 + 0.26 * hrPercent;
    const swainPctVo2 = 1.45 * hrPercent - 0.45;
    const rawPctVo2 = hrPercent < 0.85 ? (0.65 * expPctVo2 + 0.35 * swainPctVo2) : swainPctVo2;
    const percentVO2max = Math.min(1.0, Math.max(0, rawPctVo2));

2. **Fix `calculateMarathonShape` (around lines 238–260)** so `mileageScore` and `longRunScore` cap at `100%` each (preventing 120% mileage from masking weak long runs), require `>= 15km` for long run points, and use `0.965^daysAgo` decay:
FIND:
    // Mileage score as percentage of target (capped at 120%)
    const mileageScore = Math.min(120, (avgWeeklyKm / targetWeeklyKm) * 100);

    // === LONG RUN COMPONENT (33.3%) ===
    // Score runs over 13km, need 10 points total
    // Points awarded exponentially for distance, decay over time
    const longRuns = last10Weeks.filter(a => a.distance >= 13000);

    let longRunPoints = 0;
    longRuns.forEach(run => {
        const distKm = run.distance / 1000;
        const daysAgo = (nowTime - run.timestamp) / DAY_MS;

        // Points formula: exponential for distance, decay for recency
        // Base: 0.5 points at 13km, ~1.1 at 30km, ~1.8 at 35km
        const basePoints = Math.pow((distKm - 13) / 10, 1.5) * 0.5 + 0.5;

        // Time decay: lose 2% per day
        const decayFactor = Math.pow(0.98, daysAgo);

        longRunPoints += basePoints * decayFactor;
    });

    const targetPoints = 10;
    const longRunScore = Math.min(120, (longRunPoints / targetPoints) * 100);

REPLACE WITH:
    // Mileage score as percentage of target (strictly capped at 100% so mileage cannot mask missing long runs)
    const mileageScore = Math.min(100, (avgWeeklyKm / targetWeeklyKm) * 100);

    // === LONG RUN COMPONENT (33.3%) ===
    // Score runs >= 15km, need 10 points total
    const longRuns = last10Weeks.filter(a => a.distance >= 15000);

    let longRunPoints = 0;
    longRuns.forEach(run => {
        const distKm = run.distance / 1000;
        const daysAgo = (nowTime - run.timestamp) / DAY_MS;

        // Base: ~0.4 points at 15km, ~1.5 at 25km, ~2.6 at 32km
        const basePoints = Math.pow((distKm - 14) / 10, 1.5) * 0.75 + 0.35;

        // Time decay: ~3.5% per day (~20-day half-life)
        const decayFactor = Math.pow(0.965, daysAgo);

        longRunPoints += basePoints * decayFactor;
    });

    const targetPoints = 10;
    const longRunScore = Math.min(100, (longRunPoints / targetPoints) * 100);

3. **Fix `calculateShapePenalty` in `Web/src/lib/metrics/runalyze.ts`** so sub-100% shape applies a realistic near-linear penalty (`Math.pow(deficit, 1.05)` instead of `Math.pow(deficit, 1.3)`):
FIND:
    return Math.pow(deficit, 1.3) * maxPenalty;

REPLACE WITH:
    return Math.pow(deficit, 1.05) * maxPenalty;

### Task 2.2: Wire Shared-Baseline Architecture in `Web/src/lib/metrics/coreMetrics.ts`
Replace the contents of `Web/src/lib/metrics/coreMetrics.ts` with:

```ts
import { AnalyticsService } from '@/lib/services/analytics';
import { bestEffortVdot } from './effectiveVdot';
import type { ActivityForShape } from './runalyze';

export interface CoreMetrics {
    bestEffortVdot: number;
    aerobicVo2max: number;
    rawVo2max: number;
    effectiveVo2maxCorrectionFactor: number;
    vdotCorrectionFactor: number;
}

/**
 * Shared-Baseline Two-Stage Pipeline:
 * 1. calibratedEffectiveVo2max (aerobicVo2max) = rawVo2max * effectiveVo2maxCorrectionFactor
 *    -> Drives Dashboard VO2max and Race Predictions (+ Marathon Shape penalty)
 * 2. trainingVdot (bestEffortVdot) = calibratedEffectiveVo2max * vdotCorrectionFactor
 *    -> Drives Training Paces (falls back to pace-only bestEffortVdot if no HR data exists)
 */
export function computeCoreMetrics(
    runActivities: ActivityForShape[],
    maxHr: number,
    vdotCorrectionFactor: number = 1.0,
    effectiveVo2maxCorrectionFactor: number = 1.0,
): CoreMetrics {
    const effFactor = effectiveVo2maxCorrectionFactor > 0 ? effectiveVo2maxCorrectionFactor : 1.0;
    const paceFactor = vdotCorrectionFactor > 0 ? vdotCorrectionFactor : 1.0;

    const { rawVO2max, effectiveVO2max } = AnalyticsService.calculateVO2max(
        runActivities,
        maxHr,
        effFactor
    );

    const fallbackPaceVdot = bestEffortVdot(runActivities, 1.0);
    const baselineFitness = effectiveVO2max > 0 ? effectiveVO2max : fallbackPaceVdot;
    const trainingVdot = baselineFitness > 0
        ? parseFloat((baselineFitness * paceFactor).toFixed(1))
        : 0;

    return {
        bestEffortVdot: trainingVdot,
        aerobicVo2max: effectiveVO2max,
        rawVo2max: rawVO2max,
        effectiveVo2maxCorrectionFactor: effFactor,
        vdotCorrectionFactor: paceFactor,
    };
}
```

### Task 2.3: Change All 8 `includeCrossTraining ?? true` Defaults to `?? false` & Pass `effectiveVo2maxCorrectionFactor`
In all 8 files below, change `includeCrossTraining ?? true` to `includeCrossTraining ?? false`, and wherever `computeCoreMetrics` or `AnalyticsService.calculateVO2max` is called, pass `user?.effectiveVo2maxCorrectionFactor ?? 1.0` and return `effectiveVo2maxCorrectionFactor` in the JSON response:
1. `Web/src/app/api/dashboard/route.ts` (line 220: `userData?.includeCrossTraining ?? false`)
2. `Web/src/app/api/v1/dashboard/route.ts` (line 141: `userData?.includeCrossTraining ?? false`)
3. `Web/src/app/api/analytics/stats/route.ts` (line 45: `user?.includeCrossTraining ?? false`, select `effectiveVo2maxCorrectionFactor` & `matchToMyWhoosh`, pass `user?.effectiveVo2maxCorrectionFactor ?? 1.0` to `computeCoreMetrics`, return `effectiveVo2maxCorrectionFactor` in response)
4. `Web/src/app/api/analytics/history/route.ts` (line 35: `user?.includeCrossTraining ?? false`, use `user?.effectiveVo2maxCorrectionFactor ?? 1.0` for `calculateVO2max`)
5. `Web/src/app/api/settings/update-vdot/route.ts` (line 94: `user?.includeCrossTraining ?? false`; also accept and save `effectiveVo2maxCorrectionFactor` and `matchToMyWhoosh` in POST and return them in GET)
6. `Web/src/app/api/external/v1/stats/route.ts` (line 84: `user.includeCrossTraining ?? false`)
7. `Web/src/app/api/mobile/v1/analytics/stats/route.ts` (line 72: `user?.includeCrossTraining ?? false`, select `effectiveVo2maxCorrectionFactor` & `matchToMyWhoosh`, pass `user?.effectiveVo2maxCorrectionFactor ?? 1.0` to `computeCoreMetrics`, return `effectiveVo2maxCorrectionFactor` in response)
8. `Web/src/app/api/mobile/v1/dashboard/route.ts` (line 136: `userData?.includeCrossTraining ?? false`)

### Task 2.4: Fix Race Calibration Denominator & Add `effectiveVo2maxCorrectionFactor` in `Web/src/app/api/settings/vdot-correction/route.ts`
In `Web/src/app/api/settings/vdot-correction/route.ts`:
- In `GET`: select and return both `vdotCorrectionFactor` and `effectiveVo2maxCorrectionFactor` from `prisma.user`.
- In `POST`:
  - Accept `{ raceActivityId, raceType, raceTime, raceDate, manualFactor, manualEffectiveVo2maxFactor, resetToDefault }`.
  - If `resetToDefault === true`, set `effectiveVo2maxCorrectionFactor: 1.0, vdotCorrectionFactor: 1.0`.
  - If `manualEffectiveVo2maxFactor !== undefined`, clamp to `[0.75, 1.25]` and save `effectiveVo2maxCorrectionFactor`.
  - If `manualFactor !== undefined`, clamp to `[0.75, 1.25]` and save `vdotCorrectionFactor` (Training Pace Intensity Adjustment).
  - When calibrating from a race (`raceActivityId` or `raceType` + `raceTime`):
    - Calculate `impliedVdot = calculateVdot({ distance: raceDist, timeSeconds })`.
    - Filter `activities` to the **30-day window ending on `raceDateVal`** (or all recent runs if fewer than 3 runs exist in that window).
    - Compute `const { rawVO2max } = AnalyticsService.calculateVO2max(windowActivities, user?.hrMax || 190, 1.0);`
    - Compute `newEffectiveFactor = rawVO2max > 0 ? impliedVdot / rawVO2max : 1.0` (clamped to `[0.75, 1.25]`, with `outOfTypicalRange: newEffectiveFactor < 0.85 || newEffectiveFactor > 1.15`).
    - Save `effectiveVo2maxCorrectionFactor: Math.round(newEffectiveFactor * 100) / 100` on `prisma.user.update`.

### Task 2.5: Persist `matchToMyWhoosh` in `Web/src/app/api/settings/cycling/route.ts`
In `Web/src/app/api/settings/cycling/route.ts`:
- In `GET`: include `matchToMyWhoosh: true` in `prisma.user.findUnique` select and return `matchToMyWhoosh: user.matchToMyWhoosh ?? false`.
- In `POST`: accept optional `matchToMyWhoosh?: boolean` in request body and persist it in `prisma.user.update`.
```

---

## SUBAGENT 3 PROMPT: MyWhoosh Matcher, Custom `.zwo` Exporter & Plan Generators

```markdown
You are Subagent 3.
STRICT SCOPE: You may ONLY create or edit the following files:
- Web/src/lib/plans/mywhooshMatcher.ts (CREATE NEW)
- Web/src/lib/plans/zwoExporter.ts (CREATE NEW)
- Web/src/lib/plans/index.ts
- Web/src/lib/plans/generators/triathlon.ts
Do NOT modify any other files.

### Task 3.1: Create `Web/src/lib/plans/mywhooshMatcher.ts`
Create `Web/src/lib/plans/mywhooshMatcher.ts` with the following complete implementation that matches any cycling workout (`RIDE`, `LONG_RIDE`, `BRICK`) to the closest official workout in `Web/src/data/mywhoosh_workouts.json`:

```ts
import mywhooshCatalog from '@/data/mywhoosh_workouts.json';

export interface MyWhooshStep {
    type: 'warmup' | 'steadystate' | 'interval' | 'cooldown' | 'freeride' | string;
    durationSeconds: number;
    powerLowPct: number;
    powerHighPct: number;
    cadenceRpm?: number;
}

export interface MyWhooshWorkout {
    id: string;
    name: string;
    category: string;
    durationSeconds: number;
    tss: number;
    intensityFactor: number;
    zoneSeconds: Record<string, number>;
    stepsSummary: string;
    steps: MyWhooshStep[];
    mywhooshWebLibraryUrl: string;
    externalDetailUrl: string;
}

const catalog: MyWhooshWorkout[] = mywhooshCatalog as MyWhooshWorkout[];

export function inferTargetCategory(workoutType: string, description: string = '', phase: string = ''): string[] {
    const desc = description.toLowerCase();
    if (phase === 'TAPER' || phase === 'RACE_WEEK' || desc.includes('taper')) {
        return ['Taper', 'Recovery', 'Endurance'];
    }
    if (workoutType === 'LONG_RIDE' || desc.includes('long ride') || desc.includes('zone 2') || desc.includes('endurance')) {
        return ['Endurance', 'Tempo'];
    }
    if (desc.includes('recovery') || desc.includes('easy')) {
        return ['Recovery', 'Endurance'];
    }
    if (desc.includes('vo2') || desc.includes('interval') || desc.includes('105%') || desc.includes('110%')) {
        return ['VO2max', 'Threshold', 'Anaerobic'];
    }
    if (desc.includes('sweet spot') || desc.includes('88%') || desc.includes('90%')) {
        return ['Sweet Spot', 'Threshold', 'Tempo'];
    }
    if (desc.includes('threshold') || desc.includes('ftp') || desc.includes('95%') || desc.includes('100%')) {
        return ['Threshold', 'Sweet Spot', 'VO2max'];
    }
    if (desc.includes('tempo')) {
        return ['Tempo', 'Sweet Spot', 'Endurance'];
    }
    return ['Endurance', 'Sweet Spot', 'Tempo'];
}

export function findClosestMyWhooshWorkout(params: {
    workoutType: string;
    targetDurationSeconds: number;
    description?: string;
    phase?: string;
}): MyWhooshWorkout | null {
    if (!catalog.length) return null;
    const preferredCategories = inferTargetCategory(
        params.workoutType,
        params.description || '',
        params.phase || ''
    );
    const targetDur = params.targetDurationSeconds > 0 ? params.targetDurationSeconds : 3600;

    let bestMatch: MyWhooshWorkout = catalog[0];
    let bestScore = Number.POSITIVE_INFINITY;

    for (const candidate of catalog) {
        const catRank = preferredCategories.indexOf(candidate.category);
        const categoryPenalty = catRank === 0 ? 0 : catRank === 1 ? 600 : catRank === 2 ? 1200 : 2400;
        const durationDelta = Math.abs(candidate.durationSeconds - targetDur);
        const totalScore = durationDelta + categoryPenalty;

        if (totalScore < bestScore) {
            bestScore = totalScore;
            bestMatch = candidate;
        }
    }

    return bestMatch;
}
```

### Task 3.2: Create `Web/src/lib/plans/zwoExporter.ts`
Create `Web/src/lib/plans/zwoExporter.ts` to generate downloadable `.zwo` XML files for importing custom cycling workouts directly into MyWhoosh:

```ts
import { MyWhooshWorkout, findClosestMyWhooshWorkout } from './mywhooshMatcher';

function escapeXml(unsafe: string): string {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export function generateMyWhooshZwoXml(params: {
    name: string;
    description: string;
    workoutType: string;
    targetDurationSeconds: number;
    phase?: string;
    matchedWorkout?: MyWhooshWorkout | null;
}): string {
    const match = params.matchedWorkout ?? findClosestMyWhooshWorkout({
        workoutType: params.workoutType,
        targetDurationSeconds: params.targetDurationSeconds,
        description: params.description,
        phase: params.phase,
    });

    const totalSec = params.targetDurationSeconds > 0 ? params.targetDurationSeconds : (match?.durationSeconds || 3600);
    const scale = match && match.durationSeconds > 0 ? totalSec / match.durationSeconds : 1.0;

    const stepLines: string[] = [];
    if (match && match.steps && match.steps.length > 0) {
        for (const step of match.steps) {
            const dur = Math.max(30, Math.round((step.durationSeconds * scale) / 15) * 15);
            const cadAttr = step.cadenceRpm ? ` Cadence="${step.cadenceRpm}"` : '';
            if (step.type === 'warmup') {
                stepLines.push(`        <Warmup Duration="${dur}" PowerLow="${step.powerLowPct.toFixed(2)}" PowerHigh="${step.powerHighPct.toFixed(2)}"${cadAttr}/>`);
            } else if (step.type === 'cooldown') {
                stepLines.push(`        <Cooldown Duration="${dur}" PowerLow="${step.powerHighPct.toFixed(2)}" PowerHigh="${step.powerLowPct.toFixed(2)}"${cadAttr}/>`);
            } else if (Math.abs(step.powerHighPct - step.powerLowPct) > 0.03) {
                stepLines.push(`        <Ramp Duration="${dur}" PowerLow="${step.powerLowPct.toFixed(2)}" PowerHigh="${step.powerHighPct.toFixed(2)}"${cadAttr}/>`);
            } else {
                stepLines.push(`        <SteadyState Duration="${dur}" Power="${step.powerLowPct.toFixed(2)}"${cadAttr}/>`);
            }
        }
    } else {
        const warmup = Math.min(600, Math.round(totalSec * 0.15));
        const cooldown = Math.min(600, Math.round(totalSec * 0.15));
        const main = Math.max(600, totalSec - warmup - cooldown);
        stepLines.push(`        <Warmup Duration="${warmup}" PowerLow="0.50" PowerHigh="0.68" Cadence="85"/>`);
        stepLines.push(`        <SteadyState Duration="${main}" Power="0.70" Cadence="90"/>`);
        stepLines.push(`        <Cooldown Duration="${cooldown}" PowerLow="0.65" PowerHigh="0.50" Cadence="85"/>`);
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<workout_file>
    <author>RunFlow</author>
    <name>${escapeXml(params.name)}</name>
    <description>${escapeXml(params.description)}</description>
    <sportType>bike</sportType>
    <tags>
        <tag name="RunFlow"/>
        <tag name="MyWhoosh"/>
    </tags>
    <workout>
${stepLines.join('\n')}
    </workout>
</workout_file>`;
}
```

### Task 3.3: Wire `matchToMyWhoosh` into `Web/src/lib/plans/index.ts` and `Web/src/lib/plans/generators/triathlon.ts`
1. In `Web/src/lib/plans/index.ts`:
   - Add `matchToMyWhoosh?: boolean;` to `PlanConfig`.
2. In `Web/src/lib/plans/generators/triathlon.ts`:
   - Import `findClosestMyWhooshWorkout` from `../mywhooshMatcher`.
   - At the end of `generateTriathlonPlan(config: PlanConfig)` (right before `return result;`), if `config.matchToMyWhoosh` is `true`, iterate over `result` and for any workout with `w.type === WorkoutType.RIDE || w.type === WorkoutType.LONG_RIDE`, call `findClosestMyWhooshWorkout({ workoutType: w.type, targetDurationSeconds: w.targetDuration || 3600, description: w.description, phase: w.phase })`. If matched, append ` | MyWhoosh: ${match.name} (${Math.round(match.durationSeconds / 60)}m · TSS ${match.tss} · ${match.stepsSummary})` to `w.description`.
```

---

## SUBAGENT 4 PROMPT: Web UI — Editor Back Button, Dashboard Goal/Now & Conditional Analytics Tabs

```markdown
You are Subagent 4.
STRICT SCOPE: You may ONLY edit the following files:
- Web/src/components/PlanEditor/Toolbar.tsx
- Web/src/app/plan-advanced/[goalId]/page.tsx
- Web/src/components/RaceCountdown.tsx
- Web/src/app/analytics/page.tsx
Do NOT modify any other files.

### Task 4.1: Fix Back Button in Advanced Editor (`Web/src/components/PlanEditor/Toolbar.tsx` & `Web/src/app/plan-advanced/[goalId]/page.tsx`)
1. In `Web/src/components/PlanEditor/Toolbar.tsx` (lines 74–81):
FIND:
                <button
                    type="button"
                    onClick={() => router.push('/plan-advanced')}
                    className="p-1.5 rounded-md text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors"
                    title="Back to Plans"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>

REPLACE WITH:
                <button
                    type="button"
                    onClick={() => router.push('/')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors"
                    title="Back to Dashboard"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Dashboard</span>
                </button>

2. In `Web/src/app/plan-advanced/[goalId]/page.tsx` (around line 78):
FIND:
                        onClick={() => router.push('/plan-advanced')}
                        className="px-4 py-2 rounded-lg bg-accent-orange text-white text-sm font-medium"
                    >
                        Back to Plans

REPLACE WITH:
                        onClick={() => router.push('/')}
                        className="px-4 py-2 rounded-lg bg-accent-orange text-white text-sm font-medium"
                    >
                        Back to Dashboard

### Task 4.2: Remove `Projected Finish · VDOT` Below Plan on Home Dashboard (`Web/src/components/RaceCountdown.tsx`)
In `Web/src/components/RaceCountdown.tsx` (around lines 255–298), change the 3-column grid below the progress bar to a clean 2-column grid showing ONLY `Goal` and `Now`:

FIND:
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {goal.targetTime && (
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-workout-long-run/15 flex items-center justify-center shrink-0">
                            <Target className="w-5 h-5 text-workout-long-run" />
                        </div>
                        <div>
                            <p className="text-xs text-foreground-muted">Goal</p>
                            <p className="text-xl font-mono tabular-nums font-semibold text-foreground">{formatTime(goal.targetTime)}</p>
                        </div>
                    </div>
                )}

                {nowPredictedTime > 0 && (
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-accent-cyan/15 flex items-center justify-center shrink-0">
                            <Activity className="w-5 h-5 text-accent-cyan" />
                        </div>
                        <div>
                            <p className="text-xs text-foreground-muted flex items-center gap-1">
                                Now &middot; Aerobic Fitness
                                <span className="cursor-help" title="What your current HR-based aerobic fitness (VO2max) and marathon shape predict for this distance today &#8212; a fitness trend indicator, not your training target">&#8505;</span>
                            </p>
                            <p className="text-xl font-mono tabular-nums font-semibold text-foreground">{formatTime(nowPredictedTime)}</p>
                        </div>
                    </div>
                )}

                {dynamicPredictedTime > 0 && (
                    <div className={`flex items-center gap-3 ${nowPredictedTime > 0 ? 'col-span-2 md:col-span-1' : ''}`}>
                        <div className="w-10 h-10 rounded-md bg-accent-orange/15 flex items-center justify-center shrink-0">
                            <Timer className="w-5 h-5 text-accent-orange" />
                        </div>
                        <div>
                            <p className="text-xs text-foreground-muted flex items-center gap-1">
                                Projected Finish &middot; VDOT
                                <span className="cursor-help" title="Estimated finish time on race day based on your training plan and expected fitness improvement, derived from your VDOT">&#8505;</span>
                                {correctionFactor !== 1.0 && <span className="ml-1 text-[10px] text-accent-cyan" title="Using calibrated VDOT">&#9679;</span>}
                            </p>
                            <p className="text-xl font-mono tabular-nums font-semibold text-foreground">{formatTime(dynamicPredictedTime)}</p>
                            <p className="text-[10px] text-foreground-muted">Target VDOT {projection.projectedVdot.toFixed(1)}</p>
                        </div>
                    </div>
                )}
            </div>

REPLACE WITH:
            <div className="grid grid-cols-2 gap-4 mb-6">
                {goal.targetTime && (
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-workout-long-run/15 flex items-center justify-center shrink-0">
                            <Target className="w-5 h-5 text-workout-long-run" />
                        </div>
                        <div>
                            <p className="text-xs text-foreground-muted">Goal</p>
                            <p className="text-xl font-mono tabular-nums font-semibold text-foreground">{formatTime(goal.targetTime)}</p>
                        </div>
                    </div>
                )}

                {nowPredictedTime > 0 && (
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-accent-cyan/15 flex items-center justify-center shrink-0">
                            <Activity className="w-5 h-5 text-accent-cyan" />
                        </div>
                        <div>
                            <p className="text-xs text-foreground-muted flex items-center gap-1">
                                Now
                                <span className="cursor-help" title="Current predicted finish time based on your calibrated Effective VO2max and Marathon Shape">&#8505;</span>
                            </p>
                            <p className="text-xl font-mono tabular-nums font-semibold text-foreground">{formatTime(nowPredictedTime)}</p>
                        </div>
                    </div>
                )}
            </div>

### Task 4.3: Conditional `Running` and `Cycling` Sport Tabs in `Web/src/app/analytics/page.tsx`
In `Web/src/app/analytics/page.tsx` (around lines 330–365):
- Always render the `Combined` button first (`selectedSport === 'COMBINED'` is already the default).
- Wrap the `Running` tab button in `{combinedSportStats.runCount > 0 && ( ... )}`.
- Wrap the `Cycling` tab button in `{combinedSportStats.bikeCount > 0 && ( ... )}`.
- Also use `statsData?.effectiveVo2maxCorrectionFactor || 1.0` when computing daily VO2max trend values in `useMemo`.
```

---

## SUBAGENT 5 PROMPT: Web UI — Settings, Calibration Modal, Plan Setup Wizards & MyWhoosh Custom Export

```markdown
You are Subagent 5.
STRICT SCOPE: You may ONLY edit the following files:
- Web/src/components/MinimalistPillsMenu.tsx
- Web/src/components/ProfileModal.tsx
- Web/src/components/ShapeCalibrationModal.tsx
- Web/src/components/PlanSetupForm.tsx
- Web/src/components/OnboardingModal.tsx
- Web/src/components/EditPlanModal.tsx
- Web/src/components/WorkoutScheduleCard.tsx
Do NOT modify any other files.

### Task 5.1: Change `includeCrossTraining` Initial State Default to `false` & Add MyWhoosh + Effective VO2max Factor in Settings (`MinimalistPillsMenu.tsx` & `ProfileModal.tsx`)
1. In `Web/src/components/ProfileModal.tsx` (line 37):
   - Change `const [includeCrossTraining, setIncludeCrossTraining] = useState(true);` to `const [includeCrossTraining, setIncludeCrossTraining] = useState(false);`
   - Change fallback `user.includeCrossTraining ?? true` to `user.includeCrossTraining ?? false`.
2. In `Web/src/components/MinimalistPillsMenu.tsx` (line 702):
   - Change `const [includeCrossTraining, setIncludeCrossTraining] = useState(true);` to `const [includeCrossTraining, setIncludeCrossTraining] = useState(false);`
   - Change fallback `data?.includeCrossTraining ?? true` to `data?.includeCrossTraining ?? false`.
   - Add state `const [matchToMyWhoosh, setMatchToMyWhoosh] = useState(false);` and `const [effectiveVo2maxCorrectionFactor, setEffectiveVo2maxCorrectionFactor] = useState(1.0);` initialized from `/api/settings/cycling` and `/api/settings/update-vdot`.
   - In the Cycling Settings section of `MinimalistPillsMenu.tsx`, add a toggle switch for **"Match Cycling Workouts to MyWhoosh"** (`matchToMyWhoosh`, default `false`) that saves to `POST /api/settings/cycling`.
   - In the Running / VO2max Settings section of `MinimalistPillsMenu.tsx`, add a slider/number input (`0.85` to `1.15`, step `0.01`, with a `"Reset to 1.00x"` button) for **"Effective VO2max Correction Factor (Race Predictions)"** (`effectiveVo2maxCorrectionFactor`) alongside **"Training Pace Adjustment"** (`vdotCorrectionFactor`), saving to `POST /api/settings/vdot-correction`.

### Task 5.2: Update `Web/src/components/ShapeCalibrationModal.tsx` for Two-Stage Effective VO2max Calibration
In `Web/src/components/ShapeCalibrationModal.tsx`:
- Add support for calibrating `effectiveVo2maxCorrectionFactor` (`0.85x` to `1.15x` slider + auto-calibrate from a 5K–Half Marathon race using `impliedVdot / rawVO2max` + `"Reset to 1.00x"` button).
- Show a warning banner if the race-derived factor is `< 0.85` or `> 1.15` (noting this usually indicates an inaccurate Max HR, sub-maximal effort, heat, or hills).
- Send `manualEffectiveVo2maxFactor` (or `raceActivityId` / `raceType` + `raceTime`) to `POST /api/settings/vdot-correction`.

### Task 5.3: Add "Match Cycling Workouts to MyWhoosh" Toggle (Default Off) in All Plan Generators (`PlanSetupForm.tsx`, `OnboardingModal.tsx`, `EditPlanModal.tsx`)
In `Web/src/components/PlanSetupForm.tsx`, `Web/src/components/OnboardingModal.tsx`, and `Web/src/components/EditPlanModal.tsx`:
- Add state `const [matchToMyWhoosh, setMatchToMyWhoosh] = useState(false);` (initialized from user settings if true, otherwise `false`).
- Whenever cycling or cross-training rides are visible in the form, render a toggle:
  - Label: `"Match Cycling Workouts to MyWhoosh"`
  - Description: `"Match planned rides to the closest official MyWhoosh workout and enable custom .zwo workout import"`
- Include `matchToMyWhoosh` in the payload sent to `/api/goals` or `/api/settings/cycling`.

### Task 5.4: Show Closest MyWhoosh Match + "Download Custom MyWhoosh (.zwo)" Button in `Web/src/components/WorkoutScheduleCard.tsx`
In `Web/src/components/WorkoutScheduleCard.tsx`:
- Import `findClosestMyWhooshWorkout` from `@/lib/plans/mywhooshMatcher` and `generateMyWhooshZwoXml` from `@/lib/plans/zwoExporter`.
- For cycling workouts (`workout.workoutType === 'RIDE' || workout.workoutType === 'LONG_RIDE' || workout.workoutType === 'BRICK'`), when `matchToMyWhoosh` is enabled (or in the workout detail view):
  1. Compute `const mwMatch = findClosestMyWhooshWorkout({ workoutType: workout.workoutType, targetDurationSeconds: workout.targetDuration || 3600, description: workout.description });`
  2. Display a compact MyWhoosh badge:
     `Closest MyWhoosh: {mwMatch.name} ({Math.round(mwMatch.durationSeconds / 60)}m · TSS {mwMatch.tss}) — {mwMatch.stepsSummary}` with a link to `mwMatch.mywhooshWebLibraryUrl`.
  3. Render a **"Export Custom MyWhoosh (.zwo)"** button that calls `generateMyWhooshZwoXml(...)`, creates a `Blob([xml], { type: 'application/octet-stream' })`, and triggers a browser download named `RunFlow_${workout.workoutType}_${mwMatch?.id || 'custom'}.zwo`.
```

---

## SUBAGENT 6 PROMPT: Android App — 3 Conditional Headers, Combined Health Data, Dashboard, Prediction Math & Settings

```markdown
You are Subagent 6.
STRICT SCOPE: You may ONLY edit the following Android files:
- android/app/src/main/java/com/runflow2/app/ui/screens/AnalyticsScreen.kt
- android/app/src/main/java/com/runflow2/app/ui/screens/DashboardScreen.kt
- android/app/src/main/java/com/runflow2/app/ui/screens/SettingsScreen.kt
- android/app/src/main/java/com/runflow2/app/ui/screens/PlanWizardScreen.kt
- android/app/src/main/java/com/runflow2/app/domain/MarathonShape.kt
- android/app/src/main/java/com/runflow2/app/domain/AnalyticsEngine.kt
- android/app/src/main/java/com/runflow2/app/domain/VdotMath.kt
- android/app/src/main/java/com/runflow2/app/data/repo/RunFlowRepository.kt
- android/app/src/main/java/com/runflow2/app/data/repo/SettingsRepository.kt
Do NOT modify any other files.

### Task 6.1: Update `AnalyticsScreen.kt` to 3 Conditional Top Headers (`Combined`, `Running`, `Cycling`) & Move Health Data to `Combined`
Open `android/app/src/main/java/com/runflow2/app/ui/screens/AnalyticsScreen.kt`:
1. Change `AnalyticsSportTab` enum (line 36) to:
   ```kotlin
   private enum class AnalyticsSportTab { COMBINED, RUNNING, CYCLING }
   ```
2. Change the default `selectedTab` state (around line 84) to `AnalyticsSportTab.COMBINED`:
   ```kotlin
   var selectedTab by rememberSaveable { mutableStateOf(AnalyticsSportTab.COMBINED) }
   ```
3. Determine sport activity presence:
   ```kotlin
   val hasRunActivities = (a.runsInRange > 0) || (a.weeklyKm.any { it.km > 0.0 })
   val hasCyclingActivities = ((cyclingDto?.summary?.rideCount ?: 0) > 0) || (a.activitiesInRange > a.runsInRange)
   ```
4. In `LaunchedEffect(targetSection, analytics)` (lines 114–119):
   ```kotlin
   LaunchedEffect(targetSection, analytics) {
       when (targetSection) {
           "form" -> {
               selectedTab = AnalyticsSportTab.COMBINED
               listState.scrollToItem(0)
           }
           "recovery" -> {
               selectedTab = AnalyticsSportTab.COMBINED
               listState.scrollToKeyedItem("sec-recovery")
           }
           "volume" -> {
               if (hasRunActivities) selectedTab = AnalyticsSportTab.RUNNING
               listState.scrollToKeyedItem("sec-volume")
           }
       }
   }
   ```
5. In `item(key = "tab-selector")`, render:
   - **Chip 1 (Always visible)**: `Combined` (`AnalyticsSportTab.COMBINED`)
   - **Chip 2 (Only if `hasRunActivities`)**: `Running` (`AnalyticsSportTab.RUNNING`)
   - **Chip 3 (Only if `hasCyclingActivities`)**: `Cycling` (`AnalyticsSportTab.CYCLING`)
6. Move the **Combined Load / Form (`CTL`, `ATL`, `TSB`, `ACWR`)**, **`Recovery · RHR & HRV` (`key = "sec-recovery"`)**, and **`Sleep`** cards out of `if (selectedTab == AnalyticsSportTab.RUNNING)` and into `if (selectedTab == AnalyticsSportTab.COMBINED)`.
7. Keep `Running` focused on running KPIs (`Effective VO2max`, `Training VDOT`, `Running Distance` chart `sec-volume`, `Marathon Shape`, `Race Predictions`, `Training Paces`, `Heart Rate Zones`).
8. In `Race Predictions` inside `AnalyticsScreen.kt` (around lines 422–445), use `val predVo2 = a.aerobicVo2max ?: a.effectiveVdot` and apply the Marathon Shape penalty (`VdotMath.predictTimeWithShapeSec(predVo2, distM, a.marathonShape.shape)`) instead of raw `VdotMath.predictTimeSec(a.effectiveVdot, distM)`.

### Task 6.2: Clean Up `DashboardScreen.kt` (Remove VDOT Below `"THIS WEEK"` Grid & Show `Goal` + `Now` on Race Card)
Open `android/app/src/main/java/com/runflow2/app/ui/screens/DashboardScreen.kt`:
1. Remove the full-width `StatTile(label = "VDOT (Training Paces)", ...)` block at lines 298–310 below the `"THIS WEEK"` card row.
2. In the Race Countdown card (lines 448–515):
   - Compute `nowPredicted` using `val vo2 = a?.aerobicVo2max ?: a?.effectiveVdot` and `VdotMath.predictTimeWithShapeSec(vo2, km * 1000.0, a?.marathonShape?.shape ?: 0)`.
   - Replace the `"Target"` / `"Projected"` labels with **`"Goal"`** and **`"Now"`**.

### Task 6.3: Fix `MarathonShape.kt`, `VdotMath.kt`, `AnalyticsEngine.kt`, and `RunFlowRepository.kt`
1. In `android/app/src/main/java/com/runflow2/app/domain/MarathonShape.kt`:
   - Cap `mileageScore` at `100.0` (`min(100.0, (avgWeeklyKm / targetWeeklyKm) * 100.0)`) and `longRunScore` at `100.0` (`min(100.0, (longRunPoints / TARGET_POINTS) * 100.0)`).
   - Change `LONG_RUN_THRESHOLD_KM` from `13.0` to `15.0` and decay from `0.98` to `0.965`.
2. In `android/app/src/main/java/com/runflow2/app/domain/VdotMath.kt`:
   - Add helper `fun predictTimeWithShapeSec(effectiveVo2max: Double, distanceMeters: Double, shapePercent: Int, calibrationFactor: Double = 1.0): Double?` that applies the distance-specific shape penalty (`maxPenalty = 0.30` for 42.195km, `0.15` for 21.0975km, `0.08` for 10km, `0.04` for 5km; `deficit = ((100 - shapePercent).coerceAtLeast(0)) / 100.0`; `penalty = deficit.pow(1.05) * maxPenalty * calibrationFactor`; returns `predictTimeSec(effectiveVo2max, distanceMeters) * (1.0 + penalty)`).
3. In `android/app/src/main/java/com/runflow2/app/data/repo/SettingsRepository.kt`:
   - Add `includeCrossTraining: Boolean = false`, `matchToMyWhoosh: Boolean = false`, and `effectiveVo2maxCorrection: Double = 1.0` to `AppSettings` (defaulting `includeCrossTraining` and `matchToMyWhoosh` to `false`).
4. In `android/app/src/main/java/com/runflow2/app/domain/AnalyticsEngine.kt` & `RunFlowRepository.kt`:
   - Pass `includeCrossTraining = s?.includeCrossTraining ?: false` into `AnalyticsEngine.compute(...)`. When `includeCrossTraining` is `false`, pass `emptyList()` for `crossTrainingActivities` into `MarathonShape.calculate(...)`.
   - Compute HR-based `aerobicVo2max` on device in `AnalyticsEngine.compute(...)` multiplied by `effectiveVo2maxCorrection`, and in `RunFlowRepository.applyServerMetrics` keep `aerobicVo2max` as the primary race-prediction VO2max and `effectiveVdot` (`calibratedEffectiveVo2max * vdotCorrection`) for training paces.

### Task 6.4: Add Settings & Plan Wizard Controls in `SettingsScreen.kt` & `PlanWizardScreen.kt`
1. In `android/app/src/main/java/com/runflow2/app/ui/screens/SettingsScreen.kt`:
   - Inside the Cycling Power (FTP) card, add a `Switch` for **"Match to MyWhoosh"** (default `false`), plus a helper caption `"Match cycling workouts to closest MyWhoosh workout & enable custom .zwo export"`.
   - Inside the Running / Fitness section, add a `Switch` for **"Include Cross-Training in Marathon Shape"** (default `false`) and a slider/input for **"Effective VO2max Correction Factor"** (`0.85x–1.15x`, default `1.00x`).
2. In `android/app/src/main/java/com/runflow2/app/ui/screens/PlanWizardScreen.kt`:
   - Add a **"Match Cycling Workouts to MyWhoosh"** toggle (default `false`) in the plan generator wizard.
```

---

## PHASE 7: Orchestrator Final Verification

After Subagents 1–6 complete their edits, run the following verification checks from the repository root:

```bash
# 1. Verify TypeScript compilation in Web/
cd Web && npx tsc --noEmit

# 2. Verify no remaining `includeCrossTraining ?? true` fallbacks exist
grep -rn "includeCrossTraining ?? true" Web/src/

# 3. Verify Android debug build (if Android SDK is available in environment)
cd ../android && ./gradlew compileDebugKotlin
```
