import {
    classifyImportedWorkout,
    parseMyWhooshStepsToStructuredV2,
    parseMyWhooshWorkoutFile,
    parseZwoXmlToStructuredV2,
} from '../parser';
import type { MyWhooshStepFile } from '../types';
import type { RepeatGroup, StructuredStep, StructuredWorkoutV2, StepNode } from '../../plans/structured';
import { structuredWorkoutV2Schema } from '../../plans/structured';

function mwStep(overrides: Partial<MyWhooshStepFile> = {}): MyWhooshStepFile {
    return {
        stepType: 'E_Normal',
        power: null,
        startPower: null,
        endPower: null,
        timeSeconds: 60,
        rpm: null,
        intervalId: null,
        ...overrides,
    };
}

function asStep(node: unknown): StructuredStep {
    return node as StructuredStep;
}

function asRepeat(node: unknown): RepeatGroup {
    return node as RepeatGroup;
}

function structuredWithSteps(steps: StepNode[]): StructuredWorkoutV2 {
    return { version: 2, source: 'template', steps };
}

describe('parseMyWhooshWorkoutFile', () => {
    it('narrows a MyWhoosh JSON object with tolerant nulls and skips garbage steps', () => {
        const raw = {
            Id: 'abc-123',
            Name: 'Sweet Spot Party',
            Description: 'A workout',
            TSS: 62,
            IF: 0.89,
            Duration: 3600,
            WorkoutStepsArray: [
                { Id: 1, StepType: 'E_WarmUp', StartPower: 0.5, EndPower: 0.68, Time: 300, Rpm: 90, IntervalId: 0 },
                { Id: 2, StepType: 'E_Normal', Power: 0.9, Time: 600 },
                'garbage',
                { StepType: 42 },
            ],
        };

        const wf = parseMyWhooshWorkoutFile(raw, 'fallback');

        expect(wf.id).toBe('abc-123');
        expect(wf.name).toBe('Sweet Spot Party');
        expect(wf.description).toBe('A workout');
        expect(wf.tss).toBe(62);
        expect(wf.intensityFactor).toBe(0.89);
        expect(wf.durationSeconds).toBe(3600);
        expect(wf.steps).toEqual([
            { stepType: 'E_WarmUp', power: null, startPower: 0.5, endPower: 0.68, timeSeconds: 300, rpm: 90, intervalId: 0 },
            { stepType: 'E_Normal', power: 0.9, startPower: null, endPower: null, timeSeconds: 600, rpm: null, intervalId: null },
            { stepType: '', power: null, startPower: null, endPower: null, timeSeconds: null, rpm: null, intervalId: null },
        ]);
    });

    it('falls back to the given name and a deterministic name-hash id when Id/Name are missing', () => {
        const a = parseMyWhooshWorkoutFile({ WorkoutStepsArray: [] }, 'Fallback Name');
        const b = parseMyWhooshWorkoutFile({ WorkoutStepsArray: [] }, 'Fallback Name');
        const c = parseMyWhooshWorkoutFile({ WorkoutStepsArray: [] }, 'Other Name');

        expect(a.name).toBe('Fallback Name');
        expect(typeof a.id).toBe('string');
        expect(a.id.length).toBeGreaterThan(0);
        expect(a.id).toBe(b.id);
        expect(a.id).not.toBe(c.id);
    });

    it('throws on garbage JSON (not a MyWhoosh workout object)', () => {
        expect(() => parseMyWhooshWorkoutFile(null, 'x')).toThrow('Not a MyWhoosh workout file');
        expect(() => parseMyWhooshWorkoutFile('a string', 'x')).toThrow('Not a MyWhoosh workout file');
        expect(() => parseMyWhooshWorkoutFile(42, 'x')).toThrow('Not a MyWhoosh workout file');
        expect(() => parseMyWhooshWorkoutFile(['not', 'an', 'object'], 'x')).toThrow('Not a MyWhoosh workout file');
        expect(() => parseMyWhooshWorkoutFile({ Name: 'no steps array' }, 'x')).toThrow('Not a MyWhoosh workout file');
    });

    it('feeds cleanly into parseMyWhooshStepsToStructuredV2 (route usage)', () => {
        const wf = parseMyWhooshWorkoutFile(
            {
                Name: 'Imported',
                WorkoutStepsArray: [
                    { StepType: 'E_WarmUp', StartPower: 0.5, EndPower: 0.68, Time: 300 },
                    { StepType: 'E_Normal', Power: 0.7, Time: 600 },
                ],
            },
            'fallback'
        );

        const structured = parseMyWhooshStepsToStructuredV2(wf.steps);
        expect(() => structuredWorkoutV2Schema.parse(structured)).not.toThrow();
        expect(structured.steps).toHaveLength(2);
        expect(asStep(structured.steps[0]).kind).toBe('warmup');
        expect(asStep(structured.steps[0]).target).toEqual({ type: 'power', ftpPercent: 59 });
        expect(asStep(structured.steps[1]).kind).toBe('steady');
    });
});

describe('parseMyWhooshStepsToStructuredV2', () => {
    it('maps warmup/steady/ramp/cooldown kinds with rounded ftpPercent and Rpm cadence', () => {
        const structured = parseMyWhooshStepsToStructuredV2([
            mwStep({ stepType: 'E_WarmUp', startPower: 0.5, endPower: 0.68, timeSeconds: 300, rpm: 90 }),
            mwStep({ stepType: 'E_Normal', power: 0.7, timeSeconds: 600 }),
            mwStep({ stepType: 'E_Normal', power: 0.95, timeSeconds: 180 }),
            mwStep({ stepType: 'E_Ramp', startPower: 0.6, endPower: 0.8, timeSeconds: 240 }),
            mwStep({ stepType: 'E_Ramp', startPower: 0.8, endPower: 1.0, timeSeconds: 120 }),
            mwStep({ stepType: 'E_CoolDown', startPower: 0.65, endPower: 0.5, timeSeconds: 300 }),
        ]);

        expect(() => structuredWorkoutV2Schema.parse(structured)).not.toThrow();
        expect(structured.version).toBe(2);
        expect(structured.source).toBe('template');

        const steps = structured.steps.map(asStep);
        expect(steps.map((s) => s.kind)).toEqual(['warmup', 'steady', 'work', 'warmup', 'work', 'cooldown']);
        expect(steps.every((s) => s.duration.type === 'time')).toBe(true);
        expect(steps[0].target).toEqual({ type: 'power', ftpPercent: 59 });
        expect(steps[0].cadenceRpm).toBe(90);
        expect(steps[1].target).toEqual({ type: 'power', ftpPercent: 70 });
        expect(steps[2].target).toEqual({ type: 'power', ftpPercent: 95 });
        expect(steps[3].target).toEqual({ type: 'power', ftpPercent: 70 });
        expect(steps[4].target).toEqual({ type: 'power', ftpPercent: 90 });
        // JS float: Math.round((0.65 + 0.5) / 2 * 100) === 57
        expect(steps[5].target).toEqual({ type: 'power', ftpPercent: 57 });
    });

    it('collapses consecutive IntervalId steps into one repeat (work 95 / recovery 65, times from pairs)', () => {
        const structured = parseMyWhooshStepsToStructuredV2([
            mwStep({ stepType: 'E_Normal', power: 0.95, timeSeconds: 180, intervalId: 7 }),
            mwStep({ stepType: 'E_Normal', power: 0.65, timeSeconds: 90, intervalId: 7 }),
            mwStep({ stepType: 'E_Normal', power: 0.95, timeSeconds: 180, intervalId: 7 }),
            mwStep({ stepType: 'E_Normal', power: 0.65, timeSeconds: 90, intervalId: 7 }),
            mwStep({ stepType: 'E_Normal', power: 0.5, timeSeconds: 300 }),
        ]);

        expect(() => structuredWorkoutV2Schema.parse(structured)).not.toThrow();
        expect(structured.steps).toHaveLength(2);

        const repeat = asRepeat(structured.steps[0]);
        expect(repeat.kind).toBe('repeat');
        expect(repeat.times).toBe(2);

        const inner = repeat.steps.map(asStep);
        expect(inner).toHaveLength(2);
        expect(inner[0].kind).toBe('work');
        expect(inner[0].duration).toEqual({ type: 'time', seconds: 180 });
        expect(inner[0].target).toEqual({ type: 'power', ftpPercent: 95 });
        expect(inner[1].kind).toBe('recovery');
        expect(inner[1].duration).toEqual({ type: 'time', seconds: 90 });
        expect(inner[1].target).toEqual({ type: 'power', ftpPercent: 65 });

        expect(asStep(structured.steps[1]).kind).toBe('steady');
    });

    it('returns an empty valid workout for an empty step list', () => {
        const structured = parseMyWhooshStepsToStructuredV2([]);
        expect(() => structuredWorkoutV2Schema.parse(structured)).not.toThrow();
        expect(structured.steps).toEqual([]);
    });
});

describe('parseZwoXmlToStructuredV2', () => {
    it('round-trips a generateMyWhooshZwoXml-style sample', () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<workout_file>
    <author>RunFlow</author>
    <name>Sample Ride</name>
    <description>Round trip sample</description>
    <sportType>bike</sportType>
    <tags>
        <tag name="RunFlow"/>
    </tags>
    <workout>
        <Warmup Duration="600" PowerLow="0.50" PowerHigh="0.68" Cadence="85"/>
        <SteadyState Duration="1800" Power="0.70" Cadence="90"/>
        <Cooldown Duration="600" PowerLow="0.65" PowerHigh="0.50" Cadence="85"/>
    </workout>
</workout_file>`;

        const structured = parseZwoXmlToStructuredV2(xml);

        expect(() => structuredWorkoutV2Schema.parse(structured)).not.toThrow();
        expect(structured.version).toBe(2);
        expect(structured.source).toBe('template');

        const steps = structured.steps.map(asStep);
        expect(steps.map((s) => s.kind)).toEqual(['warmup', 'steady', 'cooldown']);
        expect(steps[0].duration).toEqual({ type: 'time', seconds: 600 });
        expect(steps[0].target).toEqual({ type: 'power', ftpPercent: 59 });
        expect(steps[0].cadenceRpm).toBe(85);
        expect(steps[1].duration).toEqual({ type: 'time', seconds: 1800 });
        expect(steps[1].target).toEqual({ type: 'power', ftpPercent: 70 });
        expect(steps[1].cadenceRpm).toBe(90);
        expect(steps[2].duration).toEqual({ type: 'time', seconds: 600 });
        expect(steps[2].target).toEqual({ type: 'power', ftpPercent: 57 });
        expect(steps[2].cadenceRpm).toBe(85);
    });

    it('converts <IntervalsT Repeat="5"> into a repeat node with work + recovery steps', () => {
        const xml = `<workout_file><workout>
            <SteadyState Duration="300" Power="0.60"/>
            <IntervalsT Repeat="5" OnDuration="180" OffDuration="90" OnPower="1.0" OffPower="0.6" Cadence="95"/>
        </workout></workout_file>`;

        const structured = parseZwoXmlToStructuredV2(xml);

        expect(() => structuredWorkoutV2Schema.parse(structured)).not.toThrow();
        expect(structured.steps).toHaveLength(2);

        const repeat = asRepeat(structured.steps[1]);
        expect(repeat.kind).toBe('repeat');
        expect(repeat.times).toBe(5);

        const inner = repeat.steps.map(asStep);
        expect(inner[0].kind).toBe('work');
        expect(inner[0].duration).toEqual({ type: 'time', seconds: 180 });
        expect(inner[0].target).toEqual({ type: 'power', ftpPercent: 100 });
        expect(inner[0].cadenceRpm).toBe(95);
        expect(inner[1].kind).toBe('recovery');
        expect(inner[1].duration).toEqual({ type: 'time', seconds: 90 });
        expect(inner[1].target).toEqual({ type: 'power', ftpPercent: 60 });
    });

    it('maps <FreeRide> to a steady step with a free target', () => {
        const xml = '<workout_file><workout><FreeRide Duration="300"/></workout></workout_file>';
        const structured = parseZwoXmlToStructuredV2(xml);

        expect(() => structuredWorkoutV2Schema.parse(structured)).not.toThrow();
        expect(structured.steps).toHaveLength(1);
        const step = asStep(structured.steps[0]);
        expect(step.kind).toBe('steady');
        expect(step.target).toEqual({ type: 'free' });
        expect(step.duration).toEqual({ type: 'time', seconds: 300 });
    });

    it('parses snake_case tag spellings', () => {
        const xml = `<workout_file><workout>
            <warm_up Duration="300" PowerLow="0.50" PowerHigh="0.60"/>
            <steady_state Duration="600" Power="0.70"/>
            <free_ride Duration="120"/>
        </workout></workout_file>`;

        const structured = parseZwoXmlToStructuredV2(xml);

        expect(() => structuredWorkoutV2Schema.parse(structured)).not.toThrow();
        const steps = structured.steps.map(asStep);
        expect(steps.map((s) => s.kind)).toEqual(['warmup', 'steady', 'steady']);
        expect(steps[0].target).toEqual({ type: 'power', ftpPercent: 55 });
        expect(steps[1].target).toEqual({ type: 'power', ftpPercent: 70 });
        expect(steps[2].target).toEqual({ type: 'free' });
    });

    it('skips unknown tags and throws when no recognizable workout steps exist', () => {
        expect(() =>
            parseZwoXmlToStructuredV2(
                '<workout_file><author>a</author><sportType>bike</sportType><workout></workout></workout_file>'
            )
        ).toThrow('Invalid .zwo file: no workout steps found');
        expect(() =>
            parseZwoXmlToStructuredV2(
                '<workout_file><workout><TotallyUnknown Duration="60"/></workout></workout_file>'
            )
        ).toThrow('Invalid .zwo file: no workout steps found');
    });

    it('throws on oversize XML (> 5 MB)', () => {
        const big = '<workout_file><workout>' + 'x'.repeat(5 * 1024 * 1024) + '</workout></workout_file>';
        expect(() => parseZwoXmlToStructuredV2(big)).toThrow(/5 MB/);
    });
});

describe('classifyImportedWorkout', () => {
    it('classifies work steps >= 90% FTP (incl. inside repeats) as RIDE_INTERVALS/BIKE', () => {
        const flat = classifyImportedWorkout({
            name: 'Hard',
            steps: structuredWithSteps([
                { kind: 'work', duration: { type: 'time', seconds: 600 }, target: { type: 'power', ftpPercent: 95 } },
            ]),
            durationSeconds: 600,
            intensityFactor: null,
        });
        expect(flat).toEqual({ workoutType: 'RIDE_INTERVALS', sport: 'BIKE' });

        const inRepeat = classifyImportedWorkout({
            name: 'Repeat Hard',
            steps: structuredWithSteps([
                {
                    kind: 'repeat',
                    times: 3,
                    steps: [
                        { kind: 'work', duration: { type: 'time', seconds: 180 }, target: { type: 'power', ftpPercent: 95 } },
                        { kind: 'recovery', duration: { type: 'time', seconds: 90 }, target: { type: 'power', ftpPercent: 60 } },
                    ],
                },
            ]),
            durationSeconds: 810,
            intensityFactor: null,
        });
        expect(inRepeat).toEqual({ workoutType: 'RIDE_INTERVALS', sport: 'BIKE' });

        const viaIf = classifyImportedWorkout({
            name: 'Sweety',
            steps: structuredWithSteps([
                { kind: 'steady', duration: { type: 'time', seconds: 3600 }, target: { type: 'power', ftpPercent: 70 } },
            ]),
            durationSeconds: 3600,
            intensityFactor: 0.9,
        });
        expect(viaIf).toEqual({ workoutType: 'RIDE_INTERVALS', sport: 'BIKE' });
    });

    it('classifies 5400 s at IF 0.75 as LONG_RIDE/BIKE', () => {
        const result = classifyImportedWorkout({
            name: 'Endurance Builder',
            xmlSportType: null,
            steps: structuredWithSteps([
                { kind: 'steady', duration: { type: 'time', seconds: 5400 }, target: { type: 'power', ftpPercent: 70 } },
            ]),
            durationSeconds: 5400,
            intensityFactor: 0.75,
        });
        expect(result).toEqual({ workoutType: 'LONG_RIDE', sport: 'BIKE' });
    });

    it('defaults to RIDE/BIKE otherwise', () => {
        const result = classifyImportedWorkout({
            name: 'Easy Spin',
            steps: structuredWithSteps([
                { kind: 'steady', duration: { type: 'time', seconds: 3600 }, target: { type: 'power', ftpPercent: 70 } },
            ]),
            durationSeconds: 3600,
            intensityFactor: null,
        });
        expect(result).toEqual({ workoutType: 'RIDE', sport: 'BIKE' });
    });

    it('maps sportType run to RUN/EASY regardless of step intensity', () => {
        const result = classifyImportedWorkout({
            name: 'Run Thing',
            xmlSportType: 'run',
            steps: structuredWithSteps([
                { kind: 'work', duration: { type: 'time', seconds: 600 }, target: { type: 'power', ftpPercent: 95 } },
            ]),
            durationSeconds: 600,
            intensityFactor: null,
        });
        expect(result).toEqual({ workoutType: 'EASY', sport: 'RUN' });
    });
});
