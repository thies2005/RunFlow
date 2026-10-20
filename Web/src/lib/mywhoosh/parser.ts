/**
 * Pure parsers for MyWhoosh workout-JSON and .zwo (Zwift XML) workout files.
 *
 * No network I/O of any kind — files are supplied by the user and parsed locally.
 * All outputs are canonical `StructuredWorkoutV2` workouts validated with
 * `structuredWorkoutV2Schema`.
 */
import { WorkoutType } from '@/generated/prisma/client';
import {
    structuredWorkoutV2Schema,
    type Duration,
    type RepeatGroup,
    type StepNode,
    type StructuredStep,
    type StructuredWorkoutV2,
    type Target,
} from '@/lib/plans/structured';
import type { MyWhooshStepFile, MyWhooshWorkoutFile } from './types';

const MAX_ZWO_XML_LENGTH = 5 * 1024 * 1024; // 5 MB, measured in UTF-8 bytes
const MAX_ZWO_ATTR_TEXT_LENGTH = 4096; // real .zwo attribute text is <200 bytes; tags with longer attribute runs are not matched
const MAX_ATTR_SCAN_LENGTH = 512;
const MAX_STEP_SECONDS = 86400;
const MAX_REPEAT_TIMES = 100;
const WORK_POWER_THRESHOLD = 0.85; // E_Normal/SteadyState power >= 0.85 -> work
const RAMP_WARMUP_THRESHOLD = 0.75; // E_Ramp/Ramp avg power < 0.75 -> warmup
const HARD_WORK_FTP_PERCENT = 90;
const INTERVALS_IF_THRESHOLD = 0.88;
const LONG_RIDE_MIN_SECONDS = 5400;
const LONG_RIDE_MAX_IF = 0.8;

// ==========================================
// MyWhoosh workout-JSON narrowing
// ==========================================

/**
 * Narrows ONE MyWhoosh workout-JSON object (`WorkoutStepsArray` present) into
 * `MyWhooshWorkoutFile`. Tolerant of missing/garbage fields (nulls); throws
 * `Error('Not a MyWhoosh workout file')` when `raw` is not a single object
 * with a `WorkoutStepsArray`.
 */
export function parseMyWhooshWorkoutFile(raw: unknown, fallbackName: string): MyWhooshWorkoutFile {
    if (!isRecord(raw) || !Array.isArray(raw.WorkoutStepsArray)) {
        throw new Error('Not a MyWhoosh workout file');
    }

    const name = typeof raw.Name === 'string' && raw.Name.trim() !== '' ? raw.Name : fallbackName;
    const id =
        typeof raw.Id === 'string' && raw.Id !== ''
            ? raw.Id
            : typeof raw.Id === 'number' && Number.isFinite(raw.Id)
              ? String(raw.Id)
              : hashName(name);

    return {
        id,
        name,
        description: typeof raw.Description === 'string' ? raw.Description : null,
        tss: finiteNumber(raw.TSS),
        intensityFactor: finiteNumber(raw.IF),
        durationSeconds: finiteNumber(raw.Duration),
        steps: raw.WorkoutStepsArray.flatMap(mapFileStep),
    };
}

function mapFileStep(entry: unknown): MyWhooshStepFile[] {
    if (!isRecord(entry)) return [];
    return [
        {
            stepType: typeof entry.StepType === 'string' ? entry.StepType : '',
            power: finiteNumber(entry.Power),
            startPower: finiteNumber(entry.StartPower),
            endPower: finiteNumber(entry.EndPower),
            timeSeconds: finiteNumber(entry.Time),
            rpm: finiteNumber(entry.Rpm),
            intervalId: finiteNumber(entry.IntervalId),
        },
    ];
}

// ==========================================
// MyWhoosh steps -> StructuredWorkoutV2
// ==========================================

/**
 * Maps MyWhoosh file steps to a canonical workout (`source: 'template'`).
 * Consecutive steps sharing `intervalId > 0` collapse into one `repeat` node
 * (work step + recovery step built from the pair's alternating powers, `times`
 * from the number of complete pairs; an odd trailing step is kept standalone).
 */
export function parseMyWhooshStepsToStructuredV2(steps: MyWhooshStepFile[]): StructuredWorkoutV2 {
    const nodes: StepNode[] = [];
    let i = 0;
    while (i < steps.length) {
        const groupId = steps[i].intervalId;
        if (groupId !== null && groupId > 0) {
            let j = i + 1;
            while (j < steps.length && steps[j].intervalId === groupId) j++;
            nodes.push(...intervalGroupToNodes(steps.slice(i, j)));
            i = j;
        } else {
            nodes.push(mapFileStepToNode(steps[i]));
            i++;
        }
    }
    return structuredWorkoutV2Schema.parse({ version: 2, source: 'template', steps: nodes });
}

function intervalGroupToNodes(group: MyWhooshStepFile[]): StepNode[] {
    if (group.length === 1) return [mapFileStepToNode(group[0])];

    const workTemplate = higherPowerStep(group[0], group[1]);
    const recoveryTemplate = workTemplate === group[0] ? group[1] : group[0];
    const times = clampInt(Math.floor(group.length / 2), 1, MAX_REPEAT_TIMES);
    const repeat: RepeatGroup = {
        kind: 'repeat',
        times,
        steps: [toStepNode(workTemplate, 'work'), toStepNode(recoveryTemplate, 'recovery')],
    };
    const trailing = group.length % 2 === 1 ? [mapFileStepToNode(group[group.length - 1])] : [];
    return [repeat, ...trailing];
}

function mapFileStepToNode(step: MyWhooshStepFile): StructuredStep {
    return toStepNode(step, null);
}

function toStepNode(step: MyWhooshStepFile, kindOverride: 'work' | 'recovery' | null): StructuredStep {
    const avg = avgPowerForType(step);
    let kind: StructuredStep['kind'];
    if (kindOverride !== null) {
        kind = kindOverride;
    } else if (step.stepType === 'E_WarmUp') {
        kind = 'warmup';
    } else if (step.stepType === 'E_CoolDown') {
        kind = 'cooldown';
    } else if (step.stepType === 'E_FreeRide') {
        kind = 'steady';
    } else if (step.stepType === 'E_Ramp') {
        kind = avg !== null && avg < RAMP_WARMUP_THRESHOLD ? 'warmup' : 'work';
    } else {
        kind = avg !== null && avg >= WORK_POWER_THRESHOLD ? 'work' : 'steady';
    }

    const duration = timeDuration(step.timeSeconds);
    const target: Target | undefined =
        step.stepType === 'E_FreeRide' ? { type: 'free' } : powerTarget(avg);
    const cadenceRpm = step.rpm !== null && step.rpm > 0 ? Math.round(step.rpm) : undefined;

    return {
        kind,
        duration,
        ...(target !== undefined ? { target } : {}),
        ...(cadenceRpm !== undefined ? { cadenceRpm } : {}),
    };
}

/** Average power (FTP fraction) per step type: ramp/warmup/cooldown average Start/End, E_Normal prefers Power. */
function avgPowerForType(step: MyWhooshStepFile): number | null {
    const pairAvg = avgOf(step.startPower, step.endPower);
    switch (step.stepType) {
        case 'E_WarmUp':
        case 'E_Ramp':
        case 'E_CoolDown':
            return pairAvg ?? step.power;
        default:
            return step.power ?? pairAvg;
    }
}

function higherPowerStep(a: MyWhooshStepFile, b: MyWhooshStepFile): MyWhooshStepFile {
    return (avgPowerForType(a) ?? 0) >= (avgPowerForType(b) ?? 0) ? a : b;
}

// ==========================================
// .zwo (Zwift XML) parsing
// ==========================================

// Both snake_case and camelCase tag spellings occur in the wild.
const ZWO_KNOWN_TAG_NAMES: ReadonlySet<string> = new Set([
    'warm_up', 'warmup', 'steady_state', 'steadystate', 'intervals_t', 'intervalst',
    'ramp', 'cool_down', 'cooldown', 'free_ride', 'freeride',
]);
const MAX_ZWO_TAG_NAME_LENGTH = 12; // longest known tag name ('steady_state')

function isTagNameChar(code: number): boolean {
    return (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code === 95;
}

/**
 * Monotone two-pointer tag scan: the candidate '<' (lt) and its '>' (gt) only ever
 * advance, so malformed or '>'-free input costs O(n) — no regex backtracking on the
 * outer scan (bounded-greedy `[^>]{0,N}` still measured 3.2 s on a 5 MB flood).
 * Attribute runs longer than MAX_ZWO_ATTR_TEXT_LENGTH never match (real .zwo
 * attribute text is <200 bytes). Equivalent to
 * `<(warm_up|warmup|...)\b([^>]{0,MAX})>` per candidate.
 */
function scanZwoTags(xml: string): { name: string; attrText: string }[] {
    const matches: { name: string; attrText: string }[] = [];
    let lt = xml.indexOf('<');
    let gt = -1; // first '>' not yet passed; advances monotonically
    while (lt !== -1) {
        if (gt < lt) gt = xml.indexOf('>', gt + 1);
        if (gt === -1) break; // no '>' remaining: no tag can complete
        const nameStart = lt + 1;
        let nameEnd = nameStart;
        while (nameEnd < gt && nameEnd - nameStart <= MAX_ZWO_TAG_NAME_LENGTH && isTagNameChar(xml.charCodeAt(nameEnd))) {
            nameEnd++;
        }
        const name = xml.slice(nameStart, nameEnd).toLowerCase();
        const known = name.length > 0 && name.length <= MAX_ZWO_TAG_NAME_LENGTH && ZWO_KNOWN_TAG_NAMES.has(name);
        if (known && gt - nameEnd <= MAX_ZWO_ATTR_TEXT_LENGTH) {
            matches.push({ name, attrText: xml.slice(nameEnd, gt) });
            lt = xml.indexOf('<', gt + 1);
        } else {
            lt = xml.indexOf('<', lt + 1);
        }
    }
    return matches;
}

const ZWO_ATTR = /([A-Za-z_][\w.:-]*)\s*=\s*"([^"]*)"/g;

/**
 * Bounded lightweight .zwo parser (no XML dependency): scans the known workout
 * tags with their attributes; unknown/absent tags are skipped. Throws
 * `Error('Invalid .zwo file: no workout steps found')` when nothing recognizable
 * remains. `<sportType>` is left for the caller to read for classification.
 */
export function parseZwoXmlToStructuredV2(zwoXml: string): StructuredWorkoutV2 {
    if (Buffer.byteLength(zwoXml, 'utf8') > MAX_ZWO_XML_LENGTH) {
        throw new Error('Invalid .zwo file: exceeds 5 MB size limit');
    }

    const nodes: StepNode[] = [];
    for (const { name, attrText } of scanZwoTags(zwoXml)) {
        const node = mapZwoTag(name, parseAttrs(attrText));
        if (node) nodes.push(node);
    }

    if (nodes.length === 0) {
        throw new Error('Invalid .zwo file: no workout steps found');
    }
    return structuredWorkoutV2Schema.parse({ version: 2, source: 'template', steps: nodes });
}

function mapZwoTag(tag: string, attrs: Record<string, string>): StepNode | null {
    const duration = numAttr(attrs, 'duration');
    switch (tag) {
        case 'warmup':
        case 'warm_up': {
            if (duration === null) return null;
            const avg = avgOf(numAttr(attrs, 'powerlow'), numAttr(attrs, 'powerhigh')) ?? numAttr(attrs, 'power');
            return makeStep('warmup', duration, powerTarget(avg), cadenceAttr(attrs));
        }
        case 'steadystate':
        case 'steady_state': {
            if (duration === null) return null;
            const power = numAttr(attrs, 'power') ?? avgOf(numAttr(attrs, 'powerlow'), numAttr(attrs, 'powerhigh'));
            const kind = power !== null && power >= WORK_POWER_THRESHOLD ? 'work' : 'steady';
            return makeStep(kind, duration, powerTarget(power), cadenceAttr(attrs));
        }
        case 'intervals_t':
        case 'intervalst': {
            const onDuration = numAttr(attrs, 'onduration');
            const offDuration = numAttr(attrs, 'offduration');
            if (onDuration === null && offDuration === null) return null;
            const cadence = cadenceAttr(attrs);
            const inner: StepNode[] = [];
            if (onDuration !== null) {
                inner.push(makeStep('work', onDuration, powerTarget(numAttr(attrs, 'onpower')), cadence));
            }
            if (offDuration !== null) {
                inner.push(makeStep('recovery', offDuration, powerTarget(numAttr(attrs, 'offpower')), undefined));
            }
            if (inner.length === 0) return null;
            const repeat: RepeatGroup = {
                kind: 'repeat',
                times: clampInt(numAttr(attrs, 'repeat') ?? 1, 1, MAX_REPEAT_TIMES),
                steps: inner,
            };
            return repeat;
        }
        case 'ramp': {
            if (duration === null) return null;
            const avg = avgOf(numAttr(attrs, 'powerlow'), numAttr(attrs, 'powerhigh')) ?? numAttr(attrs, 'power');
            const kind = avg !== null && avg < RAMP_WARMUP_THRESHOLD ? 'warmup' : 'work';
            return makeStep(kind, duration, powerTarget(avg), cadenceAttr(attrs));
        }
        case 'cooldown':
        case 'cool_down': {
            if (duration === null) return null;
            const avg = avgOf(numAttr(attrs, 'powerlow'), numAttr(attrs, 'powerhigh')) ?? numAttr(attrs, 'power');
            return makeStep('cooldown', duration, powerTarget(avg), cadenceAttr(attrs));
        }
        case 'freeride':
        case 'free_ride': {
            if (duration === null) return null;
            return makeStep('steady', duration, { type: 'free' }, undefined);
        }
        default:
            return null;
    }
}

function parseAttrs(text: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    // Real .zwo tags have <200 bytes of attributes total; scanning only the prefix keeps
    // '='-free junk from costing quadratic time.
    const bounded = text.length > MAX_ATTR_SCAN_LENGTH ? text.slice(0, MAX_ATTR_SCAN_LENGTH) : text;
    ZWO_ATTR.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = ZWO_ATTR.exec(bounded)) !== null) {
        attrs[match[1].toLowerCase()] = match[2];
    }
    return attrs;
}

function numAttr(attrs: Record<string, string>, key: string): number | null {
    const raw = attrs[key];
    if (raw === undefined) return null;
    const value = parseFloat(raw);
    return Number.isFinite(value) ? value : null;
}

function cadenceAttr(attrs: Record<string, string>): number | undefined {
    const value = numAttr(attrs, 'cadence');
    return value !== null && value > 0 ? Math.round(value) : undefined;
}

// ==========================================
// Classification
// ==========================================

/**
 * Classifies an imported workout. Cycling is the default: `RIDE_INTERVALS` if
 * any work step is >= 90% FTP or the file IF >= 0.88, else `LONG_RIDE` when
 * duration >= 5400 s and IF < 0.80, else `RIDE`. `.zwo` files declaring
 * `<sportType>run</sportType>` become RUN / EASY (user refines in the editor).
 */
export function classifyImportedWorkout(input: {
    name: string;
    xmlSportType?: string | null;
    steps: StructuredWorkoutV2;
    durationSeconds: number;
    intensityFactor: number | null;
}): { workoutType: WorkoutType; sport: 'RUN' | 'BIKE' } {
    if (typeof input.xmlSportType === 'string' && input.xmlSportType.trim().toLowerCase() === 'run') {
        return { workoutType: WorkoutType.EASY, sport: 'RUN' };
    }
    if (hasHardWorkStep(input.steps) || (input.intensityFactor !== null && input.intensityFactor >= INTERVALS_IF_THRESHOLD)) {
        return { workoutType: WorkoutType.RIDE_INTERVALS, sport: 'BIKE' };
    }
    if (input.durationSeconds >= LONG_RIDE_MIN_SECONDS && (input.intensityFactor ?? 0) < LONG_RIDE_MAX_IF) {
        return { workoutType: WorkoutType.LONG_RIDE, sport: 'BIKE' };
    }
    return { workoutType: WorkoutType.RIDE, sport: 'BIKE' };
}

function hasHardWorkStep(workout: StructuredWorkoutV2): boolean {
    function contains(nodes: StepNode[]): boolean {
        for (const node of nodes) {
            if (node.kind === 'repeat') {
                if (contains(node.steps)) return true;
            } else if (node.kind === 'work' && node.target?.type === 'power') {
                const pct = node.target.ftpPercent;
                if (pct !== undefined && pct >= HARD_WORK_FTP_PERCENT) return true;
            }
        }
        return false;
    }
    return contains(workout.steps);
}

// ==========================================
// Shared helpers (module-private)
// ==========================================

function makeStep(
    kind: StructuredStep['kind'],
    seconds: number,
    target: Target | undefined,
    cadenceRpm: number | undefined
): StructuredStep {
    return {
        kind,
        duration: timeDuration(seconds),
        ...(target !== undefined ? { target } : {}),
        ...(cadenceRpm !== undefined ? { cadenceRpm } : {}),
    };
}

function powerTarget(avg: number | null): Target | undefined {
    if (avg === null) return undefined;
    const ftpPercent = Math.round(avg * 100);
    return ftpPercent > 0 ? { type: 'power', ftpPercent } : undefined;
}

function timeDuration(seconds: number | null): Duration {
    if (seconds === null || seconds <= 0) return { type: 'lap_press' };
    return { type: 'time', seconds: clampInt(seconds, 1, MAX_STEP_SECONDS) };
}

function clampInt(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, Math.round(value)));
}

function avgOf(a: number | null, b: number | null): number | null {
    if (a !== null && b !== null) return (a + b) / 2;
    if (a !== null) return a;
    return b;
}

function finiteNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Deterministic short hash (djb2) used as workout id when the file has none. */
function hashName(name: string): string {
    let hash = 5381;
    for (let i = 0; i < name.length; i++) {
        hash = (Math.imul(hash, 33) + name.charCodeAt(i)) >>> 0;
    }
    return `mw-${hash.toString(16)}`;
}
