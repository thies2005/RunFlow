import {
    formatDuration,
    formatRaceTime,
    formatPace,
    formatSpeedAsPace,
    formatDistance,
    formatDistanceWithUnit,
    parseTimeToSeconds
} from '../format';

describe('formatDuration', () => {
    it('should format seconds to MM:SS', () => {
        expect(formatDuration(65)).toBe('1:05');
        expect(formatDuration(600)).toBe('10:00');
    });

    it('should format seconds to HH:MM:SS', () => {
        expect(formatDuration(3665)).toBe('1:01:05');
        expect(formatDuration(3600)).toBe('1:00:00');
    });

    it('should handle null, undefined, and 0', () => {
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

    it('should format seconds to H:MM:SS', () => {
        expect(formatRaceTime(3665)).toBe('1:01:05');
    });

    it('should handle 0 and negative values', () => {
        expect(formatRaceTime(0)).toBe('0:00');
        expect(formatRaceTime(-10)).toBe('0:00');
    });
});

describe('formatPace', () => {
    it('should format seconds per km to M:SS/km', () => {
        expect(formatPace(300)).toBe('5:00/km');
        expect(formatPace(330)).toBe('5:30/km');
    });

    it('should handle null, undefined, and 0', () => {
        expect(formatPace(null)).toBe('--:--');
        expect(formatPace(undefined)).toBe('--:--');
        expect(formatPace(0)).toBe('--:--');
        expect(formatPace(-1)).toBe('--:--');
    });
});

describe('formatSpeedAsPace', () => {
    it('should convert speed (m/s) to pace (M:SS/km)', () => {
        // 5 min/km = 300 s/km = 1000m / 300s = 3.333 m/s
        expect(formatSpeedAsPace(3.333333)).toBe('5:00/km');
        // 4 min/km = 240 s/km = 1000m / 240s = 4.166 m/s
        expect(formatSpeedAsPace(4.166666)).toBe('4:00/km');
    });

    it('should handle null, undefined, and 0', () => {
        expect(formatSpeedAsPace(null)).toBe('--:--');
        expect(formatSpeedAsPace(undefined)).toBe('--:--');
        expect(formatSpeedAsPace(0)).toBe('--:--');
        expect(formatSpeedAsPace(-1)).toBe('--:--');
    });
});

describe('formatDistance', () => {
    it('should format meters to km with default decimals', () => {
        expect(formatDistance(1000)).toBe('1.00');
        expect(formatDistance(1500)).toBe('1.50');
    });

    it('should format meters to km with specified decimals', () => {
        expect(formatDistance(1000, 1)).toBe('1.0');
        expect(formatDistance(1234, 3)).toBe('1.234');
    });

    it('should handle null, undefined, and negative values', () => {
        expect(formatDistance(null)).toBe('0');
        expect(formatDistance(undefined)).toBe('0');
        expect(formatDistance(-100)).toBe('0');
    });
});

describe('formatDistanceWithUnit', () => {
    it('should format distance with unit', () => {
        expect(formatDistanceWithUnit(1000)).toBe('1.00 km');
        expect(formatDistanceWithUnit(1500, 1)).toBe('1.5 km');
    });
});

describe('parseTimeToSeconds', () => {
    it('should parse HH:MM:SS', () => {
        expect(parseTimeToSeconds('1:01:05')).toBe(3665);
    });

    it('should parse MM:SS', () => {
        expect(parseTimeToSeconds('1:05')).toBe(65);
    });

    it('should handle invalid formats gracefully', () => {
        expect(parseTimeToSeconds('invalid')).toBe(0);
        expect(parseTimeToSeconds('1:05:05:05')).toBe(0);
    });
});
