import { checkFieldConsistency, deriveMissingField } from '../validate-workout';

jest.mock('../../metrics/vdot', () => ({
    formatPace: (pace: number) => {
        const mins = Math.floor(pace / 60);
        const secs = Math.round(pace % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },
}));

describe('checkFieldConsistency', () => {
    it('returns no warnings for consistent fields', () => {
        const warnings = checkFieldConsistency({
            targetDistance: 10000,
            targetPace: 300,
            targetDuration: 3000,
        });
        expect(warnings).toHaveLength(0);
    });

    it('warns when duration contradicts distance+pace', () => {
        const warnings = checkFieldConsistency({
            targetDistance: 10000,
            targetPace: 300,
            targetDuration: 1800,
        });
        expect(warnings).toHaveLength(1);
        expect(warnings[0].field).toBe('targetDuration');
        expect(warnings[0].impliedValue).toBe(3000);
        expect(warnings[0].actualValue).toBe(1800);
    });

    it('returns no warning when duration is within 15% tolerance', () => {
        const warnings = checkFieldConsistency({
            targetDistance: 10000,
            targetPace: 300,
            targetDuration: 3200,
        });
        expect(warnings).toHaveLength(0);
    });

    it('suggests missing pace from distance and duration', () => {
        const warnings = checkFieldConsistency({
            targetDistance: 10000,
            targetPace: null,
            targetDuration: 3000,
        });
        expect(warnings).toHaveLength(1);
        expect(warnings[0].field).toBe('targetPace');
        expect(warnings[0].impliedValue).toBe(300);
    });

    it('suggests missing distance from pace and duration', () => {
        const warnings = checkFieldConsistency({
            targetDistance: null,
            targetPace: 300,
            targetDuration: 3000,
        });
        expect(warnings).toHaveLength(1);
        expect(warnings[0].field).toBe('targetDistance');
        expect(warnings[0].impliedValue).toBe(10000);
    });

    it('returns no warnings when only one field is set', () => {
        const warnings = checkFieldConsistency({
            targetDistance: 10000,
            targetPace: null,
            targetDuration: null,
        });
        expect(warnings).toHaveLength(0);
    });

    it('returns no warnings when no fields are set', () => {
        const warnings = checkFieldConsistency({
            targetDistance: null,
            targetPace: null,
            targetDuration: null,
        });
        expect(warnings).toHaveLength(0);
    });

    it('returns no warnings when only two fields agree', () => {
        const warnings = checkFieldConsistency({
            targetDistance: 5000,
            targetPace: 360,
            targetDuration: null,
        });
        expect(warnings).toHaveLength(0);
    });

    it('handles zero values like null', () => {
        const warnings = checkFieldConsistency({
            targetDistance: 10000,
            targetPace: 0,
            targetDuration: 3000,
        });
        expect(warnings).toHaveLength(1);
        expect(warnings[0].field).toBe('targetPace');
    });

    it('handles negative values like null', () => {
        const warnings = checkFieldConsistency({
            targetDistance: -100,
            targetPace: 300,
            targetDuration: 3000,
        });
        expect(warnings).toHaveLength(1);
        expect(warnings[0].field).toBe('targetDistance');
    });
});

describe('deriveMissingField', () => {
    it('derives duration from distance and pace', () => {
        const result = deriveMissingField({
            targetDistance: 5000,
            targetPace: 360,
            targetDuration: 0,
        });
        expect(result.targetDuration).toBe(1800);
    });

    it('derives pace from distance and duration', () => {
        const result = deriveMissingField({
            targetDistance: 5000,
            targetPace: 0,
            targetDuration: 1500,
        });
        expect(result.targetPace).toBe(300);
    });

    it('derives distance from pace and duration', () => {
        const result = deriveMissingField({
            targetDistance: 0,
            targetPace: 300,
            targetDuration: 3000,
        });
        expect(result.targetDistance).toBe(10000);
    });

    it('returns empty when all fields are set', () => {
        const result = deriveMissingField({
            targetDistance: 5000,
            targetPace: 300,
            targetDuration: 1500,
        });
        expect(Object.keys(result)).toHaveLength(0);
    });

    it('returns empty when fewer than 2 fields are set', () => {
        const result = deriveMissingField({
            targetDistance: 5000,
            targetPace: null,
            targetDuration: null,
        });
        expect(Object.keys(result)).toHaveLength(0);
    });

    it('returns empty when no fields are set', () => {
        const result = deriveMissingField({
            targetDistance: null,
            targetPace: null,
            targetDuration: null,
        });
        expect(Object.keys(result)).toHaveLength(0);
    });

    it('derives duration when distance and pace are set and duration is null', () => {
        const result = deriveMissingField({
            targetDistance: 10000,
            targetPace: 300,
            targetDuration: null,
        });
        expect(result.targetDuration).toBe(3000);
        expect(result.targetPace).toBeUndefined();
        expect(result.targetDistance).toBeUndefined();
    });

    it('derives swim duration from pace per 100m', () => {
        const result = deriveMissingField({
            workoutType: 'SWIM',
            targetDistance: 1500,
            targetPace: 120,
            targetDuration: 0,
        });
        expect(result.targetDuration).toBe(1800);
    });

    it('rounds derived distance to nearest 100m', () => {
        const result = deriveMissingField({
            targetDistance: 0,
            targetPace: 310,
            targetDuration: 3000,
        });
        const raw = (3000 / 310) * 1000;
        const expected = Math.round(raw / 100) * 100;
        expect(result.targetDistance).toBe(expected);
    });
});
