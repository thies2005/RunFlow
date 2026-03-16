const UTC_DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseUtcDayKey(dayKey: string): Date {
    const [year, month, day] = dayKey.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
}

export function toUtcDayKey(value: Date | string): string {
    if (typeof value === 'string' && UTC_DAY_KEY_PATTERN.test(value)) {
        return value;
    }

    return new Date(value).toISOString().split('T')[0];
}

export function getCurrentUtcDayKey(now: Date = new Date()): string {
    return toUtcDayKey(now);
}

export function shiftUtcDayKey(dayKey: string, days: number): string {
    const date = parseUtcDayKey(dayKey);
    date.setUTCDate(date.getUTCDate() + days);
    return toUtcDayKey(date);
}

export function getUtcDayRange(dayKeyOrDate: string | Date) {
    const dayKey = toUtcDayKey(dayKeyOrDate);
    const start = parseUtcDayKey(dayKey);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    return { dayKey, start, end };
}

export function formatUtcDayKey(
    dayKey: string,
    options: Intl.DateTimeFormatOptions,
    locale = 'en-US'
): string {
    return new Intl.DateTimeFormat(locale, {
        timeZone: 'UTC',
        ...options,
    }).format(parseUtcDayKey(dayKey));
}
