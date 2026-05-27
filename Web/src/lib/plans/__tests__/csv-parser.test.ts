import { parseCsv, workoutsToRunFlowCsv, type ParsedCsvWorkout } from '../csv-parser';

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
