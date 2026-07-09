import { workoutToZwo } from '../zwo-export';
import type { StructuredWorkoutPlan } from '../index';

/**
 * Helper: parse the ZWO string and assert it is well-formed XML (jsdom ships a
 * DOMParser that surfaces parse errors as a <parsererror> element).
 */
function parseXml(xml: string): Document {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
        throw new Error(`XML parse error:\n${parseError.textContent}`);
    }
    return doc;
}

describe('workoutToZwo', () => {
    it('produces valid XML for a warmup + steady + cooldown workout', () => {
        const workout: { structuredSteps: StructuredWorkoutPlan } = {
            structuredSteps: {
                version: 1,
                source: 'generated-plan',
                steps: [
                    { type: 'warmup', name: 'Warm up', durationSeconds: 600, hrZone: 1 },
                    { type: 'steady', name: 'Main set', durationSeconds: 1800, hrZone: 3 },
                    { type: 'cooldown', name: 'Cool down', durationSeconds: 600, hrZone: 1 },
                ],
            },
        };

        const xml = workoutToZwo(workout);

        // Well-formed XML
        const doc = parseXml(xml);
        expect(doc.querySelector('parsererror')).toBeNull();

        // Root + metadata
        expect(doc.querySelector('workout_file > author')?.textContent).toBe('RunFlow');
        expect(doc.querySelector('workout_file > sportType')?.textContent).toBe('run');

        // Step elements in order
        const workoutEl = doc.querySelector('workout_file > workout');
        expect(workoutEl).not.toBeNull();
        const children = Array.from(workoutEl!.children).map(el => el.tagName);
        expect(children).toEqual(['Warmup', 'SteadyState', 'Cooldown']);

        const warmup = doc.querySelector('workout Warmup');
        expect(warmup?.getAttribute('Duration')).toBe('600');
        expect(parseFloat(warmup?.getAttribute('PowerLow') || '0')).toBeLessThan(
            parseFloat(warmup?.getAttribute('PowerHigh') || '0'),
        );
    });

    it('uses the workout name from customName when present', () => {
        const xml = workoutToZwo({
            customName: 'Tuesday Tempo',
            structuredSteps: { steps: [{ type: 'steady', name: 'x', durationSeconds: 600 }] },
        });
        const doc = parseXml(xml);
        expect(doc.querySelector('name')?.textContent).toBe('Tuesday Tempo');
    });

    it('falls back to workoutType when no customName is set', () => {
        const xml = workoutToZwo({
            workoutType: 'TEMPO',
            structuredSteps: { steps: [{ type: 'steady', name: 'x', durationSeconds: 600 }] },
        });
        const doc = parseXml(xml);
        expect(doc.querySelector('name')?.textContent).toBe('TEMPO');
    });

    it('emits an empty but valid <workout/> for empty structuredSteps', () => {
        const xml = workoutToZwo({ structuredSteps: { steps: [] } });
        const doc = parseXml(xml);
        expect(doc.querySelector('parsererror')).toBeNull();
        const workoutEl = doc.querySelector('workout_file > workout');
        expect(workoutEl).not.toBeNull();
        expect(workoutEl!.children.length).toBe(0);
    });

    it('emits a valid empty workout when structuredSteps is null', () => {
        const xml = workoutToZwo({ structuredSteps: null });
        const doc = parseXml(xml);
        expect(doc.querySelector('parsererror')).toBeNull();
        expect(doc.querySelector('workout_file > workout')).not.toBeNull();
    });

    it('escapes XML special characters in name and description', () => {
        const xml = workoutToZwo({
            customName: '5K & "10K" <Test>',
            description: 'fast & furious < 10min',
            structuredSteps: { steps: [] },
        });

        // Must parse without error (proves escaping is correct).
        const doc = parseXml(xml);
        expect(doc.querySelector('name')?.textContent).toBe('5K & "10K" <Test>');
        expect(doc.querySelector('description')?.textContent).toBe('fast & furious < 10min');
    });

    it('converts a work step with distance + pace to a duration', () => {
        // 1000m @ 300s/km -> 300s
        const xml = workoutToZwo({
            structuredSteps: {
                steps: [{ type: 'work', name: 'Rep', distanceMeters: 1000, paceSecondsPerKm: 300 }],
            },
        });
        const doc = parseXml(xml);
        const steady = doc.querySelector('workout SteadyState');
        expect(steady?.getAttribute('Duration')).toBe('300');
        expect(parseFloat(steady?.getAttribute('Power') || '0')).toBeGreaterThan(0.8);
    });

    it('maps recovery steps to a lower power fraction than work steps', () => {
        const xml = workoutToZwo({
            structuredSteps: {
                steps: [
                    { type: 'work', name: 'Hard', durationSeconds: 120, hrZone: 4 },
                    { type: 'recovery', name: 'Easy', durationSeconds: 60, hrZone: 1 },
                ],
            },
        });
        const doc = parseXml(xml);
        const steadyStates = doc.querySelectorAll('workout SteadyState');
        expect(steadyStates.length).toBe(2);
        const workPower = parseFloat(steadyStates[0].getAttribute('Power') || '0');
        const recoveryPower = parseFloat(steadyStates[1].getAttribute('Power') || '0');
        expect(workPower).toBeGreaterThan(recoveryPower);
    });

    it('produces a higher power for VO2max (Z5) than for threshold (Z4)', () => {
        const xml = workoutToZwo({
            structuredSteps: {
                steps: [
                    { type: 'work', name: 'Threshold', durationSeconds: 120, hrZone: 4 },
                    { type: 'work', name: 'VO2', durationSeconds: 120, hrZone: 5 },
                ],
            },
        });
        const doc = parseXml(xml);
        const steadyStates = doc.querySelectorAll('workout SteadyState');
        const thresholdPower = parseFloat(steadyStates[0].getAttribute('Power') || '0');
        const vo2Power = parseFloat(steadyStates[1].getAttribute('Power') || '0');
        expect(vo2Power).toBeGreaterThan(thresholdPower);
    });

    it('accepts a bare array of steps as structuredSteps', () => {
        const xml = workoutToZwo({
            structuredSteps: [{ type: 'steady', name: 'x', durationSeconds: 300 }],
        });
        const doc = parseXml(xml);
        expect(doc.querySelector('workout SteadyState')?.getAttribute('Duration')).toBe('300');
    });

    it('the whole document parses as XML with no parsererror', () => {
        const xml = workoutToZwo({
            customName: 'Full Session',
            description: 'A full structured run',
            structuredSteps: {
                steps: [
                    { type: 'warmup', name: 'WU', durationSeconds: 600, hrZone: 1 },
                    { type: 'work', name: 'Rep 1', distanceMeters: 1000, paceSecondsPerKm: 240, hrZone: 5 },
                    { type: 'recovery', name: 'Rec', durationSeconds: 120, hrZone: 1 },
                    { type: 'cooldown', name: 'CD', durationSeconds: 600, hrZone: 1 },
                ],
            },
        });
        const doc = parseXml(xml);
        expect(doc.querySelector('parsererror')).toBeNull();
        expect(doc.querySelector('workout')?.children.length).toBe(4);
    });
});
