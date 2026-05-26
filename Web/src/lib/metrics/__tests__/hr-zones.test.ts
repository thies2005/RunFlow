import {
    buildCustomZones,
    buildLthrZones,
    buildKarvonenZones,
    resolveHrZones,
    getZoneTarget,
} from '../hr-zones';

describe('hr-zones', () => {
    describe('buildCustomZones', () => {
        it('should return 7 zones from BPM boundaries', () => {
            const zones = buildCustomZones({
                hrZone1Max: 130,
                hrZone2Max: 148,
                hrZone3Max: 160,
                hrZone4Max: 170,
                hrZone5Max: 178,
                hrZone6Max: 187,
            });
            expect(zones).not.toBeNull();
            expect(zones!.length).toBe(7);
            expect(zones![0]).toEqual({ zone: 1, label: 'Z1 Recovery', min: 0, max: 130 });
            expect(zones![1]).toEqual({ zone: 2, label: 'Z2 Aerobic', min: 131, max: 148 });
            expect(zones![6]).toEqual({ zone: 7, label: 'Z7 Neuromuscular', min: 188, max: null });
        });

        it('should convert percent values to BPM using hrMax', () => {
            const zones = buildCustomZones({
                hrMax: 200,
                hrZone1Max: 60,
                hrZone2Max: 70,
                hrZone3Max: 80,
                hrZone4Max: 90,
                hrZone5Max: 95,
                hrZone6Max: 100,
            });
            expect(zones).not.toBeNull();
            expect(zones![0].max).toBe(120);
            expect(zones![1].max).toBe(140);
        });

        it('should return null if any zone is missing', () => {
            expect(buildCustomZones({ hrZone1Max: 130 })).toBeNull();
        });

        it('should return null if zones are not strictly increasing', () => {
            expect(buildCustomZones({
                hrZone1Max: 170,
                hrZone2Max: 148,
                hrZone3Max: 160,
                hrZone4Max: 170,
                hrZone5Max: 178,
                hrZone6Max: 187,
            })).toBeNull();
        });

        it('should return null for null/undefined zones', () => {
            expect(buildCustomZones({})).toBeNull();
            expect(buildCustomZones({
                hrZone1Max: null,
                hrZone2Max: null,
                hrZone3Max: null,
                hrZone4Max: null,
                hrZone5Max: null,
                hrZone6Max: null,
            })).toBeNull();
        });
    });

    describe('buildLthrZones', () => {
        it('should return 7 zones based on LTHR', () => {
            const zones = buildLthrZones(170);
            expect(zones).not.toBeNull();
            expect(zones!.length).toBe(7);
            expect(zones![0].max).toBe(Math.round(170 * 0.75));
            expect(zones![3].max).toBe(170);
            expect(zones![4].max).toBe(Math.round(170 * 1.05));
        });

        it('should return null for null/zero threshold', () => {
            expect(buildLthrZones(null)).toBeNull();
            expect(buildLthrZones(0)).toBeNull();
            expect(buildLthrZones(undefined)).toBeNull();
        });
    });

    describe('buildKarvonenZones', () => {
        it('should return 7 zones based on Karvonen formula', () => {
            const zones = buildKarvonenZones(200, 50);
            expect(zones).not.toBeNull();
            expect(zones!.length).toBe(7);
            const hrr = 200 - 50;
            expect(zones![0].min).toBe(Math.round(hrr * 0.5 + 50));
            expect(zones![0].max).toBe(Math.round(hrr * 0.6 + 50));
        });

        it('should return null when inputs are missing or invalid', () => {
            expect(buildKarvonenZones(null, 50)).toBeNull();
            expect(buildKarvonenZones(200, null)).toBeNull();
            expect(buildKarvonenZones(50, 200)).toBeNull();
            expect(buildKarvonenZones(0, 50)).toBeNull();
        });
    });

    describe('resolveHrZones', () => {
        it('should prefer CUSTOM when all zone boundaries are set', () => {
            const result = resolveHrZones({
                hrZone1Max: 130,
                hrZone2Max: 148,
                hrZone3Max: 160,
                hrZone4Max: 170,
                hrZone5Max: 178,
                hrZone6Max: 187,
                thresholdHeartRate: 170,
                hrMax: 200,
                hrRest: 50,
            });
            expect(result.method).toBe('CUSTOM');
            expect(result.zones).not.toBeNull();
        });

        it('should fall back to LTHR when custom zones are incomplete', () => {
            const result = resolveHrZones({
                thresholdHeartRate: 170,
                hrMax: 200,
                hrRest: 50,
            });
            expect(result.method).toBe('LTHR');
            expect(result.zones).not.toBeNull();
        });

        it('should fall back to KARVONEN when no LTHR', () => {
            const result = resolveHrZones({
                hrMax: 200,
                hrRest: 50,
            });
            expect(result.method).toBe('KARVONEN');
            expect(result.zones).not.toBeNull();
        });

        it('should return UNKNOWN when no data available', () => {
            const result = resolveHrZones({});
            expect(result.method).toBe('UNKNOWN');
            expect(result.zones).toBeNull();
        });
    });

    describe('getZoneTarget', () => {
        const zones = buildLthrZones(170);

        it('should return zone label and BPM range', () => {
            const target = getZoneTarget(2, zones);
            expect(target).not.toBeNull();
            expect(target!.label).toBe('Z2 Aerobic');
            expect(target!.min).toBeGreaterThan(0);
            expect(target!.max).toBeGreaterThan(0);
        });

        it('should return label-only when zones is null', () => {
            const target = getZoneTarget(2, null);
            expect(target).not.toBeNull();
            expect(target!.label).toBe('Z2 Aerobic');
            expect(target!.min).toBeNull();
            expect(target!.max).toBeNull();
        });

        it('should return null for undefined/zero zone', () => {
            expect(getZoneTarget(undefined, zones)).toBeNull();
            expect(getZoneTarget(0, zones)).toBeNull();
            expect(getZoneTarget(null, zones)).toBeNull();
        });

        it('should handle zone 7 with null max', () => {
            const target = getZoneTarget(7, zones);
            expect(target).not.toBeNull();
            expect(target!.label).toBe('Z7 Neuromuscular');
            expect(target!.max).toBeNull();
        });
    });
});
