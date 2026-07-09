import { processWorkoutEmails, getTomorrowRange, formatDateInTz } from '../workoutEmail';

// --- Mocks -------------------------------------------------------------
// NOTE: jest.mock factories are hoisted above imports, so they cannot reference
// `const` variables declared later. Define the mock objects INSIDE the factory
// and reach them back via jest.requireMock.

const mockSendWorkoutReminderEmail = jest.fn();

jest.mock('../email', () => ({
    sendWorkoutReminderEmail: (...args: unknown[]) => mockSendWorkoutReminderEmail(...args),
}));

jest.mock('../logging/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

jest.mock('../db', () => ({
    prisma: {
        reminderSettings: {
            findMany: jest.fn(),
            update: jest.fn(),
        },
        workout: {
            findFirst: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
        },
    },
}));

// Reach the hoisted mock object back from the module registry.
const mockPrisma = jest.requireMock('../db').prisma;

// --- Helpers -------------------------------------------------------------

const NOW = new Date('2026-07-08T12:00:00Z'); // a fixed "now"

function settings(overrides: Partial<{
    userId: string;
    timezone: string;
    lastWorkoutEmailSent: Date | null;
}> = {}) {
    return {
        userId: overrides.userId ?? 'user-1',
        timezone: overrides.timezone ?? 'UTC',
        lastWorkoutEmailSent: overrides.lastWorkoutEmailSent ?? null,
        workoutEmailEnabled: true,
    };
}

function workout(overrides: Partial<{
    id: string;
    workoutType: string;
    customName: string | null;
    description: string;
    targetDistance: number | null;
    targetDuration: number | null;
    scheduledDate: Date;
}> = {}) {
    return {
        id: overrides.id ?? 'wk-1',
        workoutType: overrides.workoutType ?? 'EASY',
        customName: overrides.customName ?? null,
        description: overrides.description ?? 'Easy 5k',
        targetDistance: overrides.targetDistance ?? 5000,
        targetDuration: overrides.targetDuration ?? 1800,
        scheduledDate: overrides.scheduledDate ?? new Date('2026-07-09T10:00:00Z'),
    };
}

function user(overrides: { email?: string | null; emailVerified?: Date | null } = {}) {
    return {
        email: overrides.email ?? 'runner@example.com',
        // Use `in` so callers can explicitly pass `emailVerified: null`.
        emailVerified: 'emailVerified' in overrides ? overrides.emailVerified : new Date('2026-01-01T00:00:00Z'),
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    mockSendWorkoutReminderEmail.mockResolvedValue({ messageId: 'mock-id' });
    mockPrisma.reminderSettings.update.mockResolvedValue({});
});

// --- Tests -------------------------------------------------------------

describe('processWorkoutEmails', () => {
    it('sends an email and updates lastWorkoutEmailSent when a workout is scheduled tomorrow and not yet sent today', async () => {
        mockPrisma.reminderSettings.findMany.mockResolvedValue([settings()]);
        mockPrisma.workout.findFirst.mockResolvedValue(workout());
        mockPrisma.user.findUnique.mockResolvedValue(user());

        const result = await processWorkoutEmails({ now: NOW, appUrl: 'https://app.example.com' });

        expect(result).toEqual({ sent: 1, skipped: 0, errors: 0 });
        expect(mockSendWorkoutReminderEmail).toHaveBeenCalledTimes(1);
        expect(mockSendWorkoutReminderEmail).toHaveBeenCalledWith(
            'runner@example.com',
            expect.objectContaining({
                workoutType: 'EASY',
                appUrl: 'https://app.example.com',
            })
        );
        // Workout query used a range that falls on tomorrow
        expect(mockPrisma.workout.findFirst).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                goal: expect.objectContaining({ userId: 'user-1', isActive: true, deletedAt: null }),
            }),
        }));
        // lastWorkoutEmailSent updated
        expect(mockPrisma.reminderSettings.update).toHaveBeenCalledWith({
            where: { userId: 'user-1' },
            data: { lastWorkoutEmailSent: expect.any(Date) },
        });
    });

    it('skips when lastWorkoutEmailSent is already today (idempotency)', async () => {
        const todayInTz = formatDateInTz(NOW, 'UTC');
        // Construct a Date that falls on the same YYYY-MM-DD (UTC) as NOW
        const [y, m, d] = todayInTz.split('-').map(Number);
        const sentToday = new Date(Date.UTC(y, m - 1, d, 6, 0, 0));

        mockPrisma.reminderSettings.findMany.mockResolvedValue([
            settings({ lastWorkoutEmailSent: sentToday }),
        ]);

        const result = await processWorkoutEmails({ now: NOW });

        expect(result).toEqual({ sent: 0, skipped: 1, errors: 0 });
        expect(mockPrisma.workout.findFirst).not.toHaveBeenCalled();
        expect(mockSendWorkoutReminderEmail).not.toHaveBeenCalled();
        expect(mockPrisma.reminderSettings.update).not.toHaveBeenCalled();
    });

    it('skips when there is no workout scheduled for tomorrow', async () => {
        mockPrisma.reminderSettings.findMany.mockResolvedValue([settings()]);
        mockPrisma.workout.findFirst.mockResolvedValue(null);

        const result = await processWorkoutEmails({ now: NOW });

        expect(result).toEqual({ sent: 0, skipped: 1, errors: 0 });
        expect(mockSendWorkoutReminderEmail).not.toHaveBeenCalled();
        expect(mockPrisma.reminderSettings.update).not.toHaveBeenCalled();
    });

    it('does not query disabled users (query filters on workoutEmailEnabled)', async () => {
        // findMany is the gatekeeper: confirm it is called with the filter and,
        // when it returns an empty list, nothing else happens.
        mockPrisma.reminderSettings.findMany.mockResolvedValue([]);

        const result = await processWorkoutEmails({ now: NOW });

        expect(mockPrisma.reminderSettings.findMany).toHaveBeenCalledWith({
            where: { workoutEmailEnabled: true },
        });
        expect(result).toEqual({ sent: 0, skipped: 0, errors: 0 });
        expect(mockPrisma.workout.findFirst).not.toHaveBeenCalled();
        expect(mockSendWorkoutReminderEmail).not.toHaveBeenCalled();
    });

    it('skips when the user has no email or no emailVerified', async () => {
        mockPrisma.reminderSettings.findMany.mockResolvedValue([settings()]);
        mockPrisma.workout.findFirst.mockResolvedValue(workout());
        mockPrisma.user.findUnique.mockResolvedValue(user({ emailVerified: null }));

        const result = await processWorkoutEmails({ now: NOW });

        expect(result).toEqual({ sent: 0, skipped: 1, errors: 0 });
        expect(mockSendWorkoutReminderEmail).not.toHaveBeenCalled();
        expect(mockPrisma.reminderSettings.update).not.toHaveBeenCalled();
    });

    it('continues processing other users when one throws', async () => {
        mockPrisma.reminderSettings.findMany.mockResolvedValue([
            settings({ userId: 'failing-user' }),
            settings({ userId: 'ok-user' }),
        ]);

        // First user's workout lookup throws; second succeeds.
        mockPrisma.workout.findFirst
            .mockRejectedValueOnce(new Error('db down'))
            .mockResolvedValueOnce(workout({ id: 'wk-ok' }));
        mockPrisma.user.findUnique.mockResolvedValue(user());

        const result = await processWorkoutEmails({ now: NOW });

        expect(result).toEqual({ sent: 1, skipped: 0, errors: 1 });
        expect(mockSendWorkoutReminderEmail).toHaveBeenCalledTimes(1);
        expect(mockPrisma.reminderSettings.update).toHaveBeenCalledTimes(1);
        expect(mockPrisma.reminderSettings.update).toHaveBeenCalledWith({
            where: { userId: 'ok-user' },
            data: { lastWorkoutEmailSent: expect.any(Date) },
        });
    });
});

describe('timezone helpers', () => {
    it('getTomorrowRange returns a 24h window starting the day after "now"', () => {
        const { start, end } = getTomorrowRange(new Date('2026-07-08T12:00:00Z'), 'UTC');
        expect(start.toISOString()).toBe('2026-07-09T00:00:00.000Z');
        expect(end.toISOString()).toBe('2026-07-10T00:00:00.000Z');
        expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
    });

    it('getTomorrowRange respects a non-UTC timezone', () => {
        // 2026-07-08T12:00:00Z is 2026-07-08 05:00 in America/Los_Angeles (PDT, UTC-7).
        // Tomorrow's calendar day in that tz is 2026-07-09, covering
        // 2026-07-09T07:00:00Z .. 2026-07-10T07:00:00Z.
        const { start, end } = getTomorrowRange(new Date('2026-07-08T12:00:00Z'), 'America/Los_Angeles');
        expect(start.toISOString()).toBe('2026-07-09T07:00:00.000Z');
        expect(end.toISOString()).toBe('2026-07-10T07:00:00.000Z');
    });

    it('formatDateInTz falls back to UTC for an invalid timezone', () => {
        const d = new Date('2026-07-08T12:00:00Z');
        // Should not throw and should yield a YYYY-MM-DD string.
        const out = formatDateInTz(d, 'Not/A_Real_Tz');
        expect(out).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});
