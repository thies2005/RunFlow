import {
    calculateWorkoutCompliance,
    calculateWeeklyCompliance,
    evaluateRatio,
} from '../compliance';

describe('Compliance Calculator (compliance.ts)', () => {
    it('evaluates ratio into 3-color bands correctly', () => {
        // ON_TARGET (0.85 .. 1.15) -> green
        expect(evaluateRatio(0.85)).toEqual({ status: 'ON_TARGET', color: 'green' });
        expect(evaluateRatio(1.00)).toEqual({ status: 'ON_TARGET', color: 'green' });
        expect(evaluateRatio(1.15)).toEqual({ status: 'ON_TARGET', color: 'green' });

        // DEVIATED (0.60 .. 0.85 or 1.15 .. 1.35) -> amber
        expect(evaluateRatio(0.60)).toEqual({ status: 'DEVIATED', color: 'amber' });
        expect(evaluateRatio(0.80)).toEqual({ status: 'DEVIATED', color: 'amber' });
        expect(evaluateRatio(1.20)).toEqual({ status: 'DEVIATED', color: 'amber' });
        expect(evaluateRatio(1.35)).toEqual({ status: 'DEVIATED', color: 'amber' });

        // OFF_TARGET (<0.60 or >1.35) -> red
        expect(evaluateRatio(0.55)).toEqual({ status: 'OFF_TARGET', color: 'red' });
        expect(evaluateRatio(1.40)).toEqual({ status: 'OFF_TARGET', color: 'red' });
    });

    it('correctly tags MISSED workouts for uncompleted past sessions', () => {
        const pastWorkout = {
            id: 'w-past',
            scheduledDate: '2026-10-20',
            isCompleted: false,
            plannedTss: 50,
        };

        const result = calculateWorkoutCompliance(pastWorkout, '2026-10-25');
        expect(result.status).toBe('MISSED');
        expect(result.color).toBe('red');
    });

    it('tags PENDING for uncompleted future sessions', () => {
        const futureWorkout = {
            id: 'w-future',
            scheduledDate: '2026-10-30',
            isCompleted: false,
            plannedTss: 60,
        };

        const result = calculateWorkoutCompliance(futureWorkout, '2026-10-25');
        expect(result.status).toBe('PENDING');
        expect(result.color).toBe('gray');
    });

    it('tags COMPLETED_UNLINKED when completed without linked activity or stats', () => {
        const completedNoLink = {
            id: 'w-done',
            scheduledDate: '2026-10-24',
            isCompleted: true,
            linkedActivityId: null,
            plannedTss: 45,
        };

        const result = calculateWorkoutCompliance(completedNoLink, '2026-10-25');
        expect(result.status).toBe('COMPLETED_UNLINKED');
        expect(result.color).toBe('green');
    });

    it('evaluates weekly aggregate compliance and 3-color status', () => {
        const weekWorkouts = [
            {
                id: 'w1',
                scheduledDate: '2026-10-26',
                isCompleted: true,
                plannedTss: 50,
                actualTss: 48,
                targetDistanceKm: 10,
                actualDistanceKm: 9.8,
            },
            {
                id: 'w2',
                scheduledDate: '2026-10-28',
                isCompleted: true,
                plannedTss: 70,
                actualTss: 68,
                targetDistanceKm: 14,
                actualDistanceKm: 13.5,
            },
            {
                id: 'w3',
                scheduledDate: '2026-10-31',
                isCompleted: true,
                plannedTss: 100,
                actualTss: 92,
                targetDistanceKm: 20,
                actualDistanceKm: 19.0,
            },
        ];

        const aggregate = calculateWeeklyCompliance(weekWorkouts, '2026-11-01');
        expect(aggregate.plannedTss).toBe(220);
        expect(aggregate.actualTss).toBe(208);
        expect(aggregate.complianceRatio).toBeCloseTo(208 / 220, 2); // ~0.95
        expect(aggregate.compliancePct).toBe(95);
        expect(aggregate.status).toBe('ON_TARGET');
        expect(aggregate.statusColor).toBe('green');
        expect(aggregate.completedCount).toBe(3);
    });
});
