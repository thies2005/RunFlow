/**
 * @jest-environment node
 *
 * Regression tests for p3: uncapped-upload-parse-preview-retention on the
 * CSV plan import route: byte cap on the upload, row cap on the parse
 * (413 semantics), bounded per-user preview retention, and an unchanged
 * legitimate upload→confirm roundtrip.
 */
import { POST } from '../route';
import { NextRequest } from 'next/server';

// Provide the generated enum objects so the route/parser modules can build
// their VALID_* sets at load time (same shape as the plans/import tests).
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

jest.mock('@/lib/db', () => ({
    prisma: {
        goal: {
            findFirst: jest.fn(),
        },
        workout: {
            create: jest.fn(),
        },
        $transaction: jest.fn(),
    },
}));

jest.mock('@/lib/rateLimit', () => ({
    checkRateLimitAsync: jest.fn(),
    getClientIdentifier: jest.fn(),
    RATE_LIMITS: { settings: { limit: 10, windowSeconds: 60, prefix: 'settings' } },
    rateLimitHeaders: jest.fn(() => ({})),
}));

jest.mock('@/lib/plan/snapshot', () => ({
    createSnapshot: jest.fn(),
}));

jest.mock('@/auth', () => ({
    auth: jest.fn(async () => ({ user: { id: 'user-1' } })),
}));

import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier } from '@/lib/rateLimit';
import { createSnapshot } from '@/lib/plan/snapshot';
import { getPreview } from '@/lib/plans/csv-preview-cache';

const ROUTE_URL = 'http://localhost/api/plan-advanced/goal-1/csv/import';
const CTX = { params: Promise.resolve({ goalId: 'goal-1' }) };

const CSV_HEADER = 'date,workout_type,phase,name,description,distance_m,duration_s,pace_s_km,hr_zone';

function runflowCsv(validRows: number): string {
    const lines = [CSV_HEADER];
    for (let i = 0; i < validRows; i++) {
        lines.push(`2026-01-0${(i % 9) + 1},EASY,BASE,"Run ${i}","Steady effort",8000,2700,330,2`);
    }
    return lines.join('\n');
}

/** The route reads headers + formData(); the repo's global Request mock has
 *  no formData(), so a plain object stands in for the multipart request. */
function multipartRequest(file: File, formatHint = 'runflow'): Request {
    return {
        headers: new Headers({ 'content-type': 'multipart/form-data; boundary=x' }),
        formData: async () => {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('formatHint', formatHint);
            return fd;
        },
    } as unknown as Request;
}

function jsonRequest(body: unknown): Request {
    return new NextRequest(ROUTE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }) as unknown as Request;
}

function upload(csvText: string): Promise<Response> {
    return POST(
        multipartRequest(new File([csvText], 'plan.csv', { type: 'text/csv' })),
        CTX,
    );
}

describe('POST /api/plan-advanced/[goalId]/csv/import', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getClientIdentifier as jest.Mock).mockReturnValue('test-client');
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: true });
        (prisma.goal.findFirst as jest.Mock).mockResolvedValue({ id: 'goal-1', userId: 'user-1' });
        (prisma.$transaction as jest.Mock).mockImplementation(
            async (arg: unknown) =>
                typeof arg === 'function' ? (arg as (tx: unknown) => Promise<unknown>)(prisma) : Promise.all(arg as Promise<unknown>[]),
        );
        let seq = 0;
        (prisma.workout.create as jest.Mock).mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
            id: `workout-${++seq}`,
            ...data,
        }));
    });

    it('runs the normal upload → preview → confirm roundtrip unchanged', async () => {
        const uploadRes = await upload(runflowCsv(2));
        expect(uploadRes.status).toBe(200);

        const preview = await uploadRes.json();
        expect(preview.validRows).toBe(2);
        expect(preview.sampleWorkouts).toHaveLength(2);
        expect(getPreview(preview.previewId)).not.toBeNull();

        const confirmRes = await POST(
            jsonRequest({ previewId: preview.previewId, confirm: true }),
            CTX,
        );
        expect(confirmRes.status).toBe(200);

        const confirmed = await confirmRes.json();
        expect(confirmed).toEqual({ success: true, created: 2 });
        expect(prisma.workout.create).toHaveBeenCalledTimes(2);
        expect(createSnapshot).toHaveBeenCalledWith('goal-1', 'Before CSV import', 'csv_import');

        // the preview is consumed on confirm
        expect(getPreview(preview.previewId)).toBeNull();
    });

    it('rejects uploads above the 5MB byte cap with a 413 before parsing', async () => {
        const bigCsv = 'x'.repeat(5 * 1024 * 1024 + 1);
        const res = await upload(bigCsv);

        expect(res.status).toBe(413);
        const body = await res.json();
        expect(body.error).toContain('5MB');
        expect(prisma.workout.create).not.toHaveBeenCalled();
    });

    it('rejects CSVs above the 500-row cap with a 413 and stores no preview', async () => {
        const res = await upload(runflowCsv(501));

        expect(res.status).toBe(413);
        const body = await res.json();
        expect(body.error).toContain('500');
        expect(prisma.workout.create).not.toHaveBeenCalled();
        expect(createSnapshot).not.toHaveBeenCalled();
    });

    it('accepts a 500-row CSV at the boundary (legitimate payload)', async () => {
        const res = await upload(runflowCsv(500));

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.validRows).toBe(500);
        expect(getPreview(body.previewId)).not.toBeNull();
    });

    it('bounds retained previews per user (oldest evicted)', async () => {
        const previewIds: string[] = [];
        for (let i = 0; i < 6; i++) {
            const res = await upload(runflowCsv(1));
            expect(res.status).toBe(200);
            previewIds.push((await res.json()).previewId);
        }

        // the first preview of this user was evicted by the later uploads
        const staleRes = await POST(jsonRequest({ previewId: previewIds[0], confirm: true }), CTX);
        expect(staleRes.status).toBe(404);

        // the newest preview still confirms
        const freshRes = await POST(jsonRequest({ previewId: previewIds[5], confirm: true }), CTX);
        expect(freshRes.status).toBe(200);
        expect((await freshRes.json()).created).toBe(1);
    });

    it('keeps rejecting an empty file', async () => {
        const res = await upload('');
        expect(res.status).toBe(400);
    });
});
