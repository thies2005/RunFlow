import { createSnapshot, restoreFromSnapshot } from '../snapshot';
import { prisma } from '@/lib/db';

jest.mock('@/lib/db', () => {
    const tx = {
        workout: {
            deleteMany: jest.fn(),
            create: jest.fn(),
        },
    };
    return {
        prisma: {
            workout: {
                findMany: jest.fn(),
                deleteMany: jest.fn(),
                create: jest.fn(),
            },
            planSnapshot: {
                create: jest.fn(),
                count: jest.fn(),
                findMany: jest.fn(),
                findUnique: jest.fn(),
                findFirst: jest.fn(),
                deleteMany: jest.fn(),
            },
            $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) => cb(tx)),
            _tx: tx,
        },
    };
});

const mockPrisma = prisma as unknown as {
    workout: { findMany: jest.Mock; deleteMany: jest.Mock; create: jest.Mock };
    planSnapshot: {
        create: jest.Mock;
        count: jest.Mock;
        findMany: jest.Mock;
        findUnique: jest.Mock;
        findFirst: jest.Mock;
        deleteMany: jest.Mock;
    };
    $transaction: jest.Mock;
    _tx: { workout: { deleteMany: jest.Mock; create: jest.Mock } };
};

describe('Plan Snapshot Service', () => {
    const GOAL_ID = 'goal-123';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createSnapshot', () => {
        it('includes all Workout fields in select and stores serialized snapshot', async () => {
            const mockWorkouts = [
                {
                    id: 'w-1',
                    scheduledDate: new Date('2026-06-01T08:00:00Z'),
                    workoutType: 'RIDE',
                    description: 'Sweet spot intervals',
                    displayDesc: '4x10min SS',
                    phase: 'BUILD',
                    order: 1,
                    notes: 'Cadence 90rpm',
                    targetDistance: 40000,
                    targetDuration: 3600,
                    targetPace: null,
                    targetPaceMinSecondsPerKm: null,
                    targetPaceMaxSecondsPerKm: null,
                    targetPaceZoneLabel: null,
                    targetHrZone: 4,
                    targetHrMinBpm: 155,
                    targetHrMaxBpm: 168,
                    targetHrZoneLabel: 'Threshold',
                    targetPowerWatts: 240,
                    targetPowerMinWatts: 230,
                    targetPowerMaxWatts: 250,
                    targetPowerZone: 4,
                    targetFtpPercent: 90,
                    targetCadenceRpm: 90,
                    targetRpe: 7,
                    intensityZone: 'Z4',
                    plannedTss: 65,
                    sport: 'RIDE',
                    isCompleted: true,
                    completedAt: new Date('2026-06-01T09:15:00Z'),
                    linkedActivityId: 'act-99',
                    customName: 'Morning Ride',
                    color: '#3b82f6',
                    structuredSteps: { steps: [] },
                    groupId: 'grp-1',
                    subGoalId: 'sub-1',
                    intervalProgressionId: 'prog-1',
                },
            ];

            mockPrisma.workout.findMany.mockResolvedValue(mockWorkouts);
            mockPrisma.planSnapshot.create.mockImplementation(({ data }) =>
                Promise.resolve({ id: 'snap-1', ...data, createdAt: new Date() }),
            );
            mockPrisma.planSnapshot.count.mockResolvedValue(5);

            const result = await createSnapshot(GOAL_ID, 'Test snapshot', 'manual');

            expect(mockPrisma.workout.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { goalId: GOAL_ID },
                    select: expect.objectContaining({
                        id: true,
                        isCompleted: true,
                        completedAt: true,
                        linkedActivityId: true,
                        targetPowerMinWatts: true,
                        targetPowerMaxWatts: true,
                        sport: true,
                        customName: true,
                        color: true,
                    }),
                }),
            );

            expect(mockPrisma.planSnapshot.create).toHaveBeenCalledWith({
                data: {
                    goalId: GOAL_ID,
                    snapshot: mockWorkouts,
                    description: 'Test snapshot',
                    operation: 'manual',
                },
            });

            expect(result.id).toBe('snap-1');
        });

        it('filters out coaching_summary when pruning snapshots over 50', async () => {
            mockPrisma.workout.findMany.mockResolvedValue([]);
            mockPrisma.planSnapshot.create.mockResolvedValue({ id: 'snap-51' });
            mockPrisma.planSnapshot.count.mockResolvedValue(52);
            mockPrisma.planSnapshot.findMany.mockResolvedValue([{ id: 'snap-1' }, { id: 'snap-2' }]);
            mockPrisma.planSnapshot.deleteMany.mockResolvedValue({ count: 2 });

            await createSnapshot(GOAL_ID, 'Pruning test');

            expect(mockPrisma.planSnapshot.count).toHaveBeenCalledWith({
                where: {
                    goalId: GOAL_ID,
                    OR: [{ operation: null }, { operation: { not: 'coaching_summary' } }],
                },
            });

            expect(mockPrisma.planSnapshot.findMany).toHaveBeenCalledWith({
                where: {
                    goalId: GOAL_ID,
                    OR: [{ operation: null }, { operation: { not: 'coaching_summary' } }],
                },
                orderBy: { createdAt: 'asc' },
                take: 2,
                select: { id: true },
            });

            expect(mockPrisma.planSnapshot.deleteMany).toHaveBeenCalledWith({
                where: { id: { in: ['snap-1', 'snap-2'] } },
            });
        });
    });

    describe('restoreFromSnapshot', () => {
        it('queries latest snapshot filtering out coaching_summary when snapshotId is omitted', async () => {
            mockPrisma.planSnapshot.findFirst.mockResolvedValue({
                id: 'snap-latest',
                snapshot: [],
            });

            await restoreFromSnapshot(GOAL_ID);

            expect(mockPrisma.planSnapshot.findFirst).toHaveBeenCalledWith({
                where: {
                    goalId: GOAL_ID,
                    OR: [{ operation: null }, { operation: { not: 'coaching_summary' } }],
                },
                orderBy: { createdAt: 'desc' },
            });
        });

        it('scopes query by goalId when snapshotId is provided to prevent cross-goal IDOR', async () => {
            mockPrisma.planSnapshot.findFirst.mockResolvedValue({
                id: 'snap-specific',
                snapshot: [],
            });

            await restoreFromSnapshot(GOAL_ID, 'snap-specific');

            expect(mockPrisma.planSnapshot.findFirst).toHaveBeenCalledWith({
                where: {
                    goalId: GOAL_ID,
                    id: 'snap-specific',
                    OR: [{ operation: null }, { operation: { not: 'coaching_summary' } }],
                },
                orderBy: { createdAt: 'desc' },
            });
        });

        it('throws when snapshot belongs to another goal or is not found', async () => {
            mockPrisma.planSnapshot.findFirst.mockResolvedValue(null);

            await expect(restoreFromSnapshot(GOAL_ID, 'foreign-snapshot')).rejects.toThrow('No snapshot found');

            expect(mockPrisma.planSnapshot.findFirst).toHaveBeenCalledWith({
                where: {
                    goalId: GOAL_ID,
                    id: 'foreign-snapshot',
                    OR: [{ operation: null }, { operation: { not: 'coaching_summary' } }],
                },
                orderBy: { createdAt: 'desc' },
            });
        });

        it('returns false and does NOT wipe workouts when snapshot data is not an array', async () => {
            mockPrisma.planSnapshot.findFirst.mockResolvedValue({
                id: 'snap-corrupt',
                snapshot: 'corrupt non-array data' as any,
            });

            const result = await restoreFromSnapshot(GOAL_ID, 'snap-corrupt');

            expect(result).toBe(false);
            expect(mockPrisma._tx.workout.deleteMany).not.toHaveBeenCalled();
            expect(mockPrisma._tx.workout.create).not.toHaveBeenCalled();
        });

        it('survives round-trip restoring isCompleted, linkedActivityId, targetPowerMinWatts, and sport', async () => {
            const serializedWorkouts = [
                {
                    id: 'w-recovered-1',
                    scheduledDate: '2026-06-01T08:00:00.000Z',
                    workoutType: 'RIDE',
                    description: 'Threshold intervals',
                    displayDesc: '4x10min',
                    phase: 'BUILD',
                    order: 0,
                    targetPowerWatts: 250,
                    targetPowerMinWatts: 240,
                    targetPowerMaxWatts: 260,
                    sport: 'RIDE',
                    isCompleted: true,
                    completedAt: '2026-06-01T09:30:00.000Z',
                    linkedActivityId: 'act-ride-123',
                    customName: 'Tuesday Power',
                    color: '#10b981',
                },
            ];

            mockPrisma.planSnapshot.findFirst.mockResolvedValue({
                id: 'snap-target',
                snapshot: serializedWorkouts,
            });

            const result = await restoreFromSnapshot(GOAL_ID, 'snap-target');

            expect(result).toEqual(expect.objectContaining({ id: 'snap-target' }));
            expect(mockPrisma.planSnapshot.findFirst).toHaveBeenCalledWith({
                where: {
                    goalId: GOAL_ID,
                    id: 'snap-target',
                    OR: [{ operation: null }, { operation: { not: 'coaching_summary' } }],
                },
                orderBy: { createdAt: 'desc' },
            });
            expect(mockPrisma._tx.workout.deleteMany).toHaveBeenCalledWith({
                where: { goalId: GOAL_ID },
            });

            expect(mockPrisma._tx.workout.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    id: 'w-recovered-1',
                    goalId: GOAL_ID,
                    workoutType: 'RIDE',
                    sport: 'RIDE',
                    isCompleted: true,
                    completedAt: new Date('2026-06-01T09:30:00.000Z'),
                    linkedActivityId: 'act-ride-123',
                    targetPowerMinWatts: 240,
                    targetPowerMaxWatts: 260,
                    customName: 'Tuesday Power',
                    color: '#10b981',
                }),
            });
        });
    });
});
