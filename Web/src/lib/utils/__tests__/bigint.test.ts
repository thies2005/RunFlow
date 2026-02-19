import { safeBigInt } from '../bigint';

describe('safeBigInt', () => {
    it('returns bigint as is', () => {
        expect(safeBigInt(10n)).toBe(10n);
        expect(safeBigInt(-10n)).toBe(-10n);
        expect(safeBigInt(0n)).toBe(0n);
    });

    it('converts number to bigint (floored)', () => {
        expect(safeBigInt(10)).toBe(10n);
        expect(safeBigInt(10.5)).toBe(10n);
        expect(safeBigInt(10.9)).toBe(10n);
        expect(safeBigInt(-10.5)).toBe(-11n);
        expect(safeBigInt(0)).toBe(0n);
    });

    it('converts valid integer string to bigint', () => {
        expect(safeBigInt('10')).toBe(10n);
        expect(safeBigInt('-10')).toBe(-10n);
        expect(safeBigInt('0')).toBe(0n);
        expect(safeBigInt('')).toBe(0n); // BigInt('') is 0n
        expect(safeBigInt('  123  ')).toBe(123n); // BigInt trims whitespace
    });

    it('throws Error for boolean', () => {
        // boolean typeof is 'boolean', so it falls through to throw
        expect(() => safeBigInt(true)).toThrow('Cannot convert boolean to BigInt');
        expect(() => safeBigInt(false)).toThrow('Cannot convert boolean to BigInt');
    });

    it('throws Error for object', () => {
        // object typeof is 'object'
        expect(() => safeBigInt({})).toThrow('Cannot convert object to BigInt');
        expect(() => safeBigInt([])).toThrow('Cannot convert object to BigInt');
    });

    it('throws Error for null', () => {
        // null typeof is 'object'
        expect(() => safeBigInt(null)).toThrow('Cannot convert object to BigInt');
    });

    it('throws Error for undefined', () => {
        // undefined typeof is 'undefined'
        expect(() => safeBigInt(undefined)).toThrow('Cannot convert undefined to BigInt');
    });

    it('throws SyntaxError for invalid string input (from BigInt constructor)', () => {
        expect(() => safeBigInt('abc')).toThrow(SyntaxError);
        expect(() => safeBigInt('1.5')).toThrow(SyntaxError);
    });
});
