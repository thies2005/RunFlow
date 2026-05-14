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

function totalBackyardTime(baseLoop: number, laps: number, fatiguePerLapPct: number): number {
    let total = 0;
    for (let i = 1; i <= laps; i++) {
        const factor = i <= 3 ? 1.0 : 1.0 + ((i - 3) * fatiguePerLapPct);
        total += baseLoop * factor;
    }
    return total;
}

export function estimateBackyardUltraTime(input: BackyardTimeInput): BackyardTimeProjection | null {
    if (input.vdot <= 0 || input.loopDistM <= 0 || input.targetLaps < 1) return null;

    const baseLoop = predictTimeForDistance(input.vdot, input.loopDistM);
    const totalDistM = input.loopDistM * input.targetLaps;

    return {
        optimal: {
            perLoopSeconds: baseLoop,
            totalSeconds: Math.round(totalBackyardTime(baseLoop, input.targetLaps, 0.01)),
            totalDistM,
            targetLaps: input.targetLaps,
        },
        projected: {
            perLoopSeconds: baseLoop,
            totalSeconds: Math.round(totalBackyardTime(baseLoop, input.targetLaps, 0.02)),
            totalDistM,
            targetLaps: input.targetLaps,
        },
        conservative: {
            perLoopSeconds: baseLoop,
            totalSeconds: Math.round(totalBackyardTime(baseLoop, input.targetLaps, 0.04)),
            totalDistM,
            targetLaps: input.targetLaps,
        },
    };
}

export type { BackyardTimeInput, BackyardTimeResult, BackyardTimeProjection };
