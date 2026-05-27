import { resolveTrainingVdotForGoal, validateTrainingPaces } from '../plan-creation';

describe('resolveTrainingVdotForGoal', () => {
    it('returns currentVdot as trainingVdot when target time implies much higher VDOT', () => {
        const result = resolveTrainingVdotForGoal({
            currentVdot: 40,
            targetTime: 15 * 60,
            raceType: 'FIVE_K',
            hasFitnessBaseline: true,
        });

        expect(result.trainingVdot).toBe(40);
        expect(result.wasCapped).toBe(true);
        expect(result.targetVdot).toBeDefined();
        expect(result.targetVdot!).toBeGreaterThan(40);
    });

    it('does not cap when no independent fitness baseline exists', () => {
        const result = resolveTrainingVdotForGoal({
            currentVdot: 70,
            targetTime: 15 * 60,
            raceType: 'FIVE_K',
            hasFitnessBaseline: false,
        });

        expect(result.wasCapped).toBe(false);
        expect(result.trainingVdot).toBe(70);
    });

    it('returns currentVdot as trainingVdot for realistic target times', () => {
        const result = resolveTrainingVdotForGoal({
            currentVdot: 40,
            targetTime: 23 * 60,
            raceType: 'FIVE_K',
            hasFitnessBaseline: true,
        });

        expect(result.trainingVdot).toBe(40);
        expect(result.wasCapped).toBe(false);
        expect(result.targetVdot).toBeDefined();
        expect(result.targetVdot!).toBeGreaterThan(40);
        expect(result.targetVdot!).toBeLessThan(46);
    });

    it('returns currentVdot as trainingVdot when target time matches current fitness', () => {
        const result = resolveTrainingVdotForGoal({
            currentVdot: 43.4,
            targetTime: 6210,
            raceType: 'HALF_MARATHON',
            hasFitnessBaseline: true,
        });

        expect(result.trainingVdot).toBe(43.4);
        expect(result.wasCapped).toBe(false);
        expect(result.targetVdot).toBeDefined();
        expect(Math.abs(result.targetVdot! - 43.4)).toBeLessThan(1);
    });

    it('returns currentVdot as trainingVdot even when target time implies much higher VDOT with fitness baseline', () => {
        const result = resolveTrainingVdotForGoal({
            currentVdot: 43.4,
            targetTime: 4800,
            raceType: 'HALF_MARATHON',
            hasFitnessBaseline: true,
        });

        expect(result.trainingVdot).toBe(43.4);
        expect(result.wasCapped).toBe(true);
    });

    it('returns currentVdot when no target time provided', () => {
        const result = resolveTrainingVdotForGoal({
            currentVdot: 50,
            targetTime: null,
            raceType: 'FIVE_K',
            hasFitnessBaseline: true,
        });

        expect(result.trainingVdot).toBe(50);
        expect(result.wasCapped).toBe(false);
    });

    it('returns currentVdot as trainingVdot when currentVdot is 0', () => {
        const result = resolveTrainingVdotForGoal({
            currentVdot: 0,
            targetTime: 25 * 60,
            raceType: 'FIVE_K',
            hasFitnessBaseline: true,
        });
        expect(result.trainingVdot).toBe(0);
    });
});

describe('validateTrainingPaces', () => {
    it('returns valid for matching VDOT', () => {
        const result = validateTrainingPaces({
            trainingVdot: 43.4,
            raceType: 'HALF_MARATHON',
            targetTime: 6210,
        });

        expect(result.isValid).toBe(true);
        expect(result.warnings).toEqual([]);
    });

    it('returns warnings when easy pace is faster than race pace', () => {
        const result = validateTrainingPaces({
            trainingVdot: 57.5,
            raceType: 'HALF_MARATHON',
            targetTime: 6210,
        });

        expect(result.isValid).toBe(false);
        expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('returns valid when no raceType or targetTime', () => {
        const result = validateTrainingPaces({
            trainingVdot: 50,
            raceType: null,
            targetTime: null,
        });

        expect(result.isValid).toBe(true);
        expect(result.warnings).toEqual([]);
    });

    it('returns warnings without clamping VDOT when validation fails', () => {
        const result = validateTrainingPaces({
            trainingVdot: 57.5,
            raceType: 'HALF_MARATHON',
            targetTime: 6210,
        });

        expect(result.isValid).toBe(false);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.clampedVdot).toBeUndefined();
    });

    it('validateTrainingPaces handles raceType with no targetTime', () => {
        const result = validateTrainingPaces({
            trainingVdot: 50,
            raceType: 'HALF_MARATHON',
            targetTime: null,
        });
        expect(result.isValid).toBe(true);
        expect(result.warnings).toEqual([]);
    });
});
