import {
    findSmartRescheduleDay,
    isHardWorkoutType,
    HARD_TYPES,
} from '../schedule-utils';

describe('Smart Scheduler (schedule-utils.ts)', () => {
    it('identifies hard workout types accurately', () => {
        expect(isHardWorkoutType('INTERVALS')).toBe(true);
        expect(isHardWorkoutType('tempo')).toBe(true);
        expect(isHardWorkoutType('LONG_RUN')).toBe(true);
        expect(isHardWorkoutType('LONG_RIDE')).toBe(true);
        expect(isHardWorkoutType('RIDE_INTERVALS')).toBe(true);
        expect(isHardWorkoutType('EASY')).toBe(false);
        expect(isHardWorkoutType('RECOVERY')).toBe(false);
        expect(isHardWorkoutType('REST')).toBe(false);
    });

    it('reschedules a hard workout keeping at least 48h from other hard workouts', () => {
        // Today is Tuesday 2026-11-03
        // Week Mon 2026-11-02 to Sun 2026-11-08
        // Tuesday workout: INTERVALS (needs rescheduling)
        // Friday 2026-11-06: TEMPO (hard)
        // Wednesday 2026-11-04: RECOVERY
        // Thursday 2026-11-05: 24h before Friday (invalid)
        // Saturday 2026-11-07: 24h after Friday (invalid)
        // Sunday 2026-11-08: 48h after Friday (valid, open day!)
        const movingWorkout = {
            id: 'w-tue',
            workoutType: 'INTERVALS',
            scheduledDate: '2026-11-03',
        };

        const weekWorkouts = [
            movingWorkout,
            { id: 'w-wed', workoutType: 'RECOVERY', scheduledDate: '2026-11-04' },
            { id: 'w-fri', workoutType: 'TEMPO', scheduledDate: '2026-11-06' },
        ];

        const targetDay = findSmartRescheduleDay(movingWorkout, weekWorkouts, '2026-11-03');
        expect(targetDay).toBe('2026-11-08');
    });

    it('prefers open days before easy swap days', () => {
        // Today is Tuesday 2026-11-03
        // Thursday 2026-11-05 is EASY
        // Friday 2026-11-06 is completely OPEN
        // Moving an EASY workout
        const movingWorkout = {
            id: 'w-tue',
            workoutType: 'EASY',
            scheduledDate: '2026-11-03',
        };

        const weekWorkouts = [
            movingWorkout,
            { id: 'w-thu', workoutType: 'EASY', scheduledDate: '2026-11-05' },
        ];

        const targetDay = findSmartRescheduleDay(movingWorkout, weekWorkouts, '2026-11-03');
        // Wednesday 2026-11-04 is open and earliest
        expect(targetDay).toBe('2026-11-04');
    });

    it('returns null if no future day exists in the current week', () => {
        // Today is Sunday 2026-11-08
        const movingWorkout = {
            id: 'w-sun',
            workoutType: 'LONG_RUN',
            scheduledDate: '2026-11-08',
        };

        const targetDay = findSmartRescheduleDay(movingWorkout, [movingWorkout], '2026-11-08');
        expect(targetDay).toBeNull();
    });
});
