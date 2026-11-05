import { projectRoute } from '../routeProjection';

describe('GPS route projection', () => {
    it('rejects missing and malformed coordinates but accepts the equator and prime meridian', () => {
        expect(projectRoute(null)).toEqual([]);
        expect(projectRoute([[91, 0], [0, 181], [NaN, 0], ['0', 0], null])).toEqual([]);
        expect(projectRoute([[0, 0], null, [0, 1]])).toHaveLength(2);
        expect(projectRoute([[0, 0]])).toEqual([]);
    });
    it('centers identical fixes and straight tracks without nonfinite coordinates', () => {
        expect(projectRoute([[2, 3], [2, 3]])).toEqual([[200, 110], [200, 110]]);
        const points = projectRoute([[0, 0], [0, 1]]);
        expect(points[0][1]).toBe(110);
        expect(points[1][1]).toBe(110);
        expect(points[0][0]).toBeCloseTo(28);
        expect(points[1][0]).toBeCloseTo(372);
    });
    it('keeps closed loops closed and north above south', () => {
        const points = projectRoute([[45, 25], [45.01, 25.01], [45, 25.02], [45, 25]]);
        expect(points[0]).toEqual(points[3]);
        expect(points[1][1]).toBeLessThan(points[0][1]);
    });
    it('preserves local aspect at high latitude', () => {
        const points = projectRoute([[59.99, 10], [60.01, 10.04]]);
        expect((points[1][0] - points[0][0]) / (points[0][1] - points[1][1])).toBeCloseTo(1, 5);
    });
    it('unwraps date-line crossings to the short path', () => {
        const points = projectRoute([[0, 179.99], [0.01, -180], [0, -179.99]]);
        expect(points[0][0]).toBeLessThan(points[1][0]);
        expect(points[1][0]).toBeLessThan(points[2][0]);
        expect(points[0][1] - points[1][1]).toBeCloseTo((points[2][0] - points[0][0]) / 2, 4);
    });
    it('supports long recordings without exceeding JS argument limits', () => {
        const points = projectRoute(Array.from({length: 150000}, (_, i) => [45 + i / 1e7, 25]));
        expect(points).toHaveLength(150000);
        expect(points.every(p => p.every(Number.isFinite))).toBe(true);
    });
});
