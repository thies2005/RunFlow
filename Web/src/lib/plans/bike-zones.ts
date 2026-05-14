export type BikeZoneRange = { min: number; max: number };

export type BikeZones = {
    recovery: BikeZoneRange;
    endurance: BikeZoneRange;
    tempo: BikeZoneRange;
    threshold: BikeZoneRange;
    vo2max: BikeZoneRange;
};

export function calculateBikeZones(ftpWatts: number): BikeZones {
    const ftp = Math.max(0, ftpWatts);

    return {
        recovery: { min: 0, max: Math.round(ftp * 0.55) },
        endurance: { min: Math.round(ftp * 0.56), max: Math.round(ftp * 0.75) },
        tempo: { min: Math.round(ftp * 0.76), max: Math.round(ftp * 0.90) },
        threshold: { min: Math.round(ftp * 0.91), max: Math.round(ftp * 1.05) },
        vo2max: { min: Math.round(ftp * 1.06), max: Math.round(ftp * 1.20) },
    };
}

export function calculateBikeZonesFromHR(hrMax: number, thresholdHR: number): BikeZones {
    const tHR = Math.max(1, thresholdHR);
    const maxHR = Math.max(tHR + 1, hrMax);
    const hrReserve = maxHR - tHR;

    const hrRange = (lowPct: number, highPct: number): BikeZoneRange => ({
        min: Math.round(tHR + hrReserve * lowPct),
        max: Math.round(tHR + hrReserve * highPct),
    });

    return {
        recovery: hrRange(-0.45, -0.35),
        endurance: hrRange(-0.34, -0.10),
        tempo: hrRange(-0.09, 0.10),
        threshold: hrRange(0.11, 0.25),
        vo2max: hrRange(0.26, 0.40),
    };
}

export function estimateBikeFtpFromVdot(vdot: number): number {
    if (vdot <= 0) return 100;

    const baseFTP = (vdot - 10) * 6 + 120;
    return Math.max(100, Math.min(400, Math.round(baseFTP)));
}
