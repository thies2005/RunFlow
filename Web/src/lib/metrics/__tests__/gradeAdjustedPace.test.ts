import {
    calculateGradeAdjustedPace,
    adjustPaceForTerrain,
    gradeCostFactor,
    formatPaceSeconds,
} from '../gradeAdjustedPace';

const FLAT_PACE = 300; // 5:00/km

describe('calculateGradeAdjustedPace', () => {
    it('returns the pace unchanged (within tolerance) on flat terrain', () => {
        const result = calculateGradeAdjustedPace(FLAT_PACE, 0, 1000);
        // factor at grade 0 is exactly 1.0
        expect(result).toBeCloseTo(FLAT_PACE, 5);
    });

    it('slows the pace on a 5% uphill over 1km (+50m)', () => {
        const result = calculateGradeAdjustedPace(FLAT_PACE, 50, 1000);
        expect(result).toBeGreaterThan(FLAT_PACE);
        // Minetti at 5% -> factor ~1.31; well under the 1.5 cap the spec asks for.
        expect(result).toBeLessThan(FLAT_PACE * 1.5);
    });

    it('speeds the pace on a -5% downhill over 1km (-50m)', () => {
        const result = calculateGradeAdjustedPace(FLAT_PACE, -50, 1000);
        expect(result).toBeLessThan(FLAT_PACE);
        // downhill gain is modest (~7%); never faster than the 0.85 floor.
        expect(result).toBeGreaterThan(FLAT_PACE * 0.85);
    });

    it('is much slower on a steep 15% uphill (+150m over 1km) and stays within the clamp', () => {
        const result = calculateGradeAdjustedPace(FLAT_PACE, 150, 1000);
        expect(result).toBeGreaterThan(FLAT_PACE * 1.5);
        // clamped to flatPace * 2.5
        expect(result).toBeLessThanOrEqual(FLAT_PACE * 2.5);
    });

    it('never returns a pace below the 0.85 floor on extreme descents', () => {
        const result = calculateGradeAdjustedPace(FLAT_PACE, -1000, 1000);
        expect(result).toBeGreaterThanOrEqual(FLAT_PACE * 0.85);
    });

    it('never returns a pace above the 2.5 ceiling on extreme climbs', () => {
        const result = calculateGradeAdjustedPace(FLAT_PACE, 1000, 1000);
        expect(result).toBeLessThanOrEqual(FLAT_PACE * 2.5);
    });

    it('returns the pace unchanged when distance is zero (grade undefined)', () => {
        const result = calculateGradeAdjustedPace(FLAT_PACE, 100, 0);
        expect(result).toBe(FLAT_PACE);
    });

    it('handles a zero/invalid pace by returning it unchanged', () => {
        expect(calculateGradeAdjustedPace(0, 100, 1000)).toBe(0);
    });
});

describe('gradeCostFactor', () => {
    it('is 1.0 on the flat', () => {
        expect(gradeCostFactor(0)).toBeCloseTo(1.0, 5);
    });

    it('is > 1 for uphill and increases with grade', () => {
        const f5 = gradeCostFactor(0.05);
        const f10 = gradeCostFactor(0.10);
        expect(f5).toBeGreaterThan(1.0);
        expect(f10).toBeGreaterThan(f5);
    });

    it('is < 1 for a gentle downhill', () => {
        expect(gradeCostFactor(-0.05)).toBeLessThan(1.0);
    });

    it('reaches its minimum near -5% and rises again on steeper descents', () => {
        const at5 = gradeCostFactor(-0.05);
        const at20 = gradeCostFactor(-0.20);
        expect(at20).toBeGreaterThan(at5);
    });

    it('clamps the input grade to the +/-45% range', () => {
        // A grade beyond the clamp should equal the clamped grade's factor.
        expect(gradeCostFactor(1.0)).toBeCloseTo(gradeCostFactor(0.45), 5);
        expect(gradeCostFactor(-1.0)).toBeCloseTo(gradeCostFactor(-0.45), 5);
    });
});

describe('adjustPaceForTerrain', () => {
    it('returns the flat pace for road with no elevation', () => {
        const result = adjustPaceForTerrain(FLAT_PACE, { terrain: 'road' });
        expect(result).toBeCloseTo(FLAT_PACE, 5);
    });

    it('adds ~5% for trail over road for the same elevation profile', () => {
        const road = adjustPaceForTerrain(FLAT_PACE, {
            elevationGainM: 100,
            distanceM: 1000,
            terrain: 'road',
        });
        const trail = adjustPaceForTerrain(FLAT_PACE, {
            elevationGainM: 100,
            distanceM: 1000,
            terrain: 'trail',
        });
        // The terrain multiplier (1.05) is applied on top of the elevation factor.
        expect(trail).toBeCloseTo(road * 1.05, 1);
        expect(trail).toBeGreaterThan(road);
    });

    it('adds ~10% for mountain over road for the same elevation profile', () => {
        const road = adjustPaceForTerrain(FLAT_PACE, {
            elevationGainM: 100,
            distanceM: 1000,
            terrain: 'road',
        });
        const mountain = adjustPaceForTerrain(FLAT_PACE, {
            elevationGainM: 100,
            distanceM: 1000,
            terrain: 'mountain',
        });
        expect(mountain).toBeCloseTo(road * 1.10, 1);
    });

    it('applies the elevation adjustment even when terrain defaults to road', () => {
        const result = adjustPaceForTerrain(FLAT_PACE, {
            elevationGainM: 50,
            distanceM: 1000,
        });
        expect(result).toBeGreaterThan(FLAT_PACE);
    });

    it('defaults to road terrain when terrain is omitted', () => {
        const withExplicitRoad = adjustPaceForTerrain(FLAT_PACE, {
            elevationGainM: 50,
            distanceM: 1000,
            terrain: 'road',
        });
        const withDefault = adjustPaceForTerrain(FLAT_PACE, {
            elevationGainM: 50,
            distanceM: 1000,
        });
        expect(withDefault).toBeCloseTo(withExplicitRoad, 5);
    });

    it('clamps the combined result to the [0.85, 2.5] window', () => {
        const steep = adjustPaceForTerrain(FLAT_PACE, {
            elevationGainM: 1000,
            distanceM: 1000,
            terrain: 'mountain',
        });
        expect(steep).toBeLessThanOrEqual(FLAT_PACE * 2.5);
    });
});

describe('formatPaceSeconds (re-exported from vdot)', () => {
    it('formats seconds per km as M:SS/km', () => {
        expect(formatPaceSeconds(300)).toBe('5:00/km');
        expect(formatPaceSeconds(330)).toBe('5:30/km');
    });
});
