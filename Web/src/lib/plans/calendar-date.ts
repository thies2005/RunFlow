/** A bare schedule date is a calendar day, not a UTC instant. Timestamps are
 * displayed in the browser's local timezone, like activity detail dates. */
export function calendarDate(value: string | Date): Date {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split('-').map(Number);
        return new Date(year, month - 1, day);
    }
    return new Date(value);
}
