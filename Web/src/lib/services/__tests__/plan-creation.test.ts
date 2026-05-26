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

    it('does not cap realistic target times', () => {
        const result = resolveTrainingVdotForGoal({
            currentVdot: 50,
            targetTime: 20 * 60,
            raceType: 'FIVE_K',
            hasFitnessBaseline: true,
        });

        expect(result.wasCapped).toBe(false);
        expect(result.trainingVdot).toBe(50);
    });
});
