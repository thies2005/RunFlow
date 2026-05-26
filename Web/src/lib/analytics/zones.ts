import { Activity } from '@/generated/prisma/browser';
import { buildKarvonenZones, type HrZoneDefinition } from '../metrics/hr-zones';

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

export function calculateUserZones(hrMax: number, hrRest: number) {
    const zones = buildKarvonenZones(hrMax, hrRest);
    if (!zones) {
        return {
            z1: { min: 0, max: 0 },
            z2: { min: 0, max: 0 },
            z3: { min: 0, max: 0 },
            z4: { min: 0, max: 0 },
            z5: { min: 0, max: 0 },
            z6: { min: 0, max: 0 },
            z7: { min: 0, max: 0 },
        };
    }
    const toZone = (z: HrZoneDefinition) => ({ min: z.min ?? 0, max: z.max ?? 0 });
    return {
        z1: toZone(zones[0]),
        z2: toZone(zones[1]),
        z3: toZone(zones[2]),
        z4: toZone(zones[3]),
        z5: toZone(zones[4]),
        z6: toZone(zones[5]),
        z7: toZone(zones[6]),
    };
}

