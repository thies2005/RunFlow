import { parseIntSafe, parseFloatSafe } from '../numbers';

describe('Number Utils', () => {
    describe('parseIntSafe', () => {
        it('should return undefined for undefined input', () => {
            expect(parseIntSafe(undefined)).toBeUndefined();
        });

        it('should round float to nearest integer', () => {
            expect(parseIntSafe(10.4)).toBe(10);
            expect(parseIntSafe(10.6)).toBe(11);
        });

        it('should return integer as is', () => {
            expect(parseIntSafe(10)).toBe(10);
        });
    });

    describe('parseFloatSafe', () => {
        it('should return undefined for undefined input', () => {
            expect(parseFloatSafe(undefined)).toBeUndefined();
        });

        it('should return number as is', () => {
            expect(parseFloatSafe(10.5)).toBe(10.5);
            expect(parseFloatSafe(10)).toBe(10);
        });
    });
});
