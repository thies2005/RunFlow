export type RaceDefaults = {
    runsPerWeek: number;
    ridesPerWeek: number;
    swimsPerWeek: number;
    strengthPerWeek: number;
    weeklyVolumeKm: number;
    maxLongRunKm: number;
    taperWeeks: number;
    peakWeeks: number;
    buildWeeks: number;
    backyardLoopDistM?: number;
    targetLaps?: number;
};

export const RACE_DEFAULTS: Record<string, RaceDefaults> = {
    FIVE_K: {
        runsPerWeek: 4, ridesPerWeek: 0, swimsPerWeek: 0, strengthPerWeek: 0,
        weeklyVolumeKm: 28, maxLongRunKm: 18, taperWeeks: 1, peakWeeks: 2, buildWeeks: 4,
    },
    TEN_K: {
        runsPerWeek: 4, ridesPerWeek: 0, swimsPerWeek: 0, strengthPerWeek: 0,
        weeklyVolumeKm: 35, maxLongRunKm: 22, taperWeeks: 2, peakWeeks: 2, buildWeeks: 4,
    },
    HALF_MARATHON: {
        runsPerWeek: 4, ridesPerWeek: 0, swimsPerWeek: 0, strengthPerWeek: 0,
        weeklyVolumeKm: 45, maxLongRunKm: 24, taperWeeks: 2, peakWeeks: 2, buildWeeks: 4,
    },
    MARATHON: {
        runsPerWeek: 5, ridesPerWeek: 0, swimsPerWeek: 0, strengthPerWeek: 0,
        weeklyVolumeKm: 58, maxLongRunKm: 32, taperWeeks: 2, peakWeeks: 3, buildWeeks: 4,
    },
    FIFTY_K: {
        runsPerWeek: 5, ridesPerWeek: 0, swimsPerWeek: 0, strengthPerWeek: 1,
        weeklyVolumeKm: 70, maxLongRunKm: 35, taperWeeks: 2, peakWeeks: 3, buildWeeks: 5,
    },
    FIFTY_MILE: {
        runsPerWeek: 6, ridesPerWeek: 0, swimsPerWeek: 0, strengthPerWeek: 1,
        weeklyVolumeKm: 80, maxLongRunKm: 40, taperWeeks: 2, peakWeeks: 3, buildWeeks: 6,
    },
    HUNDRED_K: {
        runsPerWeek: 6, ridesPerWeek: 0, swimsPerWeek: 0, strengthPerWeek: 1,
        weeklyVolumeKm: 90, maxLongRunKm: 45, taperWeeks: 2, peakWeeks: 3, buildWeeks: 6,
    },
    HUNDRED_MILE: {
        runsPerWeek: 6, ridesPerWeek: 0, swimsPerWeek: 0, strengthPerWeek: 1,
        weeklyVolumeKm: 105, maxLongRunKm: 50, taperWeeks: 3, peakWeeks: 4, buildWeeks: 8,
    },
    TWELVE_HOUR: {
        runsPerWeek: 5, ridesPerWeek: 0, swimsPerWeek: 0, strengthPerWeek: 1,
        weeklyVolumeKm: 80, maxLongRunKm: 40, taperWeeks: 2, peakWeeks: 3, buildWeeks: 5,
    },
    TWENTY_FOUR_HOUR: {
        runsPerWeek: 6, ridesPerWeek: 0, swimsPerWeek: 0, strengthPerWeek: 1,
        weeklyVolumeKm: 95, maxLongRunKm: 50, taperWeeks: 3, peakWeeks: 4, buildWeeks: 6,
    },
    BACKYARD_ULTRA: {
        runsPerWeek: 5, ridesPerWeek: 0, swimsPerWeek: 0, strengthPerWeek: 1,
        weeklyVolumeKm: 60, maxLongRunKm: 35, taperWeeks: 2, peakWeeks: 3, buildWeeks: 5,
        backyardLoopDistM: 6706, targetLaps: 2,
    },
    SPRINT_TRI: {
        runsPerWeek: 3, ridesPerWeek: 2, swimsPerWeek: 2, strengthPerWeek: 1,
        weeklyVolumeKm: 25, maxLongRunKm: 15, taperWeeks: 2, peakWeeks: 2, buildWeeks: 4,
    },
    OLYMPIC_TRI: {
        runsPerWeek: 3, ridesPerWeek: 3, swimsPerWeek: 2, strengthPerWeek: 1,
        weeklyVolumeKm: 30, maxLongRunKm: 18, taperWeeks: 2, peakWeeks: 2, buildWeeks: 4,
    },
    HALF_IRONMAN: {
        runsPerWeek: 3, ridesPerWeek: 3, swimsPerWeek: 2, strengthPerWeek: 1,
        weeklyVolumeKm: 35, maxLongRunKm: 22, taperWeeks: 2, peakWeeks: 3, buildWeeks: 4,
    },
    FULL_IRONMAN: {
        runsPerWeek: 3, ridesPerWeek: 3, swimsPerWeek: 2, strengthPerWeek: 2,
        weeklyVolumeKm: 40, maxLongRunKm: 30, taperWeeks: 3, peakWeeks: 4, buildWeeks: 4,
    },
    CUSTOM_TRI: {
        runsPerWeek: 3, ridesPerWeek: 3, swimsPerWeek: 2, strengthPerWeek: 1,
        weeklyVolumeKm: 35, maxLongRunKm: 22, taperWeeks: 2, peakWeeks: 3, buildWeeks: 4,
    },
    CUSTOM_DISTANCE: {
        runsPerWeek: 4, ridesPerWeek: 0, swimsPerWeek: 0, strengthPerWeek: 0,
        weeklyVolumeKm: 40, maxLongRunKm: 25, taperWeeks: 2, peakWeeks: 2, buildWeeks: 4,
    },
};

export function getRaceDefaults(raceType: string): RaceDefaults {
    return RACE_DEFAULTS[raceType] ?? RACE_DEFAULTS.MARATHON;
}

export function adjustDefaultsForVdot(defaults: RaceDefaults, vdot: number): RaceDefaults {
    if (vdot <= 0) return defaults;
    let volumeFactor = 1.0;
    if (vdot < 30) {
        volumeFactor = 0.85;
    } else if (vdot < 40) {
        volumeFactor = 1.0;
    } else if (vdot < 50) {
        volumeFactor = 1.10;
    } else {
        volumeFactor = 1.15;
    }
    return {
        ...defaults,
        weeklyVolumeKm: Math.round(defaults.weeklyVolumeKm * volumeFactor),
        runsPerWeek: vdot < 30 ? Math.max(3, defaults.runsPerWeek - 1) : defaults.runsPerWeek,
    };
}
