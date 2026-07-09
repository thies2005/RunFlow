import { adaptPlanAfterCompletion } from '../adapt';
import { recalculateWorkoutPaces } from '@/lib/plans/recalculate-paces';
import { calculateWeightedEffectiveVO2max } from '@/lib/metrics/runalyze';
import { prisma } from '@/lib/db';

// --- Mocks --------------------------------------------------------------------

jest.mock('@/lib/db', () => ({
    prisma: {
        goal: { findFirst: jest.fn() },
        workout: { findMany: jest.fn() },
        user: { findUnique: jest.fn() },
        activity: { findMany: jest.fn() },
        $transaction: jest.fn(),
    },
}));

jest.mock('@/lib/plans/recalculate-paces', () => ({
    recalculateWorkoutPaces: jest.fn(),
}));

jest.mock('@/lib/metrics/runalyze', () => ({
    calculateWeightedEffectiveVO2max: jest.fn(),
    // re-export type only consumers don't need the runtime value
}));

const mockPrisma = prisma as unknown as {
    goal: { findFirst: jest.Mock };
    workout: { findMany: jest.Mock };
    user: { findUnique: jest.Mock };
    activity: { findMany: jest.Mock };
    $transaction: jest.Mock;
};
const mockRecalculate = recalculateWorkoutPaces as jest.Mock;
const mockWeightedVdot = calculateWeightedEffectiveVO2max as jest.Mock;

const GOAL_ID = 'goal-1';
const USER_ID = 'user-1';

describe('adaptPlanAfterCompletion', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Default $transaction just runs the callback with no arg (module uses prisma internally).
        mockPrisma.$transaction.mockImplementation(async (cb: any) => cb());

        // Default user with a valid max HR + zones.
        mockPrisma.user.findUnique.mockResolvedValue({
            hrMax: 190,
            hrRest: 50,
            vdotCorrectionFactor: 1.0,
            thresholdHeartRate: 175,
            hrZone1Max: 130,
            hrZone2Max: 148,
            hrZone3Max: 160,
            hrZone4Max: 170,
            hrZone5Max: 178,
            hrZone6Max: 187,
        });
    });

    it('returns not-adapted when the goal is not found', async () => {
        mockPrisma.goal.findFirst.mockResolvedValue(null);

        const result = await adaptPlanAfterCompletion(GOAL_ID, USER_ID);

        expect(result).toEqual({
            adapted: false,
            reason: 'Goal not found',
            workoutsUpdated: 0,
        });
        expect(mockRecalculate).not.toHaveBeenCalled();
    });

    it('returns not-adapted when there are no future incomplete workouts', async () => {
        mockPrisma.goal.findFirst.mockResolvedValue({
            id: GOAL_ID,
            userId: USER_ID,
            currentVdot: 45,
            createdAt: new Date(),
        });
        // All workouts completed.
        mockPrisma.workout.findMany.mockResolvedValue([
            { id: 'w1', isCompleted: true, scheduledDate: new Date() },
            { id: 'w2', isCompleted: true, scheduledDate: new Date() },
        ]);

        const result = await adaptPlanAfterCompletion(GOAL_ID, USER_ID);

        expect(result.adapted).toBe(false);
        expect(result.reason).toBe('No future workouts to adapt');
        expect(mockRecalculate).not.toHaveBeenCalled();
        // Should short-circuit before querying activities.
        expect(mockPrisma.activity.findMany).not.toHaveBeenCalled();
    });

    it('returns not-adapted when there are no completed activities to estimate VDOT', async () => {
        mockPrisma.goal.findFirst.mockResolvedValue({
            id: GOAL_ID,
            userId: USER_ID,
            currentVdot: 45,
            createdAt: new Date(),
        });
        mockPrisma.workout.findMany.mockResolvedValue([
            { id: 'w1', isCompleted: true, scheduledDate: new Date() },
            { id: 'w2', isCompleted: false, scheduledDate: new Date() },
        ]);
        mockPrisma.activity.findMany.mockResolvedValue([]);

        const result = await adaptPlanAfterCompletion(GOAL_ID, USER_ID);

        expect(result.adapted).toBe(false);
        expect(result.reason).toBe('No completed activities to estimate VDOT');
        expect(mockRecalculate).not.toHaveBeenCalled();
    });

    it('returns not-adapted when VDOT change is below the threshold (< 2)', async () => {
        mockPrisma.goal.findFirst.mockResolvedValue({
            id: GOAL_ID,
            userId: USER_ID,
            currentVdot: 50,
            createdAt: new Date(),
        });
        mockPrisma.workout.findMany.mockResolvedValue([
            { id: 'w1', isCompleted: true, scheduledDate: new Date() },
            { id: 'w2', isCompleted: false, scheduledDate: new Date() },
        ]);
        mockPrisma.activity.findMany.mockResolvedValue([
            { startDate: new Date(), distance: 5000, movingTime: 1500, averageHr: 160, hasHeartrate: true, type: 'RUN' },
        ]);
        // Only +1 VDOT point -> below threshold.
        mockWeightedVdot.mockReturnValue(51);

        const result = await adaptPlanAfterCompletion(GOAL_ID, USER_ID);

        expect(result.adapted).toBe(false);
        expect(result.reason).toContain('threshold');
        expect(result.newVdot).toBe(51);
        expect(result.previousVdot).toBe(50);
        expect(mockRecalculate).not.toHaveBeenCalled();
    });

    it('re-derives future paces and returns adapted when VDOT shifts by >= 2', async () => {
        mockPrisma.goal.findFirst.mockResolvedValue({
            id: GOAL_ID,
            userId: USER_ID,
            currentVdot: 45,
            createdAt: new Date(),
        });
        mockPrisma.workout.findMany.mockResolvedValue([
            { id: 'w1', isCompleted: true, scheduledDate: new Date() },
            { id: 'w2', isCompleted: false, scheduledDate: new Date() },
            { id: 'w3', isCompleted: false, scheduledDate: new Date() },
        ]);
        mockPrisma.activity.findMany.mockResolvedValue([
            { startDate: new Date(), distance: 5000, movingTime: 1300, averageHr: 170, hasHeartrate: true, type: 'RUN' },
        ]);
        // +5 VDOT points -> above threshold.
        mockWeightedVdot.mockReturnValue(50);
        mockRecalculate.mockResolvedValue({ updatedCount: 2, skippedCount: 0, warnings: [] });

        const result = await adaptPlanAfterCompletion(GOAL_ID, USER_ID);

        expect(result.adapted).toBe(true);
        expect(result.workoutsUpdated).toBe(2);
        expect(result.newVdot).toBe(50);
        expect(result.previousVdot).toBe(45);

        // recalculateWorkoutPaces runs inside a transaction.
        expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
        expect(mockRecalculate).toHaveBeenCalledTimes(1);
        expect(mockRecalculate).toHaveBeenCalledWith(GOAL_ID, 50, expect.any(Object));
    });

    it('does not modify completed workouts (recalculateWorkoutPaces skip behavior)', async () => {
        // The recalculate-paces module filters `where: { goalId, isCompleted: false }`.
        // adapt.ts delegates all writes to it, so completed workouts are never touched.
        // Here we assert the contract: the adapt flow only ever calls recalculate
        // with (goalId, newVdot) and never performs its own workout.update on
        // completed rows.
        mockPrisma.goal.findFirst.mockResolvedValue({
            id: GOAL_ID,
            userId: USER_ID,
            currentVdot: 40,
            createdAt: new Date(),
        });
        mockPrisma.workout.findMany.mockResolvedValue([
            { id: 'done', isCompleted: true, scheduledDate: new Date() },
            { id: 'future', isCompleted: false, scheduledDate: new Date() },
        ]);
        mockPrisma.activity.findMany.mockResolvedValue([
            { startDate: new Date(), distance: 5000, movingTime: 1300, averageHr: 170, hasHeartrate: true, type: 'RUN' },
        ]);
        mockWeightedVdot.mockReturnValue(50); // +10
        mockRecalculate.mockResolvedValue({ updatedCount: 1, skippedCount: 1, warnings: [] });

        const result = await adaptPlanAfterCompletion(GOAL_ID, USER_ID);

        expect(result.adapted).toBe(true);
        expect(mockRecalculate).toHaveBeenCalledWith(GOAL_ID, 50, expect.any(Object));
        // adapt.ts itself performs no workout writes — prisma.workout has no
        // update mock and none is required for the flow to complete.
        expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('returns not-adapted when max HR is unavailable', async () => {
        mockPrisma.goal.findFirst.mockResolvedValue({
            id: GOAL_ID,
            userId: USER_ID,
            currentVdot: 45,
            createdAt: new Date(),
        });
        mockPrisma.workout.findMany.mockResolvedValue([
            { id: 'w2', isCompleted: false, scheduledDate: new Date() },
        ]);
        mockPrisma.user.findUnique.mockResolvedValue({
            hrMax: null,
            hrRest: null,
            vdotCorrectionFactor: null,
            thresholdHeartRate: null,
            hrZone1Max: null,
            hrZone2Max: null,
            hrZone3Max: null,
            hrZone4Max: null,
            hrZone5Max: null,
            hrZone6Max: null,
        });

        const result = await adaptPlanAfterCompletion(GOAL_ID, USER_ID);

        expect(result.adapted).toBe(false);
        expect(result.reason).toContain('max HR');
        expect(mockWeightedVdot).not.toHaveBeenCalled();
        expect(mockRecalculate).not.toHaveBeenCalled();
    });
});
