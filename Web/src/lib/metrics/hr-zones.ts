export type HrZoneMethod = 'CUSTOM' | 'LTHR' | 'KARVONEN' | 'UNKNOWN';

export type HrZoneDefinition = {
    zone: number;
    label: string;
    min: number | null;
    max: number | null;
};

export type HrZoneInput = {
    hrZone1Max?: number | null;
    hrZone2Max?: number | null;
    hrZone3Max?: number | null;
    hrZone4Max?: number | null;
    hrZone5Max?: number | null;
    hrZone6Max?: number | null;
    thresholdHeartRate?: number | null;
    hrMax?: number | null;
    hrRest?: number | null;
};

const HR_ZONE_LABELS: Record<number, string> = {
    1: 'Z1 Recovery',
    2: 'Z2 Aerobic',
    3: 'Z3 Tempo',
    4: 'Z4 Threshold',
    5: 'Z5 VO2max',
    6: 'Z6 Anaerobic',
    7: 'Z7 Neuromuscular',
};

/**
 * Normalizes a raw HR-zone boundary value into an absolute BPM number.
 *
 * Backwards-compatible heuristic: a value <= 100 is treated as a PERCENTAGE of
 * `hrMax` (when `hrMax` is provided), because the legacy CUSTOM zone inputs
 * historically accepted percentages. A value > 100 is treated as an absolute
 * BPM.
 *
 * Bug B5: this heuristic silently misreads a low literal BPM (e.g. a Z1 max of
 * 95 BPM) as "95% of hrMax". The opt-in flags below let callers that *know*
 * their unit bypass the heuristic:
 *  - `{ asPercent: true }`  -> always interpret as a percentage of hrMax
 *  - `{ asBpm: true }`      -> always interpret as an absolute BPM
 *
 * Existing callers pass no opts and keep the legacy behaviour; new callers can
 * opt into unambiguous handling.
 */
function normalizeZoneValue(
    value: number | null | undefined,
    hrMax?: number | null,
    opts?: { asPercent?: boolean; asBpm?: boolean },
): number | null {
    if (value == null) return null;
    const rounded = Math.round(value);
    if (rounded <= 0) return null;

    // Explicit BPM: treat every value as absolute, regardless of magnitude.
    if (opts?.asBpm) {
        return rounded;
    }

    // Explicit percent (or the legacy <=100 heuristic): scale against hrMax.
    const interpretAsPercent = opts?.asPercent === true
        || (opts?.asPercent === undefined && rounded <= 100 && hrMax != null && hrMax >= 100);
    if (interpretAsPercent && hrMax != null && hrMax >= 100) {
        return Math.round(hrMax * (rounded / 100));
    }

    return rounded;
}

function isStrictlyIncreasing(values: number[]): boolean {
    for (let i = 1; i < values.length; i++) {
        if (values[i] <= values[i - 1]) return false;
    }
    return true;
}

export function buildCustomZones(input: HrZoneInput): HrZoneDefinition[] | null {
    const hrMax = input.hrMax ?? null;
    const z1 = normalizeZoneValue(input.hrZone1Max, hrMax);
    const z2 = normalizeZoneValue(input.hrZone2Max, hrMax);
    const z3 = normalizeZoneValue(input.hrZone3Max, hrMax);
    const z4 = normalizeZoneValue(input.hrZone4Max, hrMax);
    const z5 = normalizeZoneValue(input.hrZone5Max, hrMax);
    const z6 = normalizeZoneValue(input.hrZone6Max, hrMax);

    if ([z1, z2, z3, z4, z5, z6].some(v => v == null)) return null;
    const maxes = [z1!, z2!, z3!, z4!, z5!, z6!];
    if (!isStrictlyIncreasing(maxes)) return null;

    return [
        { zone: 1, label: HR_ZONE_LABELS[1], min: 0, max: z1 },
        { zone: 2, label: HR_ZONE_LABELS[2], min: z1! + 1, max: z2 },
        { zone: 3, label: HR_ZONE_LABELS[3], min: z2! + 1, max: z3 },
        { zone: 4, label: HR_ZONE_LABELS[4], min: z3! + 1, max: z4 },
        { zone: 5, label: HR_ZONE_LABELS[5], min: z4! + 1, max: z5 },
        { zone: 6, label: HR_ZONE_LABELS[6], min: z5! + 1, max: z6 },
        { zone: 7, label: HR_ZONE_LABELS[7], min: z6! + 1, max: null },
    ];
}

export function buildLthrZones(thresholdHeartRate: number | null | undefined): HrZoneDefinition[] | null {
    if (!thresholdHeartRate || thresholdHeartRate <= 0) return null;
    const lthr = Math.round(thresholdHeartRate);
    const z1 = Math.round(lthr * 0.75);
    const z2 = Math.round(lthr * 0.87);
    const z3 = Math.round(lthr * 0.94);
    const z4 = lthr;
    const z5 = Math.round(lthr * 1.05);
    const z6 = Math.round(lthr * 1.10);

    return [
        { zone: 1, label: HR_ZONE_LABELS[1], min: 0, max: z1 },
        { zone: 2, label: HR_ZONE_LABELS[2], min: z1 + 1, max: z2 },
        { zone: 3, label: HR_ZONE_LABELS[3], min: z2 + 1, max: z3 },
        { zone: 4, label: HR_ZONE_LABELS[4], min: z3 + 1, max: z4 },
        { zone: 5, label: HR_ZONE_LABELS[5], min: z4 + 1, max: z5 },
        { zone: 6, label: HR_ZONE_LABELS[6], min: z5 + 1, max: z6 },
        { zone: 7, label: HR_ZONE_LABELS[7], min: z6 + 1, max: null },
    ];
}

export function buildKarvonenZones(hrMax: number | null | undefined, hrRest: number | null | undefined): HrZoneDefinition[] | null {
    if (!hrMax || !hrRest) return null;
    if (hrMax <= 0 || hrRest <= 0 || hrMax <= hrRest) return null;
    const hrr = hrMax - hrRest;

    const z1Min = Math.round(hrr * 0.5 + hrRest);
    const z1Max = Math.round(hrr * 0.6 + hrRest);
    const z2Min = z1Max;
    const z2Max = Math.round(hrr * 0.7 + hrRest);
    const z3Min = z2Max;
    const z3Max = Math.round(hrr * 0.8 + hrRest);
    const z4Min = z3Max;
    const z4Max = Math.round(hrr * 0.9 + hrRest);
    const z5Min = z4Max;
    const z5Max = Math.round(hrr * 0.95 + hrRest);
    const z6Min = z5Max;
    const z6Max = Math.round(hrr * 1.0 + hrRest);
    const z7Min = z6Max;

    return [
        { zone: 1, label: HR_ZONE_LABELS[1], min: z1Min, max: z1Max },
        { zone: 2, label: HR_ZONE_LABELS[2], min: z2Min, max: z2Max },
        { zone: 3, label: HR_ZONE_LABELS[3], min: z3Min, max: z3Max },
        { zone: 4, label: HR_ZONE_LABELS[4], min: z4Min, max: z4Max },
        { zone: 5, label: HR_ZONE_LABELS[5], min: z5Min, max: z5Max },
        { zone: 6, label: HR_ZONE_LABELS[6], min: z6Min, max: z6Max },
        { zone: 7, label: HR_ZONE_LABELS[7], min: z7Min, max: hrMax },
    ];
}

export function resolveHrZones(input: HrZoneInput): { method: HrZoneMethod; zones: HrZoneDefinition[] | null } {
    const custom = buildCustomZones(input);
    if (custom) return { method: 'CUSTOM', zones: custom };

    const lthr = buildLthrZones(input.thresholdHeartRate);
    if (lthr) return { method: 'LTHR', zones: lthr };

    const karvonen = buildKarvonenZones(input.hrMax, input.hrRest);
    if (karvonen) return { method: 'KARVONEN', zones: karvonen };

    return { method: 'UNKNOWN', zones: null };
}

export function getZoneTarget(
    zone: number | null | undefined,
    zones: HrZoneDefinition[] | null
): { label: string; min: number | null; max: number | null } | null {
    if (!zone || zone <= 0) return null;
    if (!zones) {
        return { label: HR_ZONE_LABELS[zone] ?? `Z${zone}`, min: null, max: null };
    }
    const match = zones.find(z => z.zone === zone);
    if (!match) return { label: HR_ZONE_LABELS[zone] ?? `Z${zone}`, min: null, max: null };
    return { label: match.label, min: match.min, max: match.max };
}
