import { buildCsv, buildExportPlan, exportFileName, raceLabel, formatDuration, formatPace,
    type ExportGoalInput } from '../plan-export';
import { buildPlanPdf } from '../plan-pdf';

function goal(overrides: Partial<ExportGoalInput> = {}): ExportGoalInput {
    return {
        name: 'Berlin Marathon',
        raceType: 'MARATHON',
        raceDate: new Date('2026-11-08T09:00:00.000Z'),
        targetTime: 13500,
        weeklyMileageGoal: 58000,
        planWeeks: 16,
        workouts: [],
        ...overrides,
    };
}

// Sep 7 2026 is a Monday
function workout(dayOffset: number, overrides: Partial<ExportGoalInput['workouts'][number]> = {}) {
    return {
        scheduledDate: new Date(Date.UTC(2026, 8, 7 + dayOffset, 12)),
        workoutType: 'EASY',
        phase: 'BASE',
        description: 'Easy run: 8km conversational',
        customName: null,
        targetDistance: 8000,
        targetDuration: 2700,
        targetPace: 337.5,
        intensityZone: null,
        ...overrides,
    };
}

describe('plan export engine', () => {
    it('groups workouts into Monday-based weeks in order', () => {
        const plan = buildExportPlan(goal({
            workouts: [
                workout(3), // Thu
                workout(0), // Mon
                workout(8), // next week Wed
            ],
        }));
        expect(plan.weeks).toHaveLength(2);
        expect(plan.weeks[0].rows).toHaveLength(2);
        expect(plan.weeks[1].rows).toHaveLength(1);
        expect(plan.weeks[0].weekNumber).toBe(1);
        expect(plan.weeks[1].weekNumber).toBe(2);
        expect(plan.weeks[0].dateRange).toBe('Sep 7 – Sep 13');
        expect(plan.weeks[0].totalDistanceKm).toBe('16.0');
    });

    it('formats row values from meters/seconds', () => {
        const plan = buildExportPlan(goal({ workouts: [workout(0)] }));
        const row = plan.weeks[0].rows[0];
        expect(row.date).toBe('2026-09-07');
        expect(row.day).toBe('Mon');
        expect(row.distanceKm).toBe('8.0');
        expect(row.duration).toBe('45:00');
        expect(row.pace).toBe('5:38 /km');
    });

    it('prefers customName for the display title', () => {
        const plan = buildExportPlan(goal({
            workouts: [workout(0, { customName: ' 8x400 Track ' })],
        }));
        expect(plan.weeks[0].rows[0].title).toBe('8x400 Track');
    });

    it('uses the renamed triathlon labels', () => {
        expect(raceLabel('HALF_IRONMAN')).toBe('Middle Distance Triathlon');
        expect(raceLabel('FULL_IRONMAN')).toBe('Long Distance Triathlon');
        expect(raceLabel(null)).toBe('Training');
        expect(raceLabel('SOMETHING_ELSE')).toBe('SOMETHING ELSE');
    });

    it('formats durations and paces', () => {
        expect(formatDuration(null)).toBe('-');
        expect(formatDuration(4529)).toBe('1:15:29');
        expect(formatDuration(2700)).toBe('45:00');
        expect(formatPace(null)).toBe('-');
        expect(formatPace(300)).toBe('5:00 /km');
    });

    it('builds CSV with the web export columns and escaping', () => {
        const csv = buildCsv(buildExportPlan(goal({
            workouts: [workout(0, { description: 'Easy "progression" run', intensityZone: 'Z2' })],
        })));
        const lines = csv.split('\n');
        expect(lines[0]).toBe('Date,Day,Type,Description,Distance (km),Duration,Pace,Phase,Intensity Zone');
        expect(lines[1]).toContain('"Easy ""progression"" run"');
        expect(lines[1]).toContain('Z2');
    });

    it('names files like the web export', () => {
        expect(exportFileName('MARATHON', 'pdf')).toBe('runflow-marathon-plan.pdf');
        expect(exportFileName('HALF_IRONMAN', 'csv')).toBe('runflow-half_ironman-plan.csv');
    });

    it('renders a multi-page PDF with correct header bytes and page tree', async () => {
        const workouts = Array.from({ length: 80 }, (_, i) => workout(i % 7, {
            workoutType: ['EASY', 'LONG_RUN', 'SWIM', 'RIDE', 'BRICK'][i % 5],
            phase: ['BASE', 'BUILD', 'PEAK', 'TAPER', 'RACE_WEEK'][Math.floor(i / 16)],
            description: 'A fairly long description that should wrap onto a second line of the PDF row because it exceeds the column width',
            targetDistance: 10000 + i,
        }));
        const plan = buildExportPlan(goal({ workouts }));
        const bytes = await buildPlanPdf(plan);

        expect(bytes[0]).toBe(0x25); // '%'
        expect(bytes[1]).toBe(0x50); // 'P'
        expect(bytes.length).toBeGreaterThan(5000);

        // content streams are Flate-compressed — verify via pdf-lib's parser
        const { PDFDocument } = await import('pdf-lib');
        const loaded = await PDFDocument.load(bytes);
        expect(loaded.getPageCount()).toBeGreaterThan(1); // 80 workouts ⇒ multiple pages
        expect(loaded.getTitle() ?? '').toBe('');
    });
});
