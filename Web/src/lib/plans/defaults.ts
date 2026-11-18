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
        runsPerWeek: 4, ridesPerWeek: 0, swimsPerWeek: 0, strengthPerWeek: 1,
        weeklyVolumeKm: 28, maxLongRunKm: 18, taperWeeks: 1, peakWeeks: 2, buildWeeks: 4,
    },
    TEN_K: {
        runsPerWeek: 4, ridesPerWeek: 0, swimsPerWeek: 0, strengthPerWeek: 1,
        weeklyVolumeKm: 35, maxLongRunKm: 22, taperWeeks: 2, peakWeeks: 2, buildWeeks: 4,
    },
    HALF_MARATHON: {
        runsPerWeek: 4, ridesPerWeek: 0, swimsPerWeek: 0, strengthPerWeek: 1,
        weeklyVolumeKm: 45, maxLongRunKm: 24, taperWeeks: 2, peakWeeks: 2, buildWeeks: 4,
    },
    MARATHON: {
        runsPerWeek: 5, ridesPerWeek: 0, swimsPerWeek: 0, strengthPerWeek: 1,
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
        runsPerWeek: 3, ridesPerWeek: 2, swimsPerWeek: 2, strengthPerWeek: 2,
        weeklyVolumeKm: 25, maxLongRunKm: 15, taperWeeks: 2, peakWeeks: 2, buildWeeks: 4,
    },
    OLYMPIC_TRI: {
        runsPerWeek: 3, ridesPerWeek: 3, swimsPerWeek: 2, strengthPerWeek: 2,
        weeklyVolumeKm: 30, maxLongRunKm: 18, taperWeeks: 2, peakWeeks: 2, buildWeeks: 4,
    },
    HALF_IRONMAN: {
        runsPerWeek: 3, ridesPerWeek: 3, swimsPerWeek: 2, strengthPerWeek: 2,
        weeklyVolumeKm: 35, maxLongRunKm: 22, taperWeeks: 2, peakWeeks: 3, buildWeeks: 4,
    },
    FULL_IRONMAN: {
        runsPerWeek: 3, ridesPerWeek: 3, swimsPerWeek: 2, strengthPerWeek: 3,
        weeklyVolumeKm: 40, maxLongRunKm: 30, taperWeeks: 3, peakWeeks: 4, buildWeeks: 4,
    },
    CUSTOM_TRI: {
        runsPerWeek: 3, ridesPerWeek: 3, swimsPerWeek: 2, strengthPerWeek: 2,
        weeklyVolumeKm: 35, maxLongRunKm: 22, taperWeeks: 2, peakWeeks: 3, buildWeeks: 4,
    },
    CUSTOM_DISTANCE: {
        runsPerWeek: 4, ridesPerWeek: 0, swimsPerWeek: 0, strengthPerWeek: 1,
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
        runsPerWeek: vdot < 30 ? Math.min(7, Math.max(3, defaults.runsPerWeek - 1)) : defaults.runsPerWeek,
    };
}

export function getScaledPhaseDefaults(
  raceType: string,
  planWeeks: number
): { taperWeeks: number; peakWeeks: number; buildWeeks: number } {
  const defaults = getRaceDefaults(raceType);
  let taper = defaults.taperWeeks;
  let peak = defaults.peakWeeks;
  let build = defaults.buildWeeks;
  const weeks = Math.max(1, planWeeks);
  const minBaseWeeks = weeks >= 10 ? 4 : weeks >= 8 ? 3 : weeks >= 6 ? 2 : 1;
  const phaseBudget = Math.max(1, weeks - minBaseWeeks);
  const total = taper + peak + build;
  if (total <= phaseBudget || total === 0) {
    return { taperWeeks: taper, peakWeeks: peak, buildWeeks: build };
  }
  const proportion = phaseBudget / total;
  const clampedTaper = Math.max(1, Math.round(taper * proportion));
  const clampedPeak = Math.max(1, Math.round(peak * proportion));
  const clampedBuild = Math.max(0, phaseBudget - clampedTaper - clampedPeak);
  return { taperWeeks: clampedTaper, peakWeeks: clampedPeak, buildWeeks: clampedBuild };
}

export type PlanDefaultsOverrides = {
    runsPerWeek?: number | null;
    ridesPerWeek?: number | null;
    swimsPerWeek?: number | null;
    strengthPerWeek?: number | null;
    weeklyVolumeKm?: number | null;
    maxLongRunKm?: number | null;
    taperWeeks?: number | null;
    peakWeeks?: number | null;
    buildWeeks?: number | null;
    longRunDay?: number | null;
    workoutDay?: number | null;
    swimDay?: number | null;
};

export type AppliedPlanDefaults = RaceDefaults & {
    longRunDay: number;
    workoutDay: number;
    swimDay?: number;
};

export function applyPlanDefaults(
    paramsOrRaceType?: string | null | (PlanDefaultsOverrides & { raceType?: string | null; vdot?: number | null }),
    vdotArg?: number | null,
    overridesArg?: PlanDefaultsOverrides
): AppliedPlanDefaults {
    let raceType = 'MARATHON';
    let vdot: number | null | undefined = vdotArg;
    let overrides: PlanDefaultsOverrides | undefined = overridesArg;

    if (typeof paramsOrRaceType === 'object' && paramsOrRaceType !== null) {
        if (paramsOrRaceType.raceType) raceType = paramsOrRaceType.raceType;
        if (paramsOrRaceType.vdot !== undefined) vdot = paramsOrRaceType.vdot;
        overrides = paramsOrRaceType;
    } else if (typeof paramsOrRaceType === 'string') {
        raceType = paramsOrRaceType;
    }

    const base = getRaceDefaults(raceType);
    const adjusted = vdot && vdot > 0 ? adjustDefaultsForVdot(base, vdot) : base;
    const isTri = ['SPRINT_TRI', 'OLYMPIC_TRI', 'HALF_IRONMAN', 'FULL_IRONMAN', 'CUSTOM_TRI'].includes(raceType);

    return {
        ...adjusted,
        runsPerWeek: (overrides?.runsPerWeek !== undefined && overrides.runsPerWeek !== null && overrides.runsPerWeek > 0)
            ? overrides.runsPerWeek
            : adjusted.runsPerWeek,
        ridesPerWeek: (overrides?.ridesPerWeek !== undefined && overrides.ridesPerWeek !== null && (!isTri || overrides.ridesPerWeek > 0))
            ? overrides.ridesPerWeek
            : adjusted.ridesPerWeek,
        swimsPerWeek: (overrides?.swimsPerWeek !== undefined && overrides.swimsPerWeek !== null && (!isTri || overrides.swimsPerWeek > 0))
            ? overrides.swimsPerWeek
            : adjusted.swimsPerWeek,
        strengthPerWeek: (overrides?.strengthPerWeek !== undefined && overrides.strengthPerWeek !== null && overrides.strengthPerWeek >= 0)
            ? overrides.strengthPerWeek
            : adjusted.strengthPerWeek,
        weeklyVolumeKm: (overrides?.weeklyVolumeKm !== undefined && overrides.weeklyVolumeKm !== null && overrides.weeklyVolumeKm > 0)
            ? overrides.weeklyVolumeKm
            : adjusted.weeklyVolumeKm,
        maxLongRunKm: (overrides?.maxLongRunKm !== undefined && overrides.maxLongRunKm !== null && overrides.maxLongRunKm > 0)
            ? overrides.maxLongRunKm
            : adjusted.maxLongRunKm,
        taperWeeks: (overrides?.taperWeeks !== undefined && overrides.taperWeeks !== null && overrides.taperWeeks >= 0)
            ? overrides.taperWeeks
            : adjusted.taperWeeks,
        peakWeeks: (overrides?.peakWeeks !== undefined && overrides.peakWeeks !== null && overrides.peakWeeks >= 0)
            ? overrides.peakWeeks
            : adjusted.peakWeeks,
        buildWeeks: (overrides?.buildWeeks !== undefined && overrides.buildWeeks !== null && overrides.buildWeeks >= 0)
            ? overrides.buildWeeks
            : adjusted.buildWeeks,
        longRunDay: (overrides?.longRunDay !== undefined && overrides.longRunDay !== null) ? overrides.longRunDay : 0,
        workoutDay: (overrides?.workoutDay !== undefined && overrides.workoutDay !== null) ? overrides.workoutDay : 3,
        swimDay: (overrides?.swimDay !== undefined && overrides.swimDay !== null) ? overrides.swimDay : undefined,
    };
}
