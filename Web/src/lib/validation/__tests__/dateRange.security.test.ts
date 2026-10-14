import { parseBoundedDateRange } from '../dateRange';
import {
    MAX_FLATTENED_STEPS,
    countExpandedSteps,
    flattenStructuredWorkout,
    structuredWorkoutV2Schema,
    type StructuredWorkoutV2,
    type StepNode,
} from '@/lib/plans/structured';

describe('SEC-5: dateRange and resource-exhaustion security tests', () => {
    describe('parseBoundedDateRange', () => {
        it('rejects null, undefined, or empty date strings', () => {
            expect(parseBoundedDateRange(null, '2026-10-14')).toEqual({
                ok: false,
                error: 'startDate and endDate are required',
            });
            expect(parseBoundedDateRange('2026-10-14', undefined)).toEqual({
                ok: false,
                error: 'startDate and endDate are required',
            });
            expect(parseBoundedDateRange('', '')).toEqual({
                ok: false,
                error: 'startDate and endDate are required',
            });
        });

        it('rejects non-YYYY-MM-DD formats', () => {
            expect(parseBoundedDateRange('invalid-date', '2026-10-14')).toEqual({
                ok: false,
                error: 'Dates must be in YYYY-MM-DD format',
            });
            expect(parseBoundedDateRange('2026/10/14', '2026/10/15')).toEqual({
                ok: false,
                error: 'Dates must be in YYYY-MM-DD format',
            });
        });

        it('rejects when endDate is before startDate', () => {
            const res = parseBoundedDateRange('2026-10-14', '2026-10-10');
            expect(res.ok).toBe(false);
            expect(res.error).toBe('endDate must be on or after startDate');
        });

        it('rejects unbounded date ranges exceeding maxDays (e.g. 0001-01-01 to 9999-12-31 or >366 days)', () => {
            const extremeRes = parseBoundedDateRange('0001-01-01', '9999-12-31', 366);
            expect(extremeRes.ok).toBe(false);
            expect(extremeRes.error).toMatch(/Date range cannot exceed 366 days/);

            const twoYearsRes = parseBoundedDateRange('2024-01-01', '2026-01-01', 366);
            expect(twoYearsRes.ok).toBe(false);
            expect(twoYearsRes.error).toBe('Date range cannot exceed 366 days');
        });

        it('accepts valid bounded date ranges within maxDays', () => {
            const valid = parseBoundedDateRange('2026-01-01', '2026-03-31', 366);
            expect(valid.ok).toBe(true);
            expect(valid.totalDays).toBeGreaterThan(0);
            expect(valid.totalDays).toBeLessThanOrEqual(91);
            expect(valid.start).toBeDefined();
            expect(valid.end).toBeDefined();
        });

        it('supports custom maxDays (e.g. 730 for history)', () => {
            const validTwoYear = parseBoundedDateRange('2024-01-01', '2025-12-30', 730);
            expect(validTwoYear.ok).toBe(true);
            expect(validTwoYear.totalDays).toBeLessThanOrEqual(730);

            const invalidThreeYear = parseBoundedDateRange('2023-01-01', '2026-01-01', 730);
            expect(invalidThreeYear.ok).toBe(false);
            expect(invalidThreeYear.error).toBe('Date range cannot exceed 730 days');
        });
    });

    describe('MAX_FLATTENED_STEPS cap in StructuredWorkoutV2', () => {
        it('exports MAX_FLATTENED_STEPS = 500', () => {
            expect(MAX_FLATTENED_STEPS).toBe(500);
        });

        it('rejects schema validation for nested repeat groups expanding beyond 500 steps', () => {
            // A 2-level nested repeat: 50 outer * 50 inner = 2,500 steps
            const maliciousWorkout: StructuredWorkoutV2 = {
                version: 2,
                source: 'editor',
                steps: [
                    {
                        kind: 'repeat',
                        times: 50,
                        steps: [
                            {
                                kind: 'repeat',
                                times: 50,
                                steps: [
                                    {
                                        kind: 'work',
                                        duration: { type: 'distance', meters: 400 },
                                    },
                                ],
                            },
                        ],
                    },
                ],
            };

            const parseResult = structuredWorkoutV2Schema.safeParse(maliciousWorkout);
            expect(parseResult.success).toBe(false);
            if (!parseResult.success) {
                const msgs = parseResult.error.issues.map(e => e.message);
                expect(msgs.some(m => m.includes('Expanded step count must not exceed 500'))).toBe(true);
            }
        });

        it('truncates flattened steps to MAX_FLATTENED_STEPS in flattenStructuredWorkout', () => {
            const largeWorkout: StructuredWorkoutV2 = {
                version: 2,
                source: 'editor',
                steps: [
                    {
                        kind: 'repeat',
                        times: 100,
                        steps: [
                            { kind: 'work', duration: { type: 'distance', meters: 100 } },
                            { kind: 'recovery', duration: { type: 'distance', meters: 100 } },
                            { kind: 'work', duration: { type: 'distance', meters: 100 } },
                            { kind: 'recovery', duration: { type: 'distance', meters: 100 } },
                            { kind: 'work', duration: { type: 'distance', meters: 100 } },
                            { kind: 'recovery', duration: { type: 'distance', meters: 100 } },
                            { kind: 'work', duration: { type: 'distance', meters: 100 } },
                            { kind: 'recovery', duration: { type: 'distance', meters: 100 } },
                        ],
                    },
                ],
            };

            const flattened = flattenStructuredWorkout(largeWorkout);
            expect(flattened.length).toBeLessThanOrEqual(MAX_FLATTENED_STEPS);
            expect(flattened.length).toBe(MAX_FLATTENED_STEPS);
        });

        it('accurately counts expanded steps with countExpandedSteps', () => {
            const steps: StepNode[] = [
                { kind: 'warmup', duration: { type: 'time', seconds: 600 } },
                {
                    kind: 'repeat',
                    times: 5,
                    setRest: { type: 'time', seconds: 60 },
                    steps: [
                        { kind: 'work', duration: { type: 'distance', meters: 800 } },
                        { kind: 'recovery', duration: { type: 'time', seconds: 120 } },
                    ],
                },
                { kind: 'cooldown', duration: { type: 'time', seconds: 600 } },
            ];
            // 1 warmup + (2 steps * 5 reps = 10) + (4 setRests) + 1 cooldown = 16 steps
            expect(countExpandedSteps(steps)).toBe(16);
        });
    });

    describe('Plan horizon bounds', () => {
        it('validates 104-week horizon calculation', () => {
            const MAX_PLAN_HORIZON_DAYS = 104 * 7;
            const now = new Date('2026-10-14T00:00:00.000Z');

            // 100 weeks out is valid
            const validDate = new Date(now.getTime() + 100 * 7 * 24 * 60 * 60 * 1000);
            const validDays = (validDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
            expect(validDays <= MAX_PLAN_HORIZON_DAYS).toBe(true);

            // 105 weeks out is invalid
            const invalidDate = new Date(now.getTime() + 105 * 7 * 24 * 60 * 60 * 1000);
            const invalidDays = (invalidDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
            expect(invalidDays > MAX_PLAN_HORIZON_DAYS).toBe(true);
        });
    });
});
