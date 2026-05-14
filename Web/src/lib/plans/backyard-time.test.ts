import { estimateBackyardUltraTime } from './backyard-time';

describe('estimateBackyardUltraTime', () => {
    it('returns null for invalid inputs', () => {
        expect(estimateBackyardUltraTime({ vdot: 0, loopDistM: 6706, targetLaps: 10 })).toBeNull();
        expect(estimateBackyardUltraTime({ vdot: -1, loopDistM: 6706, targetLaps: 10 })).toBeNull();
        expect(estimateBackyardUltraTime({ vdot: 50, loopDistM: 0, targetLaps: 10 })).toBeNull();
        expect(estimateBackyardUltraTime({ vdot: 50, loopDistM: 6706, targetLaps: 0 })).toBeNull();
    });

    it('returns optimal < projected < conservative', () => {
        const result = estimateBackyardUltraTime({ vdot: 50, loopDistM: 6706, targetLaps: 10 });
        expect(result).not.toBeNull();
        expect(result!.optimal.totalSeconds).toBeGreaterThan(0);
        expect(result!.optimal.totalSeconds).toBeLessThan(result!.projected.totalSeconds);
        expect(result!.projected.totalSeconds).toBeLessThan(result!.conservative.totalSeconds);
    });

    it('10 laps x 6706m is reasonable for vdot=50', () => {
        const result = estimateBackyardUltraTime({ vdot: 50, loopDistM: 6706, targetLaps: 10 });
        expect(result).not.toBeNull();
        expect(result!.optimal.totalSeconds).toBeGreaterThan(10000);
        expect(result!.optimal.totalSeconds).toBeLessThan(25000);
    });

    it('1 lap has no fatigue premium', () => {
        const result = estimateBackyardUltraTime({ vdot: 50, loopDistM: 6706, targetLaps: 1 });
        expect(result).not.toBeNull();
        expect(result!.optimal.totalSeconds).toBe(result!.optimal.perLoopSeconds);
        expect(result!.projected.totalSeconds).toBe(result!.optimal.perLoopSeconds);
        expect(result!.conservative.totalSeconds).toBe(result!.optimal.perLoopSeconds);
    });

    it('laps 1-3 have no fatigue (3 laps equal base x 3)', () => {
        const result = estimateBackyardUltraTime({ vdot: 50, loopDistM: 6706, targetLaps: 3 });
        expect(result).not.toBeNull();
        expect(result!.optimal.totalSeconds).toBe(result!.optimal.perLoopSeconds * 3);
    });

    it('total distance is loopDistM x targetLaps', () => {
        const result = estimateBackyardUltraTime({ vdot: 50, loopDistM: 6706, targetLaps: 10 });
        expect(result).not.toBeNull();
        expect(result!.optimal.totalDistM).toBe(67060);
        expect(result!.projected.totalDistM).toBe(67060);
        expect(result!.conservative.totalDistM).toBe(67060);
    });

    it('perLoopSeconds is base time without fatigue', () => {
        const result = estimateBackyardUltraTime({ vdot: 50, loopDistM: 6706, targetLaps: 10 });
        expect(result).not.toBeNull();
        expect(result!.optimal.perLoopSeconds).toBeGreaterThan(0);
        expect(result!.optimal.perLoopSeconds).toBeLessThan(result!.optimal.totalSeconds);
    });

    it('higher vdot gives faster times', () => {
        const fast = estimateBackyardUltraTime({ vdot: 60, loopDistM: 6706, targetLaps: 10 });
        const slow = estimateBackyardUltraTime({ vdot: 40, loopDistM: 6706, targetLaps: 10 });
        expect(fast!.optimal.totalSeconds).toBeLessThan(slow!.optimal.totalSeconds);
    });
});
