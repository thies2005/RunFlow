import { recalculateWorkoutPaces } from '../recalculate-paces';
import { prisma } from '@/lib/db';
import { deriveMissingField, checkFieldConsistency } from '../validate-workout';

jest.mock('@/lib/db', () => ({
    prisma: {
        workout: {
            findMany: jest.fn(),
            update: jest.fn(),
        },
        goal: {
            update: jest.fn(),
        },
        $executeRaw: jest.fn(),
    },
}));

const mockPrisma = prisma as unknown as {
    workout: { findMany: jest.Mock; update: jest.Mock };
    goal: { update: jest.Mock };
    $executeRaw: jest.Mock;
};

describe('recalculateWorkoutPaces & Swim Duration Math', () => {
    const GOAL_ID = 'goal-swim-1';

    beforeEach(() => {
        jest.clearAllMocks();
        mockPrisma.workout.findMany.mockResolvedValue([]);
        mockPrisma.workout.update.mockResolvedValue({});
        mockPrisma.goal.update.mockResolvedValue({});
        mockPrisma.$executeRaw.mockResolvedValue(1);
    });

    it('executes SQL with 100m divisor for swim types and 1000m for other types', async () => {
        await recalculateWorkoutPaces(GOAL_ID, 45);

        expect(mockPrisma.$executeRaw).toHaveBeenCalled();
        const callArgs = mockPrisma.$executeRaw.mock.calls[0];
        // Prisma $executeRaw tagged template literal has strings array in first arg
        const sqlParts = callArgs[0];
        const rawSql = Array.isArray(sqlParts) ? sqlParts.join(' ') : String(sqlParts);

        expect(rawSql).toContain('"workoutType" IN (\'SWIM\', \'SWIM_DRILL\', \'OPEN_WATER_SWIM\')');
        expect(rawSql).toContain('("targetDistance" / 100.0) * "targetPace"');
        expect(rawSql).toContain('("targetDistance" / 1000.0) * "targetPace"');
    });

    describe('deriveMissingField swim vs non-swim duration math', () => {
        it('calculates correct duration for SWIM (distance / 100 * pace)', () => {
            // 1500m swim at 120s / 100m (2:00/100m) should be 1800s (30 min), NOT 180s (3 min)
            const swimResult = deriveMissingField({
                targetDistance: 1500,
                targetPace: 120,
                workoutType: 'SWIM',
            });
            expect(swimResult.targetDuration).toBe(1800);

            const swimDrillResult = deriveMissingField({
                targetDistance: 800,
                targetPace: 135,
                workoutType: 'SWIM_DRILL',
            });
            expect(swimDrillResult.targetDuration).toBe(Math.round((800 / 100) * 135));

            const owsResult = deriveMissingField({
                targetDistance: 2000,
                targetPace: 110,
                workoutType: 'OPEN_WATER_SWIM',
            });
            expect(owsResult.targetDuration).toBe(Math.round((2000 / 100) * 110));
        });

        it('calculates correct duration for RUN (distance / 1000 * pace)', () => {
            // 10000m (10k) run at 300s/km (5:00/km) should be 3000s (50 min)
            const runResult = deriveMissingField({
                targetDistance: 10000,
                targetPace: 300,
                workoutType: 'EASY',
            });
            expect(runResult.targetDuration).toBe(3000);
        });

        it('checks field consistency correctly for SWIM without false warnings', () => {
            // 1500m at 120s/100m with 1800s duration is consistent
            const warnings = checkFieldConsistency({
                targetDistance: 1500,
                targetPace: 120,
                targetDuration: 1800,
                workoutType: 'SWIM',
            });
            expect(warnings).toHaveLength(0);

            // Contradictory duration (e.g. 180s instead of 1800s) should trigger a warning
            const badWarnings = checkFieldConsistency({
                targetDistance: 1500,
                targetPace: 120,
                targetDuration: 180,
                workoutType: 'SWIM',
            });
            expect(badWarnings).toHaveLength(1);
            expect(badWarnings[0].field).toBe('targetDuration');
            expect(badWarnings[0].impliedValue).toBe(1800);
        });
    });
});
