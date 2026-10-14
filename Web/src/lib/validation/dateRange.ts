export interface BoundedDateRangeResult {
    ok: boolean;
    error?: string;
    start?: Date;
    end?: Date;
    totalDays?: number;
}

export function parseBoundedDateRange(
    startDateStr: string | null | undefined,
    endDateStr: string | null | undefined,
    maxDays = 366,
): BoundedDateRangeResult {
    if (!startDateStr || !endDateStr) {
        return { ok: false, error: 'startDate and endDate are required' };
    }
    if (!/^\d{4}-\d{2}-\d{2}/.test(startDateStr) || !/^\d{4}-\d{2}-\d{2}/.test(endDateStr)) {
        return { ok: false, error: 'Dates must be in YYYY-MM-DD format' };
    }
    const start = new Date(startDateStr.slice(0, 10) + 'T00:00:00.000Z');
    const end = new Date(endDateStr.slice(0, 10) + 'T23:59:59.999Z');
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return { ok: false, error: 'Invalid date format' };
    }
    if (end.getTime() < start.getTime()) {
        return { ok: false, error: 'endDate must be on or after startDate' };
    }
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (totalDays < 1 || totalDays > maxDays) {
        return { ok: false, error: `Date range cannot exceed ${maxDays} days` };
    }
    return { ok: true, start, end, totalDays };
}
