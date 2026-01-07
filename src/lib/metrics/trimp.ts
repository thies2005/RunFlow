/**
 * TRIMP (Training Impulse) Calculator
 * Based on Banister's HR-based model for quantifying training load
 * 
 * Formula: TRIMP = Duration × %HRR × 0.64 × e^(k × %HRR)
 * Where k = 1.92 for men, 1.67 for women
 */

export const FALLBACK_TRIMP_PER_MINUTE = 2.5;

export type Sex = 'MALE' | 'FEMALE';

export interface TrimpInput {
    durationMinutes: number;
    averageHr: number;
    hrMax: number;
    hrRest: number;
    sex: Sex;
}

export interface TrimpResult {
    trimp: number;
    hrReservePercent: number;
    intensityFactor: number;
}

/**
 * Calculate Heart Rate Reserve percentage
 * %HRR = (AvgHR - HRrest) / (HRmax - HRrest)
 */
export function calculateHRReserve(
    averageHr: number,
    hrMax: number,
    hrRest: number
): number {
    const hrReserve = hrMax - hrRest;
    if (hrReserve <= 0) return 0;

    const hrr = (averageHr - hrRest) / hrReserve;
    return Math.max(0, Math.min(1, hrr)); // Clamp between 0 and 1
}

/**
 * Calculate Banister's TRIMP (Training Impulse)
 * Uses exponential weighting to account for non-linear stress at higher intensities
 */
export function calculateTrimp(input: TrimpInput): TrimpResult {
    const { durationMinutes, averageHr, hrMax, hrRest, sex } = input;

    // Calculate HR reserve percentage
    const hrReservePercent = calculateHRReserve(averageHr, hrMax, hrRest);

    // Gender-specific exponential coefficient
    const k = sex === 'MALE' ? 1.92 : 1.67;

    // Calculate intensity weighting factor
    // y = 0.64 × e^(k × %HRR)
    const intensityFactor = 0.64 * Math.exp(k * hrReservePercent);

    // TRIMP = Duration × %HRR × y
    const trimp = durationMinutes * hrReservePercent * intensityFactor;

    return {
        trimp: Math.round(trimp * 10) / 10, // Round to 1 decimal
        hrReservePercent: Math.round(hrReservePercent * 1000) / 10, // Percentage
        intensityFactor: Math.round(intensityFactor * 100) / 100,
    };
}

/**
 * Calculate zone-based TRIMP (simplified version)
 * Useful when only zone time distribution is available
 * 
 * Zone coefficients:
 * Zone 1 (50-60% HRmax): 1
 * Zone 2 (60-70% HRmax): 2
 * Zone 3 (70-80% HRmax): 3
 * Zone 4 (80-90% HRmax): 4
 * Zone 5 (90-100% HRmax): 5
 */
export interface ZoneTrimpInput {
    zone1Minutes: number;
    zone2Minutes: number;
    zone3Minutes: number;
    zone4Minutes: number;
    zone5Minutes: number;
}

export function calculateZoneTrimp(input: ZoneTrimpInput): number {
    const { zone1Minutes, zone2Minutes, zone3Minutes, zone4Minutes, zone5Minutes } = input;

    const trimp =
        zone1Minutes * 1 +
        zone2Minutes * 2 +
        zone3Minutes * 3 +
        zone4Minutes * 4 +
        zone5Minutes * 5;

    return Math.round(trimp * 10) / 10;
}

/**
 * Estimate TRIMP from activity data when HR zones are available
 */
export function calculateTrimpFromZones(
    hrZone1Seconds: number | null,
    hrZone2Seconds: number | null,
    hrZone3Seconds: number | null,
    hrZone4Seconds: number | null,
    hrZone5Seconds: number | null
): number {
    return calculateZoneTrimp({
        zone1Minutes: (hrZone1Seconds ?? 0) / 60,
        zone2Minutes: (hrZone2Seconds ?? 0) / 60,
        zone3Minutes: (hrZone3Seconds ?? 0) / 60,
        zone4Minutes: (hrZone4Seconds ?? 0) / 60,
        zone5Minutes: (hrZone5Seconds ?? 0) / 60,
    });
}
