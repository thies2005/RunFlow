/**
 * @jest-environment node
 *
 * Regression tests for the parseCsv row budget (p3:
 * uncapped-upload-parse-preview-retention): the parser must stop after
 * maxRows valid workouts and report truncation, while the default
 * (programmatic) call stays unlimited for backward compatibility.
 */
import { parseCsv } from '../csv-parser';

function runflowCsv(validRows: number, invalidRows = 0): string {
    const lines = ['date,workout_type,phase,name,description,distance_m,duration_s,pace_s_km,hr_zone'];
    for (let i = 0; i < validRows; i++) {
        lines.push(`2026-01-01,EASY,BASE,"Run ${i}","Steady effort",8000,2700,330,2`);
    }
    // rows with unparseable dates — reported as skipped, they never count
    // toward the workout budget
    for (let i = 0; i < invalidRows; i++) {
        lines.push(`not-a-date,EASY,BASE,"Bad ${i}","",8000,2700,330,2`);
    }
    return lines.join('\n');
}

describe('parseCsv maxRows budget', () => {
    it('stops at the budget and reports truncation', () => {
        const result = parseCsv(runflowCsv(600), 'runflow', { maxRows: 500 });

        expect(result.workouts).toHaveLength(500);
        expect(result.truncated).toBe(true);
        const truncationError = result.errors.find((e) => e.message.includes('Row limit of 500'));
        expect(truncationError).toBeDefined();
        expect(truncationError?.row).toBe(502); // header + 500 parsed rows, 1-based
    });

    it('accepts exactly the budget without truncation (boundary)', () => {
        const result = parseCsv(runflowCsv(500), 'runflow', { maxRows: 500 });

        expect(result.workouts).toHaveLength(500);
        expect(result.truncated).toBe(false);
        expect(result.errors.filter((e) => e.message.includes('Row limit'))).toHaveLength(0);
    });

    it('stays unlimited when no budget is passed (backward compatible)', () => {
        const result = parseCsv(runflowCsv(600), 'runflow');

        expect(result.workouts).toHaveLength(600);
        expect(result.truncated).toBe(false);
    });

    it('does not let invalid rows consume the workout budget', () => {
        // Invalid rows come first: they are skipped without filling the
        // budget, so all three valid rows still parse and the file is fully
        // consumed (no truncation).
        const lines = ['date,workout_type,phase,name,description,distance_m,duration_s,pace_s_km,hr_zone'];
        for (let i = 0; i < 5; i++) {
            lines.push(`not-a-date,EASY,BASE,"Bad ${i}","",8000,2700,330,2`);
        }
        for (let i = 0; i < 3; i++) {
            lines.push(`2026-01-01,EASY,BASE,"Run ${i}","Steady effort",8000,2700,330,2`);
        }

        const result = parseCsv(lines.join('\n'), 'runflow', { maxRows: 3 });

        expect(result.workouts).toHaveLength(3);
        expect(result.truncated).toBe(false);
        expect(result.skipped).toBe(5);
    });

    it('reports truncation when valid rows exceed the budget amid invalid rows', () => {
        const result = parseCsv(runflowCsv(4, 2), 'runflow', { maxRows: 3 });

        expect(result.workouts).toHaveLength(3);
        expect(result.truncated).toBe(true);
    });
});
