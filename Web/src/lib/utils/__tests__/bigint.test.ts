import { safeBigInt } from '../bigint';

describe('safeBigInt', () => {
    it('returns bigint as is', () => {
        expect(safeBigInt(BigInt(10))).toBe(BigInt(10));
        expect(safeBigInt(BigInt(-10))).toBe(BigInt(-10));
        expect(safeBigInt(BigInt(0))).toBe(BigInt(0));
    });

    it('converts number to bigint (truncated)', () => {
        expect(safeBigInt(10)).toBe(BigInt(10));
        expect(safeBigInt(10.5)).toBe(BigInt(10));
        expect(safeBigInt(10.9)).toBe(BigInt(10));
        expect(safeBigInt(-10.5)).toBe(BigInt(-10));
        expect(safeBigInt(0)).toBe(BigInt(0));
    });

    it('converts valid integer string to bigint', () => {
        expect(safeBigInt('10')).toBe(BigInt(10));
        expect(safeBigInt('-10')).toBe(BigInt(-10));
        expect(safeBigInt('0')).toBe(BigInt(0));
        expect(safeBigInt('')).toBe(BigInt(0)); // BigInt('') is 0n
        expect(safeBigInt('  123  ')).toBe(BigInt(123)); // BigInt trims whitespace
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
