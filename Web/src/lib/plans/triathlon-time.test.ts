import { RaceType } from '@/generated/prisma/browser';
import { estimateTriathlonTime } from './triathlon-time';

describe('estimateTriathlonTime', () => {
    it('returns null for invalid vdot', () => {
        expect(estimateTriathlonTime({ vdot: 0, raceType: RaceType.OLYMPIC_TRI })).toBeNull();
        expect(estimateTriathlonTime({ vdot: -1, raceType: RaceType.OLYMPIC_TRI })).toBeNull();
    });

    it('returns optimal < projected < conservative for Olympic tri', () => {
        const result = estimateTriathlonTime({ vdot: 50, raceType: RaceType.OLYMPIC_TRI });
        expect(result).not.toBeNull();
        expect(result!.optimal.totalSeconds).toBeGreaterThan(0);
        expect(result!.optimal.totalSeconds).toBeLessThan(result!.projected.totalSeconds);
        expect(result!.projected.totalSeconds).toBeLessThan(result!.conservative.totalSeconds);
    });

    it('Olympic tri vdot=50 total is reasonable', () => {
        const result = estimateTriathlonTime({ vdot: 50, raceType: RaceType.OLYMPIC_TRI });
        expect(result).not.toBeNull();
        expect(result!.optimal.totalSeconds).toBeGreaterThan(7200);
        expect(result!.optimal.totalSeconds).toBeLessThan(50000);
    });

    it('Full Ironman vdot=40 total is reasonable', () => {
        const result = estimateTriathlonTime({ vdot: 40, raceType: RaceType.FULL_IRONMAN });
        expect(result).not.toBeNull();
        expect(result!.optimal.totalSeconds).toBeGreaterThan(100000);
        expect(result!.optimal.totalSeconds).toBeLessThan(200000);
    });

    it('uses custom distances when provided and > 0', () => {
        const result = estimateTriathlonTime({
            vdot: 50,
            raceType: RaceType.SPRINT_TRI,
            customSwimDistM: 1500,
            customBikeDistM: 40000,
            customRunDistM: 10000,
        });
        expect(result).not.toBeNull();
        const sprint = estimateTriathlonTime({ vdot: 50, raceType: RaceType.SPRINT_TRI });
        expect(result!.optimal.totalSeconds).toBeGreaterThan(sprint!.optimal.totalSeconds);
    });

    it('ignores custom distance of 0 (falls back to default)', () => {
        const result = estimateTriathlonTime({
            vdot: 50,
            raceType: RaceType.SPRINT_TRI,
            customSwimDistM: 0,
        });
        const defaultResult = estimateTriathlonTime({ vdot: 50, raceType: RaceType.SPRINT_TRI });
        expect(result!.optimal.totalSeconds).toBe(defaultResult!.optimal.totalSeconds);
    });

    it('CUSTOM_TRI falls back to sprint distances with default transitions', () => {
        const result = estimateTriathlonTime({ vdot: 50, raceType: 'CUSTOM_TRI' as RaceType });
        expect(result).not.toBeNull();
        const sprint = estimateTriathlonTime({ vdot: 50, raceType: RaceType.SPRINT_TRI });
        expect(result!.optimal.swimSeconds).toBe(sprint!.optimal.swimSeconds);
        expect(result!.optimal.bikeSeconds).toBe(sprint!.optimal.bikeSeconds);
        expect(result!.optimal.runSeconds).toBe(sprint!.optimal.runSeconds);
    });

    it('long course has larger run degradation', () => {
        const half = estimateTriathlonTime({ vdot: 45, raceType: RaceType.HALF_IRONMAN });
        const sprint = estimateTriathlonTime({ vdot: 45, raceType: RaceType.SPRINT_TRI });
        expect(half).not.toBeNull();
        expect(sprint).not.toBeNull();
        const halfRunDeg = half!.conservative.runSeconds / half!.optimal.runSeconds;
        const sprintRunDeg = sprint!.conservative.runSeconds / sprint!.optimal.runSeconds;
        expect(halfRunDeg).toBeGreaterThan(sprintRunDeg);
    });

    it('splits sum equals total', () => {
        const result = estimateTriathlonTime({ vdot: 50, raceType: RaceType.OLYMPIC_TRI });
        expect(result).not.toBeNull();
        const { swimSeconds, bikeSeconds, runSeconds, t1Seconds, t2Seconds, totalSeconds } = result!.optimal;
        expect(swimSeconds + bikeSeconds + runSeconds + t1Seconds + t2Seconds).toBe(totalSeconds);
    });
});
