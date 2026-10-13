import { bestEffortVdot, BEST_EFFORT_VDOT_LOOKBACK_DAYS, BEST_EFFORT_VDOT_MIN_DISTANCE_M, BEST_EFFORT_VDOT_MIN_VDOT } from '../effectiveVdot';
import { calculateVdot } from '../vdot';

const DAY_MS = 24 * 60 * 60 * 1000;

const makeRun = (daysAgo: number, distance: number, movingTime: number, type: string = 'RUN') => ({
    startDate: new Date(Date.now() - daysAgo * DAY_MS),
    distance,
    movingTime,
    type,
});

describe('bestEffortVdot', () => {
    describe('known performances', () => {
        it('computes VDOT for 5 km in 20:00 consistent with calculateVdot', () => {
            const result = bestEffortVdot([makeRun(1, 5000, 1200)]);
            expect(result).toBe(calculateVdot({ distance: 5000, timeSeconds: 1200 }));
        });

        it('computes VDOT for 10 km in 42:00 consistent with calculateVdot', () => {
            const result = bestEffortVdot([makeRun(1, 10000, 2520)]);
            expect(result).toBe(calculateVdot({ distance: 10000, timeSeconds: 2520 }));
        });

        it('returns the BEST effort (max), not the most recent', () => {
            // 5 km in 20:00 (VDOT ~49.8) is a stronger performance than
            // 10 km in 45:00 (VDOT ~45.3)
            const best5k = calculateVdot({ distance: 5000, timeSeconds: 1200 });
            const weaker10k = calculateVdot({ distance: 10000, timeSeconds: 2700 });
            expect(best5k).toBeGreaterThan(weaker10k);

            const result = bestEffortVdot([
                makeRun(1, 5000, 1200),   // stronger, older
                makeRun(0, 10000, 2700),  // weaker, most recent
            ]);
            expect(result).toBe(best5k);
        });

        it('applies the vdotCorrectionFactor after taking the max', () => {
            const best = calculateVdot({ distance: 10000, timeSeconds: 2520 });
            const result = bestEffortVdot([makeRun(1, 10000, 2520)], 1.1);
            expect(result).toBeCloseTo(best * 1.1, 10);

            expect(bestEffortVdot([makeRun(1, 10000, 2520)], 0.95)).toBeCloseTo(best * 0.95, 10);
        });
    });

    describe('filters', () => {
        it('excludes runs shorter than 5 km', () => {
            const qualifying = makeRun(1, 5000, 1200);
            const result = bestEffortVdot([
                makeRun(1, BEST_EFFORT_VDOT_MIN_DISTANCE_M - 1, 1200), // 4.999 km, fast
                qualifying,
            ]);
            expect(result).toBe(calculateVdot({ distance: 5000, timeSeconds: 1200 }));
        });

        it('excludes runs older than 90 days', () => {
            const result = bestEffortVdot([
                makeRun(BEST_EFFORT_VDOT_LOOKBACK_DAYS + 1, 10000, 2520), // very fast, but too old
            ]);
            expect(result).toBe(0);
        });

        it('keeps runs inside the 90-day window', () => {
            const result = bestEffortVdot([
                makeRun(BEST_EFFORT_VDOT_LOOKBACK_DAYS - 1, 10000, 2520),
            ]);
            expect(result).toBe(calculateVdot({ distance: 10000, timeSeconds: 2520 }));
        });

        it('excludes runs with movingTime <= 0', () => {
            expect(bestEffortVdot([makeRun(1, 10000, 0)])).toBe(0);
        });

        it('excludes computed VDOTs <= 20 (mirrors Android)', () => {
            // 5 km in 60 min -> VDOT ~12.7, below the floor
            const slowVdot = calculateVdot({ distance: 5000, timeSeconds: 3600 });
            expect(slowVdot).toBeLessThanOrEqual(BEST_EFFORT_VDOT_MIN_VDOT);

            const result = bestEffortVdot([
                makeRun(1, 5000, 3600), // too slow to qualify
                makeRun(2, 5000, 1500), // qualifies (~35 min 5k)
            ]);
            expect(result).toBe(calculateVdot({ distance: 5000, timeSeconds: 1500 }));
        });

        it('excludes non-running activities', () => {
            const result = bestEffortVdot([
                makeRun(1, 40000, 5400, 'RIDE'),    // fast bike, would give a huge "VDOT"
                makeRun(1, 1500, 1600, 'SWIM'),
                makeRun(1, 10000, 2520, 'RUN'),
            ]);
            expect(result).toBe(calculateVdot({ distance: 10000, timeSeconds: 2520 }));
        });

        it('returns 0 for empty input', () => {
            expect(bestEffortVdot([])).toBe(0);
        });

        it('returns 0 when nothing qualifies (no correction applied to a meaningless value)', () => {
            expect(bestEffortVdot([makeRun(1, 5000, 3600)], 1.2)).toBe(0);
        });

        it('treats a missing type as non-running', () => {
            expect(bestEffortVdot([{ startDate: new Date(), distance: 10000, movingTime: 2520 }])).toBe(0);
        });
    });
});
