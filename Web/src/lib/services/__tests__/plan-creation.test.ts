import { resolveTrainingVdotForGoal } from '../plan-creation';

describe('plan creation guardrails', () => {
    it('caps training VDOT when target time is beyond safe progression from a fitness baseline', () => {
        const result = resolveTrainingVdotForGoal({
            currentVdot: 40,
            targetTime: 15 * 60,
            raceType: 'FIVE_K',
            hasFitnessBaseline: true,
        });

        expect(result.wasCapped).toBe(true);
        expect(result.trainingVdot).toBe(46);
        expect(result.targetVdot).toBeGreaterThan(46);
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

    it('does not cap realistic target times but scales progressively', () => {
        const result = resolveTrainingVdotForGoal({
            currentVdot: 40,
            targetTime: 23 * 60, // VDOT for 23:00 5K is around 42.6
            raceType: 'FIVE_K',
            hasFitnessBaseline: true,
        });

        expect(result.wasCapped).toBe(false);
        expect(result.trainingVdot).toBeGreaterThan(40);
        expect(result.trainingVdot).toBeLessThan(46); // Cap is 40 * 1.15 = 46
    });
});
