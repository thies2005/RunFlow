import { WorkoutType, PlanPhase } from '@/generated/prisma/client';

export type CsvFormat = 'trainingpeaks' | 'finalsurge' | 'runflow';

export type ParsedCsvWorkout = {
    date: string;
    workoutType: string;
    phase?: string;
    name: string;
    description: string;
    distanceM?: number;
    durationS?: number;
    paceSKm?: number;
    hrZone?: number;
    structuredSteps?: object;
};

export type RunFlowCsvMetadataEntry = {
    section: string;
    field: string;
    value: string | number | null | undefined;
};

const VALID_WORKOUT_TYPES = new Set<string>(Object.values(WorkoutType));
const VALID_PHASES = new Set<string>(Object.values(PlanPhase));

function normalizeHeader(h: string): string {
    return h.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

const TRAININGPEAKS_SIGNATURE = ['date', 'title', 'type', 'totaldistance'];
const FINALSURGE_SIGNATURE = ['date', 'activitytype', 'workoutname', 'planneddistance'];
const RUNFLOW_SIGNATURE = ['date', 'workouttype', 'phase', 'distancem'];

function matchesFormat(normalizedHeaders: string[], signature: string[]): boolean {
    const headerSet = new Set(normalizedHeaders);
    return signature.every(s => headerSet.has(s));
}

function detectKnownCsvFormat(headers: string[]): CsvFormat | null {
    const normalized = headers.map(normalizeHeader);

    if (matchesFormat(normalized, TRAININGPEAKS_SIGNATURE)) return 'trainingpeaks';
    if (matchesFormat(normalized, FINALSURGE_SIGNATURE)) return 'finalsurge';
    if (matchesFormat(normalized, RUNFLOW_SIGNATURE)) return 'runflow';

    if (normalized.includes('date') && normalized.includes('title')) return 'trainingpeaks';
    if (normalized.includes('date') && normalized.includes('activitytype')) return 'finalsurge';
    if (normalized.includes('date') && normalized.includes('workouttype')) return 'runflow';

    return null;
}

export function detectCsvFormat(headers: string[]): CsvFormat {
    return detectKnownCsvFormat(headers) ?? 'runflow';
}

function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"') {
                if (i + 1 < line.length && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                current += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ',') {
                result.push(current.trim());
                current = '';
            } else {
                current += ch;
            }
        }
    }
    result.push(current.trim());
    return result;
}

function parseCsvRows(text: string): string[][] {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length === 0) return [];
    return lines.map(parseCsvLine);
}

function normalizeWorkoutType(raw: string): string {
    const lower = raw.trim().toUpperCase();
    if (VALID_WORKOUT_TYPES.has(lower)) return lower;

    const map: Record<string, string> = {
        'EASY RUN': 'EASY',
        'LONG RUN': 'LONG_RUN',
        'TEMPO RUN': 'TEMPO',
        'INTERVAL': 'INTERVALS',
        'FARTLEK': 'FARTLEK',
        'REPS': 'REPETITIONS',
        'RECOVERY RUN': 'RECOVERY',
        'RACE': 'RACE',
        'REST DAY': 'REST',
        'REST': 'REST',
        'CROSS TRAIN': 'CROSS_TRAIN',
        'CROSS TRAINING': 'CROSS_TRAIN',
        'BIKE': 'RIDE',
        'RIDE': 'RIDE',
        'SWIM': 'SWIM',
        'STRENGTH': 'STRENGTH',
        'OTHER': 'OTHER',
        'BRICK': 'BRICK',
        'OPEN WATER': 'OPEN_WATER_SWIM',
        'LONG RIDE': 'LONG_RIDE',
        'RIDE INTERVAL': 'RIDE_INTERVALS',
        'SWIM DRILL': 'SWIM_DRILL',
        'TRANSITION': 'TRANSITION_PRACTICE',
    };

    return map[lower] || map[raw.trim()] || 'OTHER';
}

function normalizePhase(raw: string | undefined): string | undefined {
    if (!raw) return undefined;
    const upper = raw.trim().toUpperCase();
    if (VALID_PHASES.has(upper)) return upper;

    const map: Record<string, string> = {
        'BASE': 'BASE',
        'BUILD': 'BUILD',
        'PEAK': 'PEAK',
        'TAPER': 'TAPER',
        'RACE WEEK': 'RACE_WEEK',
        'RACE': 'RACE_WEEK',
        'RECOVERY': 'RECOVERY',
        'ENDURANCE': 'ENDURANCE',
        'MENTAL': 'MENTAL_PREP',
        'TUNE UP': 'TUNE_UP',
        'TUNEUP': 'TUNE_UP',
        'MAINTAIN': 'MAINTAIN',
    };

    return map[upper] || undefined;
}

function parseDuration(raw: string | undefined): number | undefined {
    if (!raw || !raw.trim()) return undefined;
    const trimmed = raw.trim();

    const hmMatch = trimmed.match(/^(\d+):(\d{2}):?(\d{2})?$/);
    if (hmMatch) {
        const h = parseInt(hmMatch[1], 10);
        const m = parseInt(hmMatch[2], 10);
        const s = hmMatch[3] ? parseInt(hmMatch[3], 10) : 0;
        return h * 3600 + m * 60 + s;
    }

    const isoMatch = trimmed.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
    if (isoMatch) {
        const h = isoMatch[1] ? parseInt(isoMatch[1], 10) : 0;
        const m = isoMatch[2] ? parseInt(isoMatch[2], 10) : 0;
        const s = isoMatch[3] ? parseInt(isoMatch[3], 10) : 0;
        return h * 3600 + m * 60 + s;
    }

    if (/^\d+$/.test(trimmed)) {
        return parseInt(trimmed, 10);
    }

    return undefined;
}

function parseDistance(raw: string | undefined): number | undefined {
    if (!raw || !raw.trim()) return undefined;
    const val = parseFloat(raw.trim());
    if (isNaN(val)) return undefined;
    return val * 1000;
}

function parseMeters(raw: string | undefined): number | undefined {
    if (!raw || !raw.trim()) return undefined;
    const val = parseFloat(raw.trim());
    if (isNaN(val)) return undefined;
    return val;
}

function parsePace(raw: string | undefined): number | undefined {
    if (!raw || !raw.trim()) return undefined;
    const trimmed = raw.trim();

    const mmss = trimmed.match(/^(\d+):(\d{2})$/);
    if (mmss) {
        return parseInt(mmss[1], 10) * 60 + parseInt(mmss[2], 10);
    }

    const perKm = trimmed.match(/^(\d+):(\d{2})\s*\/\s*km$/i);
    if (perKm) {
        return parseInt(perKm[1], 10) * 60 + parseInt(perKm[2], 10);
    }

    if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
        return Math.round(parseFloat(trimmed));
    }

    return undefined;
}

function parseHrZone(raw: string | undefined): number | undefined {
    if (!raw || !raw.trim()) return undefined;
    const val = parseInt(raw.trim(), 10);
    if (isNaN(val) || val < 1 || val > 7) return undefined;
    return val;
}

function parseDate(raw: string): string | null {
    if (!raw || !raw.trim()) return null;
    const d = new Date(raw.trim());
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
}

function buildHeaderMap(headers: string[]): Map<string, number> {
    const map = new Map<string, number>();
    headers.forEach((h, i) => {
        map.set(normalizeHeader(h), i);
    });
    return map;
}

function getField(row: string[], headerMap: Map<string, number>, ...candidates: string[]): string | undefined {
    for (const c of candidates) {
        const idx = headerMap.get(normalizeHeader(c));
        if (idx !== undefined && idx < row.length && row[idx]) {
            return row[idx];
        }
    }
    return undefined;
}

function findHeaderRowIndex(rows: string[][], format?: CsvFormat): number {
    if (rows.length === 0) return 0;

    const signatureByFormat: Record<CsvFormat, string[]> = {
        trainingpeaks: TRAININGPEAKS_SIGNATURE,
        finalsurge: FINALSURGE_SIGNATURE,
        runflow: RUNFLOW_SIGNATURE,
    };

    if (format) {
        const signature = signatureByFormat[format];
        const idx = rows.findIndex(row => matchesFormat(row.map(normalizeHeader), signature));
        return idx >= 0 ? idx : 0;
    }

    const idx = rows.findIndex(row => detectKnownCsvFormat(row) !== null);
    return idx >= 0 ? idx : 0;
}

function parseRunflowRow(row: string[], headerMap: Map<string, number>): ParsedCsvWorkout | null {
    const date = parseDate(getField(row, headerMap, 'date') || '');
    if (!date) return null;

    const workoutType = normalizeWorkoutType(getField(row, headerMap, 'workouttype') || 'OTHER');
    const phase = normalizePhase(getField(row, headerMap, 'phase'));
    const name = getField(row, headerMap, 'name') || getField(row, headerMap, 'workoutname') || workoutType;
    const description = getField(row, headerMap, 'description') || '';

    return {
        date,
        workoutType,
        phase,
        name,
        description,
        distanceM: parseMeters(getField(row, headerMap, 'distancem')),
        durationS: parseDuration(getField(row, headerMap, 'durations')),
        paceSKm: parsePace(getField(row, headerMap, 'paceskm')),
        hrZone: parseHrZone(getField(row, headerMap, 'hrzone')),
        structuredSteps: undefined,
    };
}

function parseTrainingPeaksRow(row: string[], headerMap: Map<string, number>): ParsedCsvWorkout | null {
    const date = parseDate(getField(row, headerMap, 'date') || '');
    if (!date) return null;

    const workoutType = normalizeWorkoutType(getField(row, headerMap, 'type') || 'OTHER');
    const name = getField(row, headerMap, 'title') || workoutType;
    const description = getField(row, headerMap, 'description') || getField(row, headerMap, 'notes') || '';

    return {
        date,
        workoutType,
        name,
        description,
        distanceM: parseDistance(getField(row, headerMap, 'totaldistance')),
        durationS: parseDuration(getField(row, headerMap, 'totalduration')),
        paceSKm: parsePace(getField(row, headerMap, 'targetpace')),
        hrZone: parseHrZone(getField(row, headerMap, 'targetheartrate')),
        structuredSteps: undefined,
    };
}

function parseFinalSurgeRow(row: string[], headerMap: Map<string, number>): ParsedCsvWorkout | null {
    const date = parseDate(getField(row, headerMap, 'date') || '');
    if (!date) return null;

    const workoutType = normalizeWorkoutType(getField(row, headerMap, 'activitytype') || 'OTHER');
    const name = getField(row, headerMap, 'workoutname') || workoutType;
    const description = getField(row, headerMap, 'description') || getField(row, headerMap, 'notes') || '';

    return {
        date,
        workoutType,
        name,
        description,
        distanceM: parseDistance(getField(row, headerMap, 'planneddistance')),
        durationS: parseDuration(getField(row, headerMap, 'plannedduration')),
        paceSKm: parsePace(getField(row, headerMap, 'plannedpace')),
        hrZone: parseHrZone(getField(row, headerMap, 'plannedhrzone')),
        structuredSteps: undefined,
    };
}

export function parseCsv(
    csvText: string,
    format?: CsvFormat
): {
    workouts: ParsedCsvWorkout[];
    errors: Array<{ row: number; message: string }>;
    skipped: number;
} {
    const rows = parseCsvRows(csvText);
    if (rows.length < 2) {
        return { workouts: [], errors: [], skipped: 0 };
    }

    const headerRowIndex = findHeaderRowIndex(rows, format);
    const headers = rows[headerRowIndex];
    const detectedFormat = (format || detectCsvFormat(headers)) as CsvFormat;
    const headerMap = buildHeaderMap(headers);

    const workouts: ParsedCsvWorkout[] = [];
    const errors: Array<{ row: number; message: string }> = [];
    let skipped = 0;

    const parseRow = detectedFormat === 'trainingpeaks'
        ? parseTrainingPeaksRow
        : detectedFormat === 'finalsurge'
            ? parseFinalSurgeRow
            : parseRunflowRow;

    for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.every(cell => !cell)) continue;

        try {
            const workout = parseRow(row, headerMap);
            if (workout) {
                workouts.push(workout);
            } else {
                skipped++;
                errors.push({ row: i + 1, message: 'Could not parse row (missing or invalid date)' });
            }
        } catch (err) {
            skipped++;
            errors.push({ row: i + 1, message: err instanceof Error ? err.message : 'Parse error' });
        }
    }

    return { workouts, errors, skipped };
}

function csvEscape(value: string | number | null | undefined): string {
    const text = value == null ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
}

export function workoutsToRunFlowCsv(workouts: ParsedCsvWorkout[], metadata: RunFlowCsvMetadataEntry[] = []): string {
    const headers = ['date', 'workout_type', 'phase', 'name', 'description', 'distance_m', 'duration_s', 'pace_s_km', 'hr_zone', 'structured_steps'];
    const lines: string[] = [];

    if (metadata.length > 0) {
        lines.push(['section', 'field', 'value'].join(','));
        for (const entry of metadata) {
            lines.push([
                csvEscape(entry.section),
                csvEscape(entry.field),
                csvEscape(entry.value),
            ].join(','));
        }
        lines.push('');
    }

    lines.push(headers.join(','));

    for (const w of workouts) {
        const row = [
            w.date,
            w.workoutType,
            w.phase || '',
            `"${(w.name || '').replace(/"/g, '""')}"`,
            `"${(w.description || '').replace(/"/g, '""')}"`,
            w.distanceM != null ? String(w.distanceM) : '',
            w.durationS != null ? String(w.durationS) : '',
            w.paceSKm != null ? String(w.paceSKm) : '',
            w.hrZone != null ? String(w.hrZone) : '',
            w.structuredSteps ? `"${JSON.stringify(w.structuredSteps).replace(/"/g, '""')}"` : '',
        ];
        lines.push(row.join(','));
    }

    return lines.join('\n');
}

export function workoutsToTrainingPeaksCsv(workouts: ParsedCsvWorkout[]): string {
    const headers = ['Date', 'Title', 'Description', 'Type', 'Total Distance', 'Total Duration', 'Target Pace', 'Target Heart Rate', 'Notes'];
    const lines = [headers.join(',')];

    for (const w of workouts) {
        const row = [
            w.date,
            `"${(w.name || '').replace(/"/g, '""')}"`,
            `"${(w.description || '').replace(/"/g, '""')}"`,
            w.workoutType.replace(/_/g, ' '),
            w.distanceM != null ? String(w.distanceM / 1000) : '',
            w.durationS != null ? String(w.durationS) : '',
            w.paceSKm != null ? `${Math.floor(w.paceSKm / 60)}:${String(w.paceSKm % 60).padStart(2, '0')}/km` : '',
            w.hrZone != null ? String(w.hrZone) : '',
            '',
        ];
        lines.push(row.join(','));
    }

    return lines.join('\n');
}

export function workoutsToFinalSurgeCsv(workouts: ParsedCsvWorkout[]): string {
    const headers = ['Date', 'Activity Type', 'Workout Name', 'Description', 'Planned Distance', 'Planned Duration', 'Planned Pace', 'Planned HR Zone', 'Notes'];
    const lines = [headers.join(',')];

    for (const w of workouts) {
        const row = [
            w.date,
            w.workoutType.replace(/_/g, ' '),
            `"${(w.name || '').replace(/"/g, '""')}"`,
            `"${(w.description || '').replace(/"/g, '""')}"`,
            w.distanceM != null ? String(w.distanceM / 1000) : '',
            w.durationS != null ? String(w.durationS) : '',
            w.paceSKm != null ? `${Math.floor(w.paceSKm / 60)}:${String(w.paceSKm % 60).padStart(2, '0')}/km` : '',
            w.hrZone != null ? String(w.hrZone) : '',
            '',
        ];
        lines.push(row.join(','));
    }

    return lines.join('\n');
}
