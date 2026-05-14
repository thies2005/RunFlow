import { computeDuration, computeQualityDuration, workoutTypeToHrZone, getQualityFraction } from '../index';
import { WorkoutType } from '@/generated/prisma/browser';

describe('computeDuration', () => {
    it('calculates duration from distance and pace', () => {
        expect(computeDuration(10000, 300)).toBe(3000);
    });

    it('returns 0 for zero distance', () => {
        expect(computeDuration(0, 300)).toBe(0);
    });

    it('returns 0 for zero pace', () => {
        expect(computeDuration(10000, 0)).toBe(0);
    });

    it('returns 0 for negative distance', () => {
        expect(computeDuration(-1000, 300)).toBe(0);
    });

    it('returns 0 for negative pace', () => {
        expect(computeDuration(10000, -300)).toBe(0);
    });

    it('handles fractional km correctly', () => {
        expect(computeDuration(5000, 360)).toBe(1800);
    });

    it('rounds to nearest second', () => {
        expect(computeDuration(3333, 300)).toBe(1000);
    });
});

describe('computeQualityDuration', () => {
    it('calculates blended duration for intervals', () => {
        const result = computeQualityDuration(10000, 300, 360, 0.5);
        expect(result).toBe(3300);
    });

    it('returns 0 for zero distance', () => {
        expect(computeQualityDuration(0, 300, 360, 0.5)).toBe(0);
    });

    it('returns 0 for negative distance', () => {
        expect(computeQualityDuration(-5000, 300, 360, 0.5)).toBe(0);
    });

    it('uses default quality fraction of 0.5', () => {
        const withDefault = computeQualityDuration(10000, 300, 360);
        const withExplicit = computeQualityDuration(10000, 300, 360, 0.5);
        expect(withDefault).toBe(withExplicit);
    });

    it('handles 100% quality fraction', () => {
        const result = computeQualityDuration(10000, 300, 360, 1.0);
        expect(result).toBe(3000);
    });

    it('handles 0% quality fraction', () => {
        const result = computeQualityDuration(10000, 300, 360, 0);
        expect(result).toBe(3600);
    });

    it('rounds result to nearest second', () => {
        const result = computeQualityDuration(7000, 270, 360, 0.35);
        expect(result).toBe(Math.round((7000 * 0.35 / 1000) * 270 + (7000 * 0.65 / 1000) * 360));
    });
});

describe('workoutTypeToHrZone', () => {
    it('maps RECOVERY to zone 1', () => {
        expect(workoutTypeToHrZone(WorkoutType.RECOVERY)).toBe(1);
    });

    it('maps EASY to zone 2', () => {
        expect(workoutTypeToHrZone(WorkoutType.EASY)).toBe(2);
    });

    it('maps LONG_RUN to zone 2', () => {
        expect(workoutTypeToHrZone(WorkoutType.LONG_RUN)).toBe(2);
    });

    it('maps TEMPO to zone 3', () => {
        expect(workoutTypeToHrZone(WorkoutType.TEMPO)).toBe(3);
    });

    it('maps FARTLEK to zone 4', () => {
        expect(workoutTypeToHrZone(WorkoutType.FARTLEK)).toBe(4);
    });

    it('maps INTERVALS to zone 4', () => {
        expect(workoutTypeToHrZone(WorkoutType.INTERVALS)).toBe(4);
    });

    it('maps REPETITIONS to zone 5', () => {
        expect(workoutTypeToHrZone(WorkoutType.REPETITIONS)).toBe(5);
    });

    it('maps RACE to zone 5', () => {
        expect(workoutTypeToHrZone(WorkoutType.RACE)).toBe(5);
    });

    it('returns undefined for RIDE', () => {
        expect(workoutTypeToHrZone(WorkoutType.RIDE)).toBeUndefined();
    });

    it('returns undefined for SWIM', () => {
        expect(workoutTypeToHrZone(WorkoutType.SWIM)).toBeUndefined();
    });

    it('returns undefined for STRENGTH', () => {
        expect(workoutTypeToHrZone(WorkoutType.STRENGTH)).toBeUndefined();
    });
});

describe('getQualityFraction', () => {
    it('returns 0.5 for INTERVALS', () => {
        expect(getQualityFraction(WorkoutType.INTERVALS)).toBe(0.5);
    });

    it('returns 0.35 for REPETITIONS', () => {
        expect(getQualityFraction(WorkoutType.REPETITIONS)).toBe(0.35);
    });

    it('returns 0.65 for TEMPO', () => {
        expect(getQualityFraction(WorkoutType.TEMPO)).toBe(0.65);
    });

    it('returns 0.45 for FARTLEK', () => {
        expect(getQualityFraction(WorkoutType.FARTLEK)).toBe(0.45);
    });

    it('returns 0.5 default for EASY', () => {
        expect(getQualityFraction(WorkoutType.EASY)).toBe(0.5);
    });
});
