/**
 * Shared CSV cell writer used by every export path (mobile plan export,
 * plan-advanced RunFlow/TrainingPeaks/FinalSurge CSV, public plan export).
 *
 * Security contract for user-authored text (workout customName/description,
 * intensityZone, goal names in metadata):
 *
 * 1. Every cell is RFC-4180 quoted with embedded quotes doubled, so commas,
 *    newlines and quotes stay inside the cell instead of injecting raw CSV
 *    rows (the old buildCsv wrote intensityZone completely unquoted).
 * 2. Any cell whose trimmed value begins with a spreadsheet formula trigger
 *    (= + - @ tab CR) is prefixed with a single quote, so Excel, LibreOffice
 *    and Google Sheets import it as inert text instead of evaluating it as a
 *    formula (=HYPERLINK, =IMPORTDATA, DDE-style payloads).
 */
export function csvCell(value: string | number | null | undefined): string {
    const text = value == null ? '' : String(value);
    // Neutralize spreadsheet formula injection: prefix with a single quote.
    const neutralized = /^[=+\-@\t\r]/.test(text.trim()) ? `'${text}` : text;
    return `"${neutralized.replace(/"/g, '""')}"`;
}
