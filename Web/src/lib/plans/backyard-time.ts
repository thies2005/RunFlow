import { calculateVdot } from '@/lib/metrics/vdot';

interface BackyardTimeInput {
    vdot: number;
    loopDistM: number;
    targetLaps: number;
}

interface BackyardTimeResult {
    perLoopSeconds: number;
    totalSeconds: number;
    totalDistM: number;
    targetLaps: number;
}

interface BackyardTimeProjection {
    optimal: BackyardTimeResult;
    projected: BackyardTimeResult;
    conservative: BackyardTimeResult;
}

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

function computeTotalWithFatigue(baseLoop: number, laps: number, totalDistM: number, fatigueRate: number): BackyardTimeResult {
    let totalSeconds = 0;
    for (let lap = 1; lap <= laps; lap++) {
        const fatigueMultiplier = lap <= 3 ? 1.0 : 1 + (lap - 3) * fatigueRate;
        totalSeconds += baseLoop * fatigueMultiplier;
    }
    return {
        perLoopSeconds: baseLoop,
        totalSeconds: Math.round(totalSeconds),
        totalDistM,
        targetLaps: laps,
    };
}

export function estimateBackyardUltraTime(input: BackyardTimeInput): BackyardTimeProjection | null {
    if (input.vdot <= 0 || input.loopDistM <= 0 || input.targetLaps < 1) return null;

    const baseLoop = predictTimeForDistance(input.vdot, input.loopDistM);
    const totalDistM = input.loopDistM * input.targetLaps;

    return {
        optimal: computeTotalWithFatigue(baseLoop, input.targetLaps, totalDistM, 0.03),
        projected: computeTotalWithFatigue(baseLoop, input.targetLaps, totalDistM, 0.05),
        conservative: computeTotalWithFatigue(baseLoop, input.targetLaps, totalDistM, 0.07),
    };
}

export type { BackyardTimeInput, BackyardTimeResult, BackyardTimeProjection };
