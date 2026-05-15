import { RaceType } from '@/generated/prisma/browser';
import { calculateVdot } from '@/lib/metrics/vdot';
import { estimateSwimPaceFromVdot } from './swim-pace';
import { estimateBikeFtpFromVdot } from './bike-zones';

interface TriathlonTimeInput {
    vdot: number;
    raceType: RaceType;
    customSwimDistM?: number;
    customBikeDistM?: number;
    customRunDistM?: number;
}

interface TriathlonTimeResult {
    totalSeconds: number;
    swimSeconds: number;
    bikeSeconds: number;
    runSeconds: number;
    t1Seconds: number;
    t2Seconds: number;
}

interface TriathlonTimeProjection {
    optimal: TriathlonTimeResult;
    projected: TriathlonTimeResult;
    conservative: TriathlonTimeResult;
}

const TRI_RACE_SWIM: Partial<Record<RaceType, number>> = {
    SPRINT_TRI: 750,
    OLYMPIC_TRI: 1500,
    HALF_IRONMAN: 1900,
    FULL_IRONMAN: 3800,
    CUSTOM_TRI: 1500,
};

const TRI_RACE_BIKE: Partial<Record<RaceType, number>> = {
    SPRINT_TRI: 20000,
    OLYMPIC_TRI: 40000,
    HALF_IRONMAN: 90000,
    FULL_IRONMAN: 180000,
    CUSTOM_TRI: 40000,
};

const TRI_RACE_RUN: Partial<Record<RaceType, number>> = {
    SPRINT_TRI: 5000,
    OLYMPIC_TRI: 10000,
    HALF_IRONMAN: 21097,
    FULL_IRONMAN: 42195,
    CUSTOM_TRI: 10000,
};

type TransitionTimes = { t1: number; t2: number };

const TRI_TRANSITIONS: Partial<Record<RaceType, TransitionTimes>> = {
    SPRINT_TRI: { t1: 120, t2: 90 },
    OLYMPIC_TRI: { t1: 150, t2: 120 },
    HALF_IRONMAN: { t1: 330, t2: 210 },
    FULL_IRONMAN: { t1: 510, t2: 360 },
};

const DEFAULT_TRANSITION: TransitionTimes = { t1: 150, t2: 120 };

function predictTimeForDistance(vdot: number, distanceM: number): number {
    let low = 600;
    let high = 18000;
    for (let i = 0; i < 50; i++) {
        const mid = (low + high) / 2;
        const testVdot = calculateVdot({ distance: distanceM, timeSeconds: mid });
        if (Math.abs(testVdot - vdot) < 0.01) return Math.round(mid);
        if (testVdot > vdot) low = mid;
        else high = mid;
    }
    return Math.round((low + high) / 2);
}

function bikePowerToSpeed(watts: number): number {
    return Math.pow(watts / 0.38, 1 / 3);
}

function computeTriathlonSplits(vdot: number, swimDistM: number, bikeDistM: number, runDistM: number, transitions: TransitionTimes): TriathlonTimeResult {
    const swimSeconds = (estimateSwimPaceFromVdot(vdot) * swimDistM) / 100;
    const ftp = estimateBikeFtpFromVdot(vdot);
    const bikeSeconds = bikeDistM / bikePowerToSpeed(ftp * 0.75);
    const runSeconds = predictTimeForDistance(vdot, runDistM);
    const totalSeconds = swimSeconds + bikeSeconds + runSeconds + transitions.t1 + transitions.t2;
    return {
        totalSeconds: Math.round(totalSeconds),
        swimSeconds: Math.round(swimSeconds),
        bikeSeconds: Math.round(bikeSeconds),
        runSeconds: Math.round(runSeconds),
        t1Seconds: transitions.t1,
        t2Seconds: transitions.t2,
    };
}

export function estimateTriathlonTime(input: TriathlonTimeInput): TriathlonTimeProjection | null {
    if (input.vdot <= 0) return null;

    const fallbackRace = input.raceType as RaceType;
    const swimDistM = (input.customSwimDistM && input.customSwimDistM > 0) ? input.customSwimDistM : (TRI_RACE_SWIM[fallbackRace] ?? TRI_RACE_SWIM.SPRINT_TRI!);
    const bikeDistM = (input.customBikeDistM && input.customBikeDistM > 0) ? input.customBikeDistM : (TRI_RACE_BIKE[fallbackRace] ?? TRI_RACE_BIKE.SPRINT_TRI!);
    const runDistM = (input.customRunDistM && input.customRunDistM > 0) ? input.customRunDistM : (TRI_RACE_RUN[fallbackRace] ?? TRI_RACE_RUN.SPRINT_TRI!);
    const transitions = TRI_TRANSITIONS[fallbackRace] ?? DEFAULT_TRANSITION;

    const optimal = computeTriathlonSplits(input.vdot, swimDistM, bikeDistM, runDistM, transitions);

    const isLongCourse = fallbackRace === 'HALF_IRONMAN' || fallbackRace === 'FULL_IRONMAN';
    const projRunMult = isLongCourse ? 1.15 : 1.10;
    const consRunMult = isLongCourse ? 1.25 : 1.20;

    const projSwim = Math.round(optimal.swimSeconds * 1.05);
    const projBike = Math.round(optimal.bikeSeconds * 1.08);
    const projRun = Math.round(optimal.runSeconds * projRunMult);
    const projected: TriathlonTimeResult = {
        totalSeconds: projSwim + projBike + projRun + optimal.t1Seconds + optimal.t2Seconds,
        swimSeconds: projSwim,
        bikeSeconds: projBike,
        runSeconds: projRun,
        t1Seconds: optimal.t1Seconds,
        t2Seconds: optimal.t2Seconds,
    };

    const consSwim = Math.round(optimal.swimSeconds * 1.10);
    const consBike = Math.round(optimal.bikeSeconds * 1.15);
    const consRun = Math.round(optimal.runSeconds * consRunMult);
    const conservative: TriathlonTimeResult = {
        totalSeconds: consSwim + consBike + consRun + optimal.t1Seconds + optimal.t2Seconds,
        swimSeconds: consSwim,
        bikeSeconds: consBike,
        runSeconds: consRun,
        t1Seconds: optimal.t1Seconds,
        t2Seconds: optimal.t2Seconds,
    };

    return { optimal, projected, conservative };
}

export type { TriathlonTimeInput, TriathlonTimeResult, TriathlonTimeProjection };
