# Web: Health Button Removal, Platform-Specific Plan/Calendar, Sync Cache Fix + Auto-Sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the paused Health button from the analytics page, show Plan on mobile and Calendar on desktop (one per platform), and make new Strava activities appear immediately after a sync (cache busting) plus auto-sync when the dashboard opens with stale data.

**Architecture:** All changes are in the Next.js web app (`Web/`). Navigation is split between a mobile swipe layout (`MobileSwipeLayout` tabs) and desktop route pages; device detection is `useDeviceType()` (viewport < 768px = mobile). The dashboard API (`/api/dashboard`) caches its response in Redis for 60s keyed per user+date; Strava sync currently never invalidates that cache, which is why new activities only appear after a full reload. We add a per-user cache version counter that the sync status writer bumps, include it in the cache key, and add a client-side auto-sync hook for the "open page → sync if stale" requirement.

**Tech Stack:** Next.js 15 (App Router, `'use client'` pages), TanStack Query v5, ioredis (optional at runtime), Prisma, Jest (jsdom default, `@jest-environment node` where needed).

## Global Constraints

- Working directory for all commands: `Web/` (e.g. `cd /home/thies/Projects/RunFlow/Web && npm test`).
- Do NOT touch the Flutter app (`flutter/`); therefore the AGENTS.md pre-push rule (`flutter analyze` / `flutter test`) does not apply to this change set.
- The working tree has pre-existing user changes (`Web/package-lock.json` modified, several untracked files). Never `git add -A`; stage only files listed in this plan.
- Commit style: conventional commits scoped `web` (e.g. `fix(web): ...`, `feat(web): ...`) — matches recent history.
- Redis is optional at runtime (`getRedisClient()` returns `null` when `REDIS_URL` is unset or Redis is down). All Redis calls must stay null-safe / best-effort.
- Health feature is *paused*, not deleted: remove only the button on the analytics page. Keep `/health` routes, `HealthView`, and the already-hidden mobile nav comment intact.
- Threshold constant for auto-sync: 15 minutes since `lastSyncAt`.
- Never auto-sync for users who never synced before (`lastSyncAt == null` → Strava likely not connected).

---

## Task 1: Remove Health button from the desktop analytics page

**Files:**
- Modify: `Web/src/app/analytics/page.tsx` (lines ~341–346 button block, line 7 import)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new (pure removal).

Context: health development is paused. The mobile analytics view already has no Health button; only the desktop page header does. The button is gated on `userData?.healthTrackingEnabled`.

- [ ] **Step 1: Remove the button block**

In `Web/src/app/analytics/page.tsx`, delete this block (lines 341–346):

```tsx
{userData?.healthTrackingEnabled && (
    <button onClick={() => router.push('/health')} className="ml-4 btn-secondary text-foreground flex items-center gap-2 py-2 px-3 sm:px-4">
        <Heart className="w-5 h-5" />
        <span className="hidden sm:inline">Health</span>
    </button>
)}
```

- [ ] **Step 2: Remove the now-unused `Heart` import**

Line 7 currently:

```tsx
import { ArrowLeft, RefreshCw, Heart } from 'lucide-react';
```

Change to:

```tsx
import { ArrowLeft, RefreshCw } from 'lucide-react';
```

(`Heart` is only used by the removed button in this file; `userData` query stays — it is used elsewhere in the page.)

- [ ] **Step 3: Verify**

Run: `cd /home/thies/Projects/RunFlow/Web && grep -n "Heart\|/health" src/app/analytics/page.tsx`
Expected: no matches (or only unrelated words like "Heartrate" inside other identifiers — `hasHeartrate`/`averageHr` do not match this grep pattern except `Heart` in `hasHeartrate`; check manually that no `router.push('/health')` remains).

- [ ] **Step 4: Commit**

```bash
git add Web/src/app/analytics/page.tsx
git commit -m "chore(web): remove paused Health button from analytics page"
```

---

## Task 2: One plan surface per platform — mobile Plan, desktop Calendar

**Files:**
- Modify: `Web/src/components/navigation/MobileSwipeLayout.tsx` (tabs list, `_BASE_PATHS`, imports)
- Modify: `Web/src/app/adaptive-layout.tsx` (line 18 `SWIPEABLE_PATHS`)
- Modify: `Web/src/app/mobile-layout.tsx` (remove CalendarView import + render block)
- Modify: `Web/src/app/calendar/page.tsx` (mobile redirect to `/plan`)
- Modify: `Web/src/components/RaceCountdown.tsx` (~line 136–140, platform-aware link)

**Interfaces:**
- Consumes: `useDeviceType()` from `Web/src/hooks/useDeviceType.ts` (returns `{ isMobile, isLoading }`; `isMobile` defaults to `false` while loading).
- Produces: navigation invariant — mobile bottom nav has exactly 3 tabs (Home, Plan, Analytics); `/calendar` on mobile redirects to `/plan`; desktop keeps `Calendar` button in dashboard header (already present) and `/plan` stays reachable by URL (it is the only entry to the advanced plan editor at `/plan-advanced/[goalId]`, so it must NOT be hard-redirected on desktop).

Design decision (verified in code): the desktop dashboard header (`Web/src/app/page.tsx`) already links only to `/analytics` and `/calendar` — nothing to remove there. The only other desktop link to `/plan` is the RaceCountdown tile, which becomes platform-aware below. Mobile currently shows BOTH a Plan tab and a Calendar tab; Calendar is removed.

- [ ] **Step 1: Remove the Calendar tab from the mobile bottom nav**

In `Web/src/components/navigation/MobileSwipeLayout.tsx`:

1. Delete the unused `_BASE_PATHS` constant (line 15) entirely — it is dead code and references `/calendar`.
2. Change the tabs list (lines 19–24) from 4 tabs to 3:

```tsx
const tabs = useMemo(() => [
    { icon: Home, label: 'Home', path: '/' },
    { icon: CalendarDays, label: 'Plan', path: '/plan' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
], []);
```

3. Remove `CalendarRange` from the lucide import (line 6): `import { Home, CalendarDays, BarChart3 } from 'lucide-react';`

- [ ] **Step 2: Remove `/calendar` from swipeable paths**

In `Web/src/app/adaptive-layout.tsx` line 18:

```tsx
// Pages that should use the mobile swipe layout
const SWIPEABLE_PATHS = ['/', '/plan', '/analytics'];
```

(With `/calendar` removed, a mobile visit to `/calendar` falls through to the routed page, which redirects in Step 4.)

- [ ] **Step 3: Remove the CalendarView branch from the mobile layout**

In `Web/src/app/mobile-layout.tsx`:

1. Delete the `CalendarView` dynamic import (lines 38–41).
2. Delete `const isCalendarPath = activePath === '/calendar';` (line 74).
3. Delete the Calendar render block (lines 384–387):

```tsx
{/* Calendar View - always index 3 */}
{isCalendarPath ? (
    <CalendarView showHeader={false} />
) : <div className="h-full w-full" />}
```

- [ ] **Step 4: Redirect `/calendar` → `/plan` on mobile**

In `Web/src/app/calendar/page.tsx`, add a device check + redirect. Full updated component logic:

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarRange } from 'lucide-react';
import { CalendarView } from '@/components/views/CalendarView';
import { Footer } from '@/components/Footer';
import { useDeviceType } from '@/hooks/useDeviceType';

/**
 * Standalone /calendar route (desktop / non-swipeable access).
 * Mobile users are redirected to /plan: the simple plan list is easier to
 * read on a phone, and the calendar gets more screen space on desktop.
 */
export default function CalendarPage() {
    const router = useRouter();
    const { isMobile, isLoading } = useDeviceType();

    useEffect(() => {
        if (!isLoading && isMobile) {
            router.replace('/plan');
        }
    }, [isLoading, isMobile, router]);

    // While detecting device (or mid-redirect on mobile) render nothing to
    // avoid flashing the desktop calendar on a phone.
    if (isLoading || isMobile) {
        return <div className="min-h-screen bg-background" />;
    }

    return (
        // ...existing desktop JSX unchanged (header + CalendarView + Footer)
    );
}
```

- [ ] **Step 5: Make the RaceCountdown link platform-aware**

In `Web/src/components/RaceCountdown.tsx` (button at lines 136–141):

1. Add import: `import { useDeviceType } from '@/hooks/useDeviceType';`
2. **Hook placement — CRITICAL:** `RaceCountdown` has early returns starting at line 59 (`if (!goal)`). The hook MUST be called at the top of the component, immediately after the `useUserMetrics()` call (line 55), strictly BEFORE the first early return — adding it at the button's location would create conditional hooks and crash:

```tsx
    } = useUserMetrics();
    const { isMobile } = useDeviceType();

    const shapePercent = marathonShape?.shape || 0;

    if (!goal) {
```

3. Change the button (lines 136–141):

```tsx
<button
    onClick={() => router.push(isMobile ? '/plan' : '/calendar')}
    className="text-xs text-accent-orange hover:text-accent-pink transition-colors"
>
    {isMobile ? 'View Full Plan &rarr;' : 'View Calendar &rarr;'}
</button>
```

- [ ] **Step 6: Verify build & types**

Run: `cd /home/thies/Projects/RunFlow/Web && npx tsc --noEmit && npm run lint`
Expected: no errors. Note: `tsc`/`next lint` will NOT flag leftover unused imports (`noUnusedLocals` is off, `no-unused-vars` is warn-only), so also grep for leftovers:

```bash
grep -n "CalendarRange\|isCalendarPath\|_BASE_PATHS" src/components/navigation/MobileSwipeLayout.tsx src/app/mobile-layout.tsx
```

Expected: no matches.

- [ ] **Step 7: Commit**

```bash
git add Web/src/components/navigation/MobileSwipeLayout.tsx Web/src/app/adaptive-layout.tsx Web/src/app/mobile-layout.tsx Web/src/app/calendar/page.tsx Web/src/components/RaceCountdown.tsx
git commit -m "feat(web): show Plan on mobile, Calendar on desktop (single plan surface per platform)"
```

---

## Task 3: Bust the dashboard Redis cache when sync status changes

**Root cause being fixed:** `/api/dashboard` caches its whole response (including `recentActivities` and `syncStatus`) in Redis for 60s under `dashboard:v3:{userId}:{date}`. `POST /api/sync` starts a background sync that writes new activities but never invalidates that cache. Additionally, the client's first refetch (right after the sync POST succeeds) usually still gets the cached pre-sync response with `syncInProgress: false`, so the 2s polling (`refetchInterval` keyed on `syncStatus.syncInProgress`) never even starts. Result: user must leave and reload the page to see new activities.

**Fix:** a per-user Redis counter `dashboard:cachever:{userId}` that `updateSyncStatus()` bumps (called at sync start, sync success, sync-with-errors, and sync failure — all paths), included in the dashboard cache key. Key change ⇒ immediate fresh response at sync start (polling begins) and at completion (final poll returns new activities within ≤2s).

**Files:**
- Modify: `Web/src/lib/strava/persistence.ts` (`updateSyncStatus`, lines 224–235)
- Modify: `Web/src/app/api/dashboard/route.ts` (cache key section, lines 44–46)
- Test: `Web/src/lib/strava/persistence.test.ts` (new; co-located like existing `sync.test.ts`)

**Interfaces:**
- Consumes: `getRedisClient(): Promise<RedisClient | null>` from `@/lib/redis` (already exported).
- Produces: Redis key convention `dashboard:cachever:{userId}` (string counter, no TTL needed — tiny). Consumed by the dashboard route in this same task.

- [ ] **Step 1: Write the failing test**

Create `Web/src/lib/strava/persistence.test.ts`:

```ts
/**
 * @jest-environment node
 */

import { updateSyncStatus } from './persistence';
import { prisma } from '@/lib/db';
import { getRedisClient } from '@/lib/redis';

jest.mock('@/lib/db', () => ({
    prisma: {
        user: { update: jest.fn() },
    },
}));

jest.mock('@/lib/redis', () => ({
    getRedisClient: jest.fn(),
}));

jest.mock('@/lib/logging/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockedGetRedisClient = getRedisClient as jest.MockedFunction<typeof getRedisClient>;
const mockedUserUpdate = prisma.user.update as jest.Mock;

describe('updateSyncStatus', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedUserUpdate.mockResolvedValue({});
    });

    it('bumps the dashboard cache version after updating sync status', async () => {
        const incr = jest.fn().mockResolvedValue(1);
        mockedGetRedisClient.mockResolvedValue({ incr } as never);

        await updateSyncStatus('user-1', { syncInProgress: true });

        expect(mockedUserUpdate).toHaveBeenCalledWith({
            where: { id: 'user-1' },
            data: { syncInProgress: true },
        });
        expect(incr).toHaveBeenCalledWith('dashboard:cachever:user-1');
    });

    it('does not throw when redis is unavailable (null client)', async () => {
        mockedGetRedisClient.mockResolvedValue(null);

        await expect(updateSyncStatus('user-1', { syncInProgress: false })).resolves.toBeUndefined();
        expect(mockedUserUpdate).toHaveBeenCalledTimes(1);
    });

    it('does not throw when redis errors', async () => {
        mockedGetRedisClient.mockRejectedValue(new Error('redis down'));

        await expect(updateSyncStatus('user-1', { lastSyncAt: new Date() })).resolves.toBeUndefined();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/thies/Projects/RunFlow/Web && npx jest src/lib/strava/persistence.test.ts`
Expected: FAIL — `incr` never called (current `updateSyncStatus` only writes to Prisma).

- [ ] **Step 3: Implement the cache-version bump**

In `Web/src/lib/strava/persistence.ts`:

1. Add import at top: `import { getRedisClient } from '@/lib/redis';`
2. Replace `updateSyncStatus` with:

```ts
export async function updateSyncStatus(
    userId: string,
    status: {
        syncInProgress?: boolean;
        lastSyncAt?: Date;
    }
): Promise<void> {
    await prisma.user.update({
        where: { id: userId },
        data: status,
    });

    // Bust the dashboard Redis cache: the cache key embeds this version, so
    // sync start/completion is reflected immediately instead of after the
    // 60s TTL (fixes "new activities only appear after page reload").
    try {
        const redisClient = await getRedisClient();
        await redisClient?.incr(`dashboard:cachever:${userId}`);
    } catch {
        // Best-effort: entries still expire via TTL if this fails.
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/thies/Projects/RunFlow/Web && npx jest src/lib/strava/persistence.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Include the version in the dashboard cache key**

In `Web/src/app/api/dashboard/route.ts`, replace lines 44–46:

```ts
// Try Redis Cache
const redisClient = await getRedisClient();
const cacheKey = `dashboard:v3:${userId}:${validRefDate.toISOString().split('T')[0]}`;
```

with:

```ts
// Try Redis Cache
// The cache key embeds a per-user version counter that updateSyncStatus()
// bumps whenever a Strava sync starts or completes, so a sync is never
// shadowed by a stale cached response.
const redisClient = await getRedisClient();
let cacheVersion = '0';
try {
    cacheVersion = (await redisClient?.get(`dashboard:cachever:${userId}`)) ?? '0';
} catch (e) {
    console.error('Redis cache version read error:', e);
}
const cacheKey = `dashboard:v3:${userId}:${validRefDate.toISOString().split('T')[0]}:${cacheVersion}`;
```

(All existing `redisClient?.get/set` calls stay unchanged and remain null-safe. The existing dashboard route test already mocks `@/lib/redis` with `getRedisClient: jest.fn(async () => null)` → `cacheVersion` stays `'0'` and tests are unaffected.)

- [ ] **Step 6: Run the full dashboard + strava test suites**

Run: `cd /home/thies/Projects/RunFlow/Web && npx jest src/app/api/dashboard src/lib/strava`
Expected: PASS (existing `route.test.ts` unaffected; new persistence tests pass).

- [ ] **Step 7: Commit**

```bash
git add Web/src/lib/strava/persistence.ts Web/src/lib/strava/persistence.test.ts Web/src/app/api/dashboard/route.ts
git commit -m "fix(web): bust dashboard Redis cache on Strava sync so new activities show immediately"
```

---

## Task 4: Auto-sync with Strava when the dashboard opens with stale data

**Files:**
- Create: `Web/src/lib/strava/autoSync.ts` (pure decision logic — testable without React)
- Create: `Web/src/lib/strava/autoSync.test.ts`
- Create: `Web/src/hooks/useAutoStravaSync.ts` (thin React hook)
- Modify: `Web/src/app/page.tsx` (use hook; `cache: 'no-store'` on dashboard fetch)
- Modify: `Web/src/app/mobile-layout.tsx` (same two changes)

**Interfaces:**
- Consumes: `dashboardData.syncStatus` shape from `/api/dashboard`: `{ syncInProgress: boolean; lastSyncAt: string (ISO) | null; totalActivities: number }` (after JSON serialization `Date` → ISO string).
- Produces:
  - `shouldAutoSync(status: { syncInProgress?: boolean; lastSyncAt?: string | Date | null } | undefined | null, now?: number): boolean` and `AUTO_SYNC_THRESHOLD_MS = 15 * 60 * 1000` in `@/lib/strava/autoSync`
  - `useAutoStravaSync(syncStatus): void` in `@/hooks/useAutoStravaSync` (fires `POST /api/sync` at most once per browser page-load session, silently, then invalidates `['dashboard-data']` so the existing `refetchInterval` polling takes over)

- [ ] **Step 1: Write the failing test for `shouldAutoSync`**

Create `Web/src/lib/strava/autoSync.test.ts`:

```ts
/**
 * @jest-environment node
 */

import { shouldAutoSync, AUTO_SYNC_THRESHOLD_MS } from './autoSync';

const NOW = 1_700_000_000_000;
const MINUTE = 60 * 1000;

describe('shouldAutoSync', () => {
    it('returns false when status is undefined or null', () => {
        expect(shouldAutoSync(undefined, NOW)).toBe(false);
        expect(shouldAutoSync(null, NOW)).toBe(false);
    });

    it('returns false when a sync is already in progress', () => {
        expect(shouldAutoSync({ syncInProgress: true, lastSyncAt: new Date(NOW - 60 * MINUTE).toISOString() }, NOW)).toBe(false);
    });

    it('returns false when the user has never synced (Strava likely not connected)', () => {
        expect(shouldAutoSync({ syncInProgress: false, lastSyncAt: null }, NOW)).toBe(false);
        expect(shouldAutoSync({ syncInProgress: false }, NOW)).toBe(false);
    });

    it('returns false when the last sync is recent', () => {
        expect(shouldAutoSync({ syncInProgress: false, lastSyncAt: new Date(NOW - 5 * MINUTE).toISOString() }, NOW)).toBe(false);
    });

    it('returns true when the last sync is older than the threshold', () => {
        expect(shouldAutoSync({ syncInProgress: false, lastSyncAt: new Date(NOW - AUTO_SYNC_THRESHOLD_MS - 1).toISOString() }, NOW)).toBe(true);
    });

    it('accepts Date objects as well as ISO strings', () => {
        expect(shouldAutoSync({ syncInProgress: false, lastSyncAt: new Date(NOW - AUTO_SYNC_THRESHOLD_MS - 1) }, NOW)).toBe(true);
    });

    it('returns false for an unparseable lastSyncAt', () => {
        expect(shouldAutoSync({ syncInProgress: false, lastSyncAt: 'not-a-date' }, NOW)).toBe(false);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/thies/Projects/RunFlow/Web && npx jest src/lib/strava/autoSync.test.ts`
Expected: FAIL — module `./autoSync` does not exist.

- [ ] **Step 3: Implement `shouldAutoSync`**

Create `Web/src/lib/strava/autoSync.ts`:

```ts
/** Minimum age of the last sync before we auto-sync when the dashboard opens. */
export const AUTO_SYNC_THRESHOLD_MS = 15 * 60 * 1000;

export interface AutoSyncStatus {
    syncInProgress?: boolean;
    lastSyncAt?: string | Date | null;
}

/**
 * Decides whether a Strava auto-sync should be triggered for this dashboard
 * load. False when the user has never synced (Strava likely not connected),
 * when a sync is already running, or when the last sync is recent enough.
 */
export function shouldAutoSync(
    status: AutoSyncStatus | undefined | null,
    now: number = Date.now()
): boolean {
    if (!status || status.syncInProgress) return false;
    if (!status.lastSyncAt) return false;
    const last = new Date(status.lastSyncAt).getTime();
    if (Number.isNaN(last)) return false;
    return now - last >= AUTO_SYNC_THRESHOLD_MS;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/thies/Projects/RunFlow/Web && npx jest src/lib/strava/autoSync.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Implement the hook**

Create `Web/src/hooks/useAutoStravaSync.ts`:

```ts
'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { shouldAutoSync, type AutoSyncStatus } from '@/lib/strava/autoSync';

// Auto-sync at most once per browser page-load session, even if the hook
// mounts in multiple layouts (desktop page + mobile layout).
let autoSyncTriggered = false;

/**
 * Triggers a silent background Strava sync when the dashboard loads with a
 * stale lastSyncAt. Errors are swallowed by design — the manual Sync button
 * remains the user-facing path for feedback and reconnection prompts.
 */
export function useAutoStravaSync(syncStatus: AutoSyncStatus | undefined | null): void {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (autoSyncTriggered || !shouldAutoSync(syncStatus)) return;
        autoSyncTriggered = true;

        let cancelled = false;
        const refetchDashboard = () =>
            queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });

        (async () => {
            try {
                const res = await fetch('/api/sync', { method: 'POST' });
                if (!res.ok || cancelled) return;
                // Refetch immediately, then again after 2s. The POST returns
                // before the background task flips syncInProgress and bumps
                // the cache version, so the immediate refetch alone can still
                // read the pre-sync cached response and never start the 2s
                // polling. The delayed refetch closes that race.
                await refetchDashboard();
                setTimeout(() => { if (!cancelled) void refetchDashboard(); }, 2000);
            } catch {
                // Silent by design.
            }
        })();

        return () => { cancelled = true; };
    }, [syncStatus, queryClient]);
}
```

- [ ] **Step 6: Wire into the desktop dashboard (`Web/src/app/page.tsx`)**

1. Add imports: `import { useAutoStravaSync } from '@/hooks/useAutoStravaSync';`
2. In the dashboard query's `queryFn` (line ~43) add `cache: 'no-store'` so no HTTP-layer cache can shadow refetches:

```ts
const res = await fetch(`/api/dashboard?date=${todayStr}`, { cache: 'no-store' });
```

3. After `const syncStatus = dashboardData?.syncStatus;` (line ~76) add:

```ts
// Auto-sync with Strava on page open when the last sync is stale.
useAutoStravaSync(syncStatus);
```

   (All hooks in this file precede the first early return at line 103, so this placement keeps hook order stable.)

4. Fix the same cache-version race for the manual Sync button: `syncMutation.onSuccess` (lines 66–69) currently invalidates once, immediately — the background task may not have flipped `syncInProgress`/bumped the cache version yet, so polling never starts. Change it to invalidate immediately and again after 2s:

```ts
onSuccess: () => {
    // Immediate + delayed: the sync POST returns before the background task
    // bumps the dashboard cache version, so a single immediate invalidate can
    // still read the pre-sync cached response and never start polling.
    queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
    setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
    }, 2000);
},

- [ ] **Step 7: Wire into the mobile layout (`Web/src/app/mobile-layout.tsx`)**

1. Add import: `import { useAutoStravaSync } from '@/hooks/useAutoStravaSync';`
2. Same `cache: 'no-store'` addition in the dashboard query `queryFn` (line ~91):

```ts
const res = await fetch(`/api/dashboard?date=${todayStr}`, { cache: 'no-store' });
```

3. After `const syncStatus = dashboardData?.syncStatus;` (line ~248) add:

```ts
// Auto-sync with Strava when the app opens and the last sync is stale.
useAutoStravaSync(syncStatus);
```

   (The only early return in this file is at lines 313–315, safely after all hooks.)

4. Apply the same double-invalidation fix to `syncMutation.onSuccess` (line 212, currently `onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard-data'] }),`):

```ts
onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
    setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
    }, 2000);
},

- [ ] **Step 8: Typecheck, lint, run full test suite**

Run: `cd /home/thies/Projects/RunFlow/Web && npx tsc --noEmit && npm run lint && npm test`
Expected: all pass, zero new errors.

- [ ] **Step 9: Commit**

```bash
git add Web/src/lib/strava/autoSync.ts Web/src/lib/strava/autoSync.test.ts Web/src/hooks/useAutoStravaSync.ts Web/src/app/page.tsx Web/src/app/mobile-layout.tsx
git commit -m "feat(web): auto-sync Strava when dashboard opens with stale data"
```

---

## Task 5: End-to-end verification, build, browser check, push

**Files:** none (verification only)

- [ ] **Step 1: Full static verification**

```bash
cd /home/thies/Projects/RunFlow/Web && npx tsc --noEmit && npm run lint && npm test
```

Expected: all green.

- [ ] **Step 2: Production build**

```bash
cd /home/thies/Projects/RunFlow/Web && npm run build
```

Expected: build succeeds (`.env` provides `DATABASE_URL`).

- [ ] **Step 3: Visual/browser check (dev server + Playwright MCP)**

Start dev server in background: `cd /home/thies/Projects/RunFlow/Web && npm run dev` (port 3000). Then with browser automation:

1. **Desktop viewport (1280×800)**: open `http://localhost:3000` → header shows *Analytics* and *Calendar* buttons (no Plan). Analytics page has **no Health button**. `http://localhost:3000/plan` still renders the plan page (advanced editor entry preserved).
2. **Mobile viewport (390×844)**: dashboard shows bottom nav with exactly **3 tabs: Home, Plan, Analytics** (no Calendar). Navigating to `http://localhost:3000/calendar` redirects to `/plan`.

If the dev server cannot run against the local database, fall back to Step 2's build as the gate and note the skipped visual check in the final report.

- [ ] **Step 4: Stop dev server, confirm clean staging**

`git status` — staged/committed files must include ONLY the files from Tasks 1–4 plus this plan doc; the user's pre-existing dirty files (`Web/package-lock.json` modified; untracked `Web/src/lib/plans/defaultTemplates.ts`, `RUNALYZE_files/`, PDFs, Coolify HTML exports) must remain untouched.

- [ ] **Step 5: Commit plan doc and push**

```bash
git add docs/superpowers/plans/2026-09-06-web-health-nav-sync-fixes.md
git commit -m "docs: add implementation plan for health-button, platform nav, sync cache fixes"
git push origin master
```

---

## Out of scope (explicitly not done)

- Deleting/hiding `/health` routes, `HealthView`, or health settings (feature is paused, not removed).
- Health Connect sync cache invalidation (mobile-only path; separate API writes). Noted: could reuse `dashboard:cachever` bump later if staleness is reported there.
- Hard-redirecting desktop `/plan` → `/calendar`: intentionally NOT done because `/plan` is the only entry point to `/plan-advanced/[goalId]` (full plan editor) and to desktop drag-and-drop workout editing; the requirement is satisfied by navigation surfacing exactly one plan view per platform.
- PWA service worker: production builds (`next-pwa`) runtime-cache `/api/*` with a **NetworkFirst** strategy (10s network timeout, 24h max age). Normal operation always prefers the network, so the Redis fix works; only on a slow/failing network (>10s) can the SW serve a stale dashboard for up to 24h. Accepted for now; if reported, exclude `/api/dashboard` from SW runtime caching in `next.config.mjs`. The dev-server browser check in Task 5 does not exercise the SW (next-pwa is disabled in development).
- `getSyncStatus`'s stuck-flag auto-reset (`sync.ts:414–424`) writes `syncInProgress: false` directly via Prisma, bypassing the cache-version bump: worst case is ~60s of pointless 2s polling. Accepted (bounded by the 60s cache TTL).
- Revoked-Strava-token churn: a user whose token is revoked but has an old `lastSyncAt` will trigger one failed background sync per page-load session (token refresh fails, two `updateSyncStatus` writes bump the cache version, Redis cache effectively bypassed for that user). Accepted — it is silent in the UI, rate-limit-safe, and `lastSyncAt` doubles as the incremental sync cursor so advancing it on auth failure (which would skip activities) is not an option. The manual Sync button already surfaces "Reconnect Strava".
- Resizing a desktop browser window below 768px while on `/calendar` redirects to `/plan` mid-session — inherent to `useDeviceType`'s resize listener; accepted as intended behavior.
- Flutter app (`flutter/`) — untouched; `flutter analyze`/`flutter test` per AGENTS.md therefore not required for this push.
