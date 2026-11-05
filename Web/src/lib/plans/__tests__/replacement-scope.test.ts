import { calendarDate } from '../calendar-date';
import { isReplaceableWorkout, lastProtectedDate, replacementStart } from '../replacement-scope';

describe('regeneration replacement scope', () => {
    const start = replacementStart(new Date('2026-11-01T18:20:00Z'));
    it('starts at UTC midnight and preserves past, completed and linked workouts', () => {
        expect(start.toISOString()).toBe('2026-11-01T00:00:00.000Z');
        expect(isReplaceableWorkout({ scheduledDate: '2026-10-31T23:59:59Z', isCompleted: false }, start)).toBe(false);
        expect(isReplaceableWorkout({ scheduledDate: '2026-11-01T00:00:00Z', isCompleted: false }, start)).toBe(true);
        expect(isReplaceableWorkout({ scheduledDate: '2026-11-02T12:00:00Z', isCompleted: true }, start)).toBe(false);
        expect(isReplaceableWorkout({ scheduledDate: '2026-11-02T12:00:00Z', isCompleted: false, linkedActivityId: 'activity' }, start)).toBe(false);
    });
    it('preserves unfinished workouts at or before the last protected workout', () => {
        const last = lastProtectedDate([{ scheduledDate: '2026-11-05T00:00:00Z', isCompleted: true }]);
        expect(isReplaceableWorkout({ scheduledDate: '2026-11-04T00:00:00Z', isCompleted: false }, start, last)).toBe(false);
        expect(isReplaceableWorkout({ scheduledDate: '2026-11-05T00:00:00Z', isCompleted: false }, start, last)).toBe(false);
        expect(isReplaceableWorkout({ scheduledDate: '2026-11-06T00:00:00Z', isCompleted: false }, start, last)).toBe(true);
    });
});


describe('calendar date parsing', () => {
    it('keeps a date-only schedule on the specified local day', () => {
        const date = calendarDate('2026-03-08');
        expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 2, 8]);
    });
    it('retains the instant for timestamped activities and schedules', () => {
        expect(calendarDate('2026-11-01T00:30:00Z').toISOString()).toBe('2026-11-01T00:30:00.000Z');
    });
});
