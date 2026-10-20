/**
 * @jest-environment node
 *
 * Route tests for the MyWhoosh/.zwo workout file import endpoint: auth,
 * plan ownership, upload bounds (5MB total / 100 files / 500 workouts),
 * per-file parse failures, and the happy path (flatten → snapshot before
 * mutation → transactional createMany). The real Task-1 parser runs
 * underneath — only infrastructure (db, auth, rate limit, snapshot, logger)
 * is mocked.
 */
import { POST } from '../route';
import type { NextRequest } from 'next/server';

// Provide the generated enum objects so the route/parser modules can use
// them at load time (same shape as the csv/import and plans/import tests).
jest.mock('@/generated/prisma/client', () => ({
    WorkoutType: {
        EASY: 'EASY',
        LONG_RUN: 'LONG_RUN',
        TEMPO: 'TEMPO',
        INTERVALS: 'INTERVALS',
        FARTLEK: 'FARTLEK',
        REPETITIONS: 'REPETITIONS',
        RECOVERY: 'RECOVERY',
        RACE: 'RACE',
        REST: 'REST',
        CROSS_TRAIN: 'CROSS_TRAIN',
        RIDE: 'RIDE',
        SWIM: 'SWIM',
        STRENGTH: 'STRENGTH',
        OTHER: 'OTHER',
        BRICK: 'BRICK',
        OPEN_WATER_SWIM: 'OPEN_WATER_SWIM',
        LONG_RIDE: 'LONG_RIDE',
        RIDE_INTERVALS: 'RIDE_INTERVALS',
        SWIM_DRILL: 'SWIM_DRILL',
        TRANSITION_PRACTICE: 'TRANSITION_PRACTICE',
        DOUBLE_DAY: 'DOUBLE_DAY',
    },
    PlanPhase: {
        BASE: 'BASE',
        BUILD: 'BUILD',
        PEAK: 'PEAK',
        TAPER: 'TAPER',
        RACE_WEEK: 'RACE_WEEK',
        RECOVERY: 'RECOVERY',
        ENDURANCE: 'ENDURANCE',
        MENTAL_PREP: 'MENTAL_PREP',
        TUNE_UP: 'TUNE_UP',
        MAINTAIN: 'MAINTAIN',
    },
}));

jest.mock('@/lib/mobile/auth', () => ({
    getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
    prisma: {
        goal: {
            findFirst: jest.fn(),
        },
        workout: {
            createMany: jest.fn(),
        },
        $transaction: jest.fn(),
    },
}));

jest.mock('@/lib/rateLimit', () => ({
    checkRateLimitAsync: jest.fn(),
    getClientIdentifier: jest.fn(),
    RATE_LIMITS: { settings: { limit: 10, windowSeconds: 60, prefix: 'settings' } },
    // Same header names as the real helper in @/lib/rateLimit.
    rateLimitHeaders: jest.fn(
        (result: { limit: number; remaining: number; resetAt: number }) => ({
            'X-RateLimit-Limit': String(result.limit),
            'X-RateLimit-Remaining': String(result.remaining),
            'X-RateLimit-Reset': String(result.resetAt),
        }),
    ),
}));

jest.mock('@/lib/plan/snapshot', () => ({
    createSnapshot: jest.fn(),
}));

// Keep test output pristine: handleApiError logs every rejection path.
jest.mock('@/lib/logging/logger', () => ({
    logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier } from '@/lib/rateLimit';
import { createSnapshot } from '@/lib/plan/snapshot';

const CTX = { params: Promise.resolve({ goalId: 'goal-1' }) };

const ZWO_XML = `<?xml version="1.0" encoding="UTF-8"?>
<workout_file>
    <author>MyWhoosh</author>
    <name>Sample Ride</name>
    <description>Round trip sample</description>
    <sportType>bike</sportType>
    <workout>
        <Warmup Duration="600" PowerLow="0.50" PowerHigh="0.68"/>
        <SteadyState Duration="1800" Power="0.70"/>
        <Cooldown Duration="600" PowerLow="0.65" PowerHigh="0.50"/>
    </workout>
</workout_file>`;

// Array of two MyWhoosh workout-JSON objects: a hard sweet-spot session and
// a pure free ride (no power target, no description -> fallback description).
const MYWHOOSH_ARRAY = JSON.stringify([
    {
        Id: 'j1',
        Name: 'Sweet Spot Party',
        Description: 'A workout',
        TSS: 62,
        IF: 0.89,
        Duration: 3600,
        WorkoutStepsArray: [
            { StepType: 'E_WarmUp', StartPower: 0.5, EndPower: 0.68, Time: 300, IntervalId: 0 },
            { StepType: 'E_Normal', Power: 0.9, Time: 600 },
        ],
    },
    {
        Id: 'j2',
        Name: 'Easy Spin',
        Duration: 1200,
        WorkoutStepsArray: [{ StepType: 'E_FreeRide', Time: 1200 }],
    },
]);

/** The route reads headers + formData(); the repo's global Request mock has
 *  no formData(), so a plain object stands in for the multipart request. */
function multipartRequest(files: File[], startDate: string | null = '2026-03-01'): NextRequest {
    return {
        headers: new Headers({ 'content-type': 'multipart/form-data; boundary=x' }),
        formData: async () => {
            const fd = new FormData();
            for (const file of files) fd.append('files', file);
            if (startDate !== null) fd.append('startDate', startDate);
            return fd;
        },
    } as unknown as NextRequest;
}

function createManyRows(): Array<Record<string, unknown>> {
    return (prisma.workout.createMany as jest.Mock).mock.calls[0][0].data as Array<Record<string, unknown>>;
}

describe('POST /api/plan-advanced/[goalId]/mywhoosh/import-files', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getAuthenticatedUser as jest.Mock).mockResolvedValue({ id: 'user-1', authMethod: 'session' });
        (getClientIdentifier as jest.Mock).mockReturnValue('test-client');
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: true });
        (prisma.goal.findFirst as jest.Mock).mockResolvedValue({ id: 'goal-1', userId: 'user-1' });
        (prisma.workout.createMany as jest.Mock).mockResolvedValue({ count: 0 });
        (prisma.$transaction as jest.Mock).mockImplementation(
            async (arg: unknown) =>
                typeof arg === 'function'
                    ? (arg as (tx: unknown) => Promise<unknown>)(prisma)
                    : Promise.all(arg as Promise<unknown>[]),
        );
    });

    it('returns 401 for unauthenticated requests', async () => {
        (getAuthenticatedUser as jest.Mock).mockResolvedValue(null);
        const res = await POST(multipartRequest([new File([ZWO_XML], 'ride.zwo')]), CTX);

        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error).toBe('UNAUTHORIZED');
        expect(prisma.goal.findFirst).not.toHaveBeenCalled();
        expect(createSnapshot).not.toHaveBeenCalled();
    });

    it('returns 429 with X-RateLimit-* headers when the rate limit is exceeded', async () => {
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({
            allowed: false,
            remaining: 0,
            resetAt: 1900000000,
            limit: 10,
            retryAfter: 42,
        });
        const res = await POST(multipartRequest([new File([ZWO_XML], 'ride.zwo')]), CTX);

        expect(res.status).toBe(429);
        const body = await res.json();
        expect(body.error).toBe('RATE_LIMITED');
        expect(res.headers.get('X-RateLimit-Limit')).toBe('10');
        expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
        expect(res.headers.get('X-RateLimit-Reset')).toBe('1900000000');
        expect(prisma.goal.findFirst).not.toHaveBeenCalled();
        expect(createSnapshot).not.toHaveBeenCalled();
    });

    it('returns 404 when the plan does not belong to the caller', async () => {
        (prisma.goal.findFirst as jest.Mock).mockResolvedValue(null);
        const res = await POST(multipartRequest([new File([ZWO_XML], 'ride.zwo')]), CTX);

        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.error).toBe('NOT_FOUND');
        // Ownership filter includes the soft-delete guard.
        expect(prisma.goal.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'goal-1', userId: 'user-1', deletedAt: null } }),
        );
        expect(prisma.workout.createMany).not.toHaveBeenCalled();
        expect(createSnapshot).not.toHaveBeenCalled();
    });

    it('rejects uploads above the 5MB total byte cap with 413 before parsing', async () => {
        const big = new File(['x'.repeat(5 * 1024 * 1024 + 1)], 'big.zwo', { type: 'application/xml' });
        const res = await POST(multipartRequest([big]), CTX);

        expect(res.status).toBe(413);
        const body = await res.json();
        expect(body.error).toBe('PAYLOAD_TOO_LARGE');
        expect(body.message).toContain('5MB');
        expect(prisma.workout.createMany).not.toHaveBeenCalled();
        expect(createSnapshot).not.toHaveBeenCalled();
    });

    it('rejects more than 100 files with 413', async () => {
        const files = Array.from(
            { length: 101 },
            (_, i) => new File([JSON.stringify({ WorkoutStepsArray: [] })], `w${i}.json`),
        );
        const res = await POST(multipartRequest(files), CTX);

        expect(res.status).toBe(413);
        const body = await res.json();
        expect(body.error).toBe('PAYLOAD_TOO_LARGE');
        expect(body.message).toContain('100');
        expect(prisma.workout.createMany).not.toHaveBeenCalled();
        expect(createSnapshot).not.toHaveBeenCalled();
    });

    it('rejects a flattened import above 500 workouts with 413', async () => {
        const many = Array.from({ length: 501 }, (_, i) => ({
            Name: `W${i}`,
            WorkoutStepsArray: [{ StepType: 'E_Normal', Power: 0.6, Time: 60 }],
        }));
        const res = await POST(multipartRequest([new File([JSON.stringify(many)], 'many.json')]), CTX);

        expect(res.status).toBe(413);
        const body = await res.json();
        expect(body.error).toBe('PAYLOAD_TOO_LARGE');
        expect(body.message).toContain('500');
        expect(prisma.workout.createMany).not.toHaveBeenCalled();
        expect(createSnapshot).not.toHaveBeenCalled();
    });

    it('returns 422 listing every rejected filename with a reason when a file is unparseable', async () => {
        const files = [
            new File([ZWO_XML], 'good.zwo'),
            new File(['{ not json'], 'broken.json'),
            new File([JSON.stringify({ Name: 'no steps array' })], 'not-mywhoosh.json'),
        ];
        const res = await POST(multipartRequest(files), CTX);

        expect(res.status).toBe(422);
        const body = await res.json();
        expect(body.error).toBe('UNPROCESSABLE');
        expect(body.message).toContain('broken.json');
        expect(body.message).toContain('not-mywhoosh.json');
        expect(body.message).not.toContain('good.zwo');
        expect(body.details.rejectedFiles).toEqual([
            { file: 'broken.json', reason: expect.any(String) },
            { file: 'not-mywhoosh.json', reason: expect.any(String) },
        ]);
        expect(prisma.workout.createMany).not.toHaveBeenCalled();
        expect(createSnapshot).not.toHaveBeenCalled();
    });

    it('returns 422 listing the file when a MyWhoosh JSON has an empty WorkoutStepsArray', async () => {
        const files = [
            new File([ZWO_XML], 'good.zwo'),
            new File([JSON.stringify({ Name: 'Empty Ride', WorkoutStepsArray: [] })], 'zero-steps.json'),
        ];
        const res = await POST(multipartRequest(files), CTX);

        expect(res.status).toBe(422);
        const body = await res.json();
        expect(body.error).toBe('UNPROCESSABLE');
        expect(body.details.rejectedFiles).toEqual([
            { file: 'zero-steps.json', reason: 'MyWhoosh workout file has no steps: Empty Ride' },
        ]);
        expect(body.message).toContain('zero-steps.json');
        expect(body.message).not.toContain('good.zwo');
        expect(prisma.workout.createMany).not.toHaveBeenCalled();
        expect(createSnapshot).not.toHaveBeenCalled();
    });

    it('imports 1 zwo + 1 json array as 3 workouts with correct dates, targets and snapshot', async () => {
        const res = await POST(
            multipartRequest([new File([ZWO_XML], 'ride.zwo'), new File([MYWHOOSH_ARRAY], 'workouts.json')]),
            CTX,
        );

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.created).toBe(3);
        expect(body.filesProcessed).toBe(2);
        expect(body.rejectedFiles).toEqual([]);
        expect(body.firstDate).toBe('2026-03-01T00:00:00.000Z');
        expect(body.lastDate).toBe('2026-03-03T00:00:00.000Z');

        // Snapshot exactly once, with the import operation label, BEFORE mutation.
        expect(createSnapshot).toHaveBeenCalledTimes(1);
        expect(createSnapshot).toHaveBeenCalledWith('goal-1', 'Before MyWhoosh file import', 'mywhoosh_file_import');
        expect(prisma.workout.createMany).toHaveBeenCalledTimes(1);
        expect((createSnapshot as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
            (prisma.workout.createMany as jest.Mock).mock.invocationCallOrder[0],
        );

        const rows = createManyRows();
        expect(rows).toHaveLength(3);

        const [zwo, sweetSpot, freeRide] = rows;

        // Row 0: the .zwo file. SteadyState 0.70 is the dominant work/steady percent.
        expect(zwo.scheduledDate).toBeInstanceOf(Date);
        expect((zwo.scheduledDate as Date).toISOString()).toBe('2026-03-01T00:00:00.000Z');
        expect(zwo).toMatchObject({
            goalId: 'goal-1',
            workoutType: 'RIDE',
            sport: 'BIKE',
            phase: 'BASE',
            description: 'Round trip sample',
            customName: 'Sample Ride',
            plannedTss: null,
            targetDuration: 3000,
            targetFtpPercent: 70,
            order: 0,
        });
        const zwoSteps = (zwo.structuredSteps as { version: number; source: string; steps: unknown[] });
        expect(zwoSteps.version).toBe(2);
        expect(zwoSteps.source).toBe('template');
        expect(zwoSteps.steps).toHaveLength(3);

        // Row 1: first element of the .json array. 90% work step -> RIDE_INTERVALS.
        expect((sweetSpot.scheduledDate as Date).toISOString()).toBe('2026-03-02T00:00:00.000Z');
        expect(sweetSpot).toMatchObject({
            goalId: 'goal-1',
            workoutType: 'RIDE_INTERVALS',
            sport: 'BIKE',
            phase: 'BASE',
            description: 'A workout',
            customName: 'Sweet Spot Party',
            plannedTss: 62,
            targetDuration: 900,
            targetFtpPercent: 90,
            order: 1,
        });

        // Row 2: second element. Free ride -> no ftp percent, fallback description.
        expect((freeRide.scheduledDate as Date).toISOString()).toBe('2026-03-03T00:00:00.000Z');
        expect(freeRide).toMatchObject({
            goalId: 'goal-1',
            workoutType: 'RIDE',
            sport: 'BIKE',
            phase: 'BASE',
            description: 'Imported from MyWhoosh/.zwo file workouts.json',
            customName: 'Easy Spin',
            plannedTss: null,
            targetDuration: 1200,
            targetFtpPercent: null,
            order: 2,
        });
    });

    it('detects XML by a leading < even when the file has a .json extension', async () => {
        const res = await POST(multipartRequest([new File([ZWO_XML], 'mislabeled.json')]), CTX);

        expect(res.status).toBe(200);
        expect((await res.json()).created).toBe(1);
        expect(createManyRows()[0].customName).toBe('Sample Ride');
    });

    it('rejects a request with no files', async () => {
        const res = await POST(multipartRequest([]), CTX);
        expect(res.status).toBe(400);
        expect(createSnapshot).not.toHaveBeenCalled();
    });

    it('rejects a missing or invalid startDate with 400', async () => {
        const missing = await POST(multipartRequest([new File([ZWO_XML], 'ride.zwo')], null), CTX);
        expect(missing.status).toBe(400);

        const invalid = await POST(multipartRequest([new File([ZWO_XML], 'ride.zwo')], 'not-a-date'), CTX);
        expect(invalid.status).toBe(400);
        expect(prisma.workout.createMany).not.toHaveBeenCalled();
        expect(createSnapshot).not.toHaveBeenCalled();
    });
});
