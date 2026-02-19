import { formatDuration, formatRaceTime } from '../format';

describe('formatDuration', () => {
    it('should format seconds to MM:SS', () => {
        expect(formatDuration(65)).toBe('1:05');
        expect(formatDuration(600)).toBe('10:00');
    });

    it('should format seconds to HH:MM:SS', () => {
        expect(formatDuration(3665)).toBe('1:01:05');
        expect(formatDuration(7200)).toBe('2:00:00');
    });

    it('should handle null, undefined, and zero', () => {
        expect(formatDuration(null)).toBe('0:00');
        expect(formatDuration(undefined)).toBe('0:00');
        expect(formatDuration(0)).toBe('0:00');
        expect(formatDuration(-10)).toBe('0:00');
    });
});

describe('formatRaceTime', () => {
    it('should format seconds to MM:SS', () => {
        expect(formatRaceTime(65)).toBe('1:05');
    });

    it('should format seconds to HH:MM:SS', () => {
        expect(formatRaceTime(3665)).toBe('1:01:05');
    });

    it('should handle zero and negative', () => {
        expect(formatRaceTime(0)).toBe('0:00');
        expect(formatRaceTime(-10)).toBe('0:00');
    });
});
