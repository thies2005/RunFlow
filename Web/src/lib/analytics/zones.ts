import { Activity } from '@prisma/client';

export type ZoneDistribution = {
    z1: number;
    z2: number;
    z3: number;
    z4: number;
    z5: number;
    z6: number;
    z7: number;
    total: number;
};

export type ZonePercentages = {
    z1: number;
    z2: number;
    z3: number;
    z4: number;
    z5: number;
    z6: number;
    z7: number;
};

/**
 * Aggegate time in zones for a list of activities
 */
export function calculateZoneDistribution(activities: Activity[]): ZoneDistribution {
    const distribution: ZoneDistribution = {
        z1: 0,
        z2: 0,
        z3: 0,
        z4: 0,
        z5: 0,
        z6: 0,
        z7: 0,
        total: 0,
    };

    for (const activity of activities) {
        if (!activity.hasHeartrate) continue;

        // Use stored zone times if available
        const z1 = activity.hrZone1Time || 0;
        const z2 = activity.hrZone2Time || 0;
        const z3 = activity.hrZone3Time || 0;
        const z4 = activity.hrZone4Time || 0;
        const z5 = activity.hrZone5Time || 0;
        const z6 = activity.hrZone6Time || 0;
        const z7 = activity.hrZone7Time || 0;

        distribution.z1 += z1;
        distribution.z2 += z2;
        distribution.z3 += z3;
        distribution.z4 += z4;
        distribution.z5 += z5;
        distribution.z6 += z6;
        distribution.z7 += z7;
        distribution.total += z1 + z2 + z3 + z4 + z5 + z6 + z7;
    }

    return distribution;
}

/**
 * Convert distribution to percentages
 */
export function calculateZonePercentages(distribution: ZoneDistribution): ZonePercentages {
    if (distribution.total === 0) {
        return { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0, z6: 0, z7: 0 };
    }

    return {
        z1: Math.round((distribution.z1 / distribution.total) * 100),
        z2: Math.round((distribution.z2 / distribution.total) * 100),
        z3: Math.round((distribution.z3 / distribution.total) * 100),
        z4: Math.round((distribution.z4 / distribution.total) * 100),
        z5: Math.round((distribution.z5 / distribution.total) * 100),
        z6: Math.round((distribution.z6 / distribution.total) * 100),
        z7: Math.round((distribution.z7 / distribution.total) * 100),
    };
}

/**
 * Calculate user heart rate zones based on HR Max and Resting HR
 * Uses Karvonen formula: TargetHR = ((max - rest) * %Intensity) + rest
 */
export function calculateUserZones(hrMax: number, hrRest: number) {
    const hrr = hrMax - hrRest;

    // Z1: 50-60% (Recovery)
    // Z2: 60-70% (Aerobic)
    // Z3: 70-80% (Tempo)
    // Z4: 80-90% (Threshold)
    // Z5: 90-95% (VO2max)
    // Z6: 95-100% (Anaerobic)
    // Z7: >100% (Neuromuscular)

    return {
        z1: { min: Math.round(hrr * 0.5 + hrRest), max: Math.round(hrr * 0.6 + hrRest) },
        z2: { min: Math.round(hrr * 0.6 + hrRest), max: Math.round(hrr * 0.7 + hrRest) },
        z3: { min: Math.round(hrr * 0.7 + hrRest), max: Math.round(hrr * 0.8 + hrRest) },
        z4: { min: Math.round(hrr * 0.8 + hrRest), max: Math.round(hrr * 0.9 + hrRest) },
        z5: { min: Math.round(hrr * 0.9 + hrRest), max: Math.round(hrr * 0.95 + hrRest) },
        z6: { min: Math.round(hrr * 0.95 + hrRest), max: Math.round(hrr * 1.0 + hrRest) },
        z7: { min: Math.round(hrr * 1.0 + hrRest), max: hrMax },
    };
}

