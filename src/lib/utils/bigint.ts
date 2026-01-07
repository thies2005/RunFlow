/**
 * BigInt Utilities
 * Shared utility functions for handling BigInt conversions
 */

/**
 * Safely convert a value to BigInt, handling edge cases
 * @param value - The value to convert (bigint, number, or string)
 * @returns BigInt representation of the value
 * @throws Error if value cannot be converted to BigInt
 */
export function safeBigInt(value: unknown): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(Math.floor(value));
    if (typeof value === 'string') return BigInt(value);
    throw new Error(`Cannot convert ${typeof value} to BigInt`);
}
