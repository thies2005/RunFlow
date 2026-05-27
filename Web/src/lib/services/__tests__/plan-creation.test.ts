jest.mock('@/lib/db', () => ({
    prisma: {
        activity: {
            findFirst: jest.fn(),
            findMany: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
        },
    },
}));

import { prisma } from '@/lib/db';
import { analyzeRace } from '../../metrics/vdot';
import { AnalyticsService } from '../analytics';
import { resolveTrainingVdotForGoal, resolveVdot, validateTrainingPaces } from '../plan-creation';

const mockedPrisma = prisma as unknown as {
    activity: {
        findFirst: jest.Mock;
        findMany: jest.Mock;
    };
    user: {
        findUnique: jest.Mock;
    };
};

beforeEach(() => {
    jest.clearAllMocks();
});

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

describe('resolveVdot', () => {
    it('does not apply stored VO2 correction to target-time VDOT fallback', async () => {
        mockedPrisma.user.findUnique.mockResolvedValue({ vdotCorrectionFactor: 1.2 });

        const result = await resolveVdot({
            userId: 'user-1',
            raceType: 'HALF_MARATHON',
            targetTime: 6210,
            useActivityVdot: false,
        });
        const expected = analyzeRace({ distance: 'HALF', timeSeconds: 6210 }).vdot;

        expect(result.currentVdot).toBe(expected);
        expect(result.vdotFromActivities).toBe(false);
        expect(result.vdotConfidence).toBe('low');
        expect(mockedPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('uses form HR and correction overrides for activity VDOT instead of stale stored profile values', async () => {
        mockedPrisma.activity.findFirst.mockResolvedValue(null);
        mockedPrisma.user.findUnique.mockResolvedValue({
            hrMax: 150,
            vdotCorrectionFactor: 1.4,
        });
        mockedPrisma.activity.findMany.mockResolvedValue([{
            startDate: new Date('2026-05-01'),
            distance: 10000,
            movingTime: 3000,
            averageHr: 150,
            hasHeartrate: true,
        }]);
        const spy = jest.spyOn(AnalyticsService, 'calculateVO2max')
            .mockReturnValue({ rawVO2max: 40, effectiveVO2max: 42 });

        const result = await resolveVdot({
            userId: 'user-1',
            raceType: 'HALF_MARATHON',
            useActivityVdot: true,
            maxHeartRate: 190,
            vdotCorrectionFactor: 0.9,
        });

        expect(result.currentVdot).toBe(42);
        expect(result.vdotFromActivities).toBe(true);
        expect(spy).toHaveBeenCalledWith(expect.any(Array), 190, 0.9);

        spy.mockRestore();
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
