import { parseStructuredWorkout, type StepNode, type StructuredStep, type RepeatGroup } from './structured';

/**
 * Standard Garmin FIT CRC-16 lookup table (16-element nibble table).
 */
const CRC_TABLE = [
    0x0000, 0xCC01, 0xD801, 0x1400, 0xF001, 0x3C00, 0x2800, 0xE401,
    0xA001, 0x6C00, 0x7800, 0xB401, 0x5000, 0x9C01, 0x8801, 0x4400,
];

export function updateFitCrc(crc: number, byte: number): number {
    let tmp = CRC_TABLE[crc & 0xF];
    crc = (crc >> 4) & 0x0FFF;
    crc = crc ^ tmp ^ CRC_TABLE[byte & 0xF];
    tmp = CRC_TABLE[crc & 0xF];
    crc = (crc >> 4) & 0x0FFF;
    crc = crc ^ tmp ^ CRC_TABLE[(byte >> 4) & 0xF];
    return crc & 0xFFFF;
}

export function computeFitCrc(bytes: Uint8Array, start = 0, end = bytes.length): number {
    let crc = 0;
    for (let i = start; i < end; i++) {
        crc = updateFitCrc(crc, bytes[i]);
    }
    return crc & 0xFFFF;
}

// FIT Base Types
const BASE_TYPE_ENUM = 0x00;
const BASE_TYPE_UINT16 = 0x84;
const BASE_TYPE_UINT32 = 0x86;
const BASE_TYPE_STRING = 0x07;
const BASE_TYPE_UINT32Z = 0x8C;

// Global Message Numbers
const MESG_NUM_FILE_ID = 0;
const MESG_NUM_WORKOUT = 26;
const MESG_NUM_WORKOUT_STEP = 27;

// FIT Sport enum
const SPORT_GENERIC = 0;
const SPORT_RUNNING = 1;
const SPORT_CYCLING = 2;
const SPORT_SWIMMING = 5;
const SPORT_TRAINING = 10;

// FIT Intensity enum
export const FIT_INTENSITY = {
    ACTIVE: 0,
    REST: 1,
    WARMUP: 2,
    COOLDOWN: 3,
} as const;

// FIT Duration Type enum
export const FIT_DURATION_TYPE = {
    TIME: 0,
    DISTANCE: 1,
    OPEN: 5,
    REPEAT_UNTIL_STEPS_CMPLT: 6,
} as const;

// FIT Target Type enum
export const FIT_TARGET_TYPE = {
    SPEED: 0,
    HEART_RATE: 1,
    OPEN: 2,
    POWER: 4,
} as const;

export interface FitStepDescriptor {
    name: string;
    durationType: number;
    durationValue: number; // time in ms, distance in cm, or loop back step index
    targetType: number;
    targetValue: number; // repeat count, or zone, or 0
    targetLow: number; // speed mm/s, HR +100, power +1000
    targetHigh: number;
    intensity: number;
}

/**
 * Builds the binary FIT payload for definition + data messages of a workout.
 */
class FitBufferWriter {
    private buffer: number[] = [];

    writeUint8(val: number): void {
        this.buffer.push(val & 0xFF);
    }

    writeUint16LE(val: number): void {
        this.buffer.push(val & 0xFF);
        this.buffer.push((val >> 8) & 0xFF);
    }

    writeUint32LE(val: number): void {
        this.buffer.push(val & 0xFF);
        this.buffer.push((val >> 8) & 0xFF);
        this.buffer.push((val >> 16) & 0xFF);
        this.buffer.push((val >> 24) & 0xFF);
    }

    writeString(str: string, fixedLength: number): void {
        const utf8: number[] = [];
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i);
            if (code < 0x80) {
                utf8.push(code);
            } else if (code < 0x800) {
                utf8.push(0xC0 | (code >> 6), 0x80 | (code & 0x3F));
            } else {
                utf8.push(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
            }
        }
        for (let i = 0; i < fixedLength; i++) {
            if (i < utf8.length && i < fixedLength - 1) {
                this.buffer.push(utf8[i]);
            } else {
                this.buffer.push(0x00); // null padding
            }
        }
    }

    getBytes(): Uint8Array {
        return new Uint8Array(this.buffer);
    }
}

/**
 * Converts sport strings to FIT sport enum.
 */
export function resolveFitSport(sport?: string | null, workoutType?: string | null): number {
    const s = (sport || workoutType || '').toUpperCase();
    if (s.includes('BIKE') || s.includes('RIDE') || s.includes('CYCL')) return SPORT_CYCLING;
    if (s.includes('SWIM')) return SPORT_SWIMMING;
    if (s.includes('STRENGTH') || s.includes('GYM') || s.includes('CORE')) return SPORT_TRAINING;
    if (s.includes('RUN') || s.includes('INTERVAL') || s.includes('TEMPO') || s.includes('FARTLEK')) return SPORT_RUNNING;
    return SPORT_GENERIC;
}

/**
 * Transforms structured steps or target fallbacks into a sequential list of FitStepDescriptors.
 */
export function buildFitStepDescriptors(
    workout: Record<string, unknown>,
    defaultFtp = 200
): FitStepDescriptor[] {
    const descriptors: FitStepDescriptor[] = [];

    // Attempt to parse StructuredWorkoutV2 if present
    const rawSteps = workout.structuredSteps || (workout as { structuredStepsJson?: string }).structuredStepsJson;
    const v2 = rawSteps ? parseStructuredWorkout(rawSteps, workout.sport as string || workout.workoutType as string) : null;

    if (v2 && v2.steps && v2.steps.length > 0) {
        function emitStructuredStep(step: StructuredStep): void {
            let durType: number = FIT_DURATION_TYPE.OPEN;
            let durVal = 0;
            if (step.duration.type === 'time') {
                durType = FIT_DURATION_TYPE.TIME;
                durVal = Math.round(step.duration.seconds * 1000);
            } else if (step.duration.type === 'distance') {
                durType = FIT_DURATION_TYPE.DISTANCE;
                durVal = Math.round(step.duration.meters * 100);
            } else {
                durType = FIT_DURATION_TYPE.OPEN;
                durVal = 0;
            }

            let targetType: number = FIT_TARGET_TYPE.OPEN;
            let targetVal = 0;
            let targetLow = 0;
            let targetHigh = 0;

            if (step.target) {
                if (step.target.type === 'pace') {
                    targetType = FIT_TARGET_TYPE.SPEED;
                    const p = step.target;
                    const minPace = p.min || p.max || 300;
                    const maxPace = p.max || p.min || 300;
                    // Smaller pace = higher speed
                    targetLow = Math.round(1_000_000 / Math.max(1, maxPace));
                    targetHigh = Math.round(1_000_000 / Math.max(1, minPace));
                } else if (step.target.type === 'hr') {
                    targetType = FIT_TARGET_TYPE.HEART_RATE;
                    const hr = step.target;
                    if (hr.minBpm || hr.maxBpm) {
                        targetLow = (hr.minBpm || hr.maxBpm || 140) + 100;
                        targetHigh = (hr.maxBpm || hr.minBpm || 160) + 100;
                    } else if (hr.zone) {
                        targetVal = hr.zone;
                    }
                } else if (step.target.type === 'power') {
                    targetType = FIT_TARGET_TYPE.POWER;
                    const p = step.target;
                    if (p.minWatts || p.maxWatts) {
                        targetLow = (p.minWatts || p.maxWatts || 200) + 1000;
                        targetHigh = (p.maxWatts || p.minWatts || 200) + 1000;
                    } else if (p.ftpPercent) {
                        const w = Math.round((defaultFtp * p.ftpPercent) / 100);
                        targetLow = w + 1000;
                        targetHigh = w + 1000;
                    }
                }
            }

            let intensity: number = FIT_INTENSITY.ACTIVE;
            if (step.kind === 'warmup') intensity = FIT_INTENSITY.WARMUP;
            else if (step.kind === 'cooldown') intensity = FIT_INTENSITY.COOLDOWN;
            else if (step.kind === 'recovery') intensity = FIT_INTENSITY.REST;

            descriptors.push({
                name: step.label || step.kind,
                durationType: durType,
                durationValue: durVal,
                targetType,
                targetValue: targetVal,
                targetLow,
                targetHigh,
                intensity,
            });
        }

        function emitNode(node: StepNode): void {
            if (node.kind === 'repeat') {
                const repeatGroup = node as RepeatGroup;
                const startIndex = descriptors.length;
                for (const child of repeatGroup.steps) {
                    emitNode(child);
                }
                const times = Math.max(1, repeatGroup.times);
                if (times > 1) {
                    descriptors.push({
                        name: repeatGroup.label || 'Repeat',
                        durationType: FIT_DURATION_TYPE.REPEAT_UNTIL_STEPS_CMPLT,
                        durationValue: startIndex, // step to loop back to
                        targetType: FIT_TARGET_TYPE.OPEN,
                        targetValue: times,
                        targetLow: 0,
                        targetHigh: 0,
                        intensity: FIT_INTENSITY.ACTIVE,
                    });
                }
                if (repeatGroup.setRest) {
                    let restDur = 120_000;
                    let restType: number = FIT_DURATION_TYPE.TIME;
                    if (repeatGroup.setRest.type === 'time') {
                        restDur = repeatGroup.setRest.seconds * 1000;
                    } else if (repeatGroup.setRest.type === 'distance') {
                        restDur = Math.round(repeatGroup.setRest.meters * 100);
                        restType = FIT_DURATION_TYPE.DISTANCE;
                    }
                    descriptors.push({
                        name: 'Set Rest',
                        durationType: restType,
                        durationValue: restDur,
                        targetType: FIT_TARGET_TYPE.OPEN,
                        targetValue: 0,
                        targetLow: 0,
                        targetHigh: 0,
                        intensity: FIT_INTENSITY.REST,
                    });
                }
            } else {
                emitStructuredStep(node as StructuredStep);
            }
        }

        for (const node of v2.steps) {
            emitNode(node);
        }
    } else {
        // Fallback: build simple warmup / main / cooldown from targets
        const totalDurationSec = (workout.targetDurationSec || workout.targetDuration || 0) as number;
        const totalDistanceKm = (workout.targetDistanceKm || workout.targetDistance || 0) as number;
        const totalDistanceMeters = Math.round(totalDistanceKm * 1000);

        // Target derivation
        let mainTargetType: number = FIT_TARGET_TYPE.OPEN;
        let mainTargetVal = 0;
        let mainTargetLow = 0;
        let mainTargetHigh = 0;

        const targetPower = (workout.targetPowerWatts || 0) as number;
        const targetPowerMin = (workout.targetPowerMinWatts || targetPower) as number;
        const targetPowerMax = (workout.targetPowerMaxWatts || targetPower) as number;

        const paceMin = (workout.targetPaceMinSecPerKm || workout.targetPaceMinSecondsPerKm || workout.targetPaceSecPerKm || workout.targetPace || 0) as number;
        const paceMax = (workout.targetPaceMaxSecPerKm || workout.targetPaceMaxSecondsPerKm || paceMin) as number;

        const hrMin = (workout.targetHrMinBpm || 0) as number;
        const hrMax = (workout.targetHrMaxBpm || hrMin) as number;
        const hrZone = (workout.targetHrZone || 0) as number;

        if (targetPower > 0 || targetPowerMin > 0) {
            mainTargetType = FIT_TARGET_TYPE.POWER;
            mainTargetLow = (targetPowerMin || targetPower) + 1000;
            mainTargetHigh = (targetPowerMax || targetPower) + 1000;
        } else if (paceMin > 0) {
            mainTargetType = FIT_TARGET_TYPE.SPEED;
            mainTargetLow = Math.round(1_000_000 / Math.max(1, paceMax));
            mainTargetHigh = Math.round(1_000_000 / Math.max(1, paceMin));
        } else if (hrMin > 0) {
            mainTargetType = FIT_TARGET_TYPE.HEART_RATE;
            mainTargetLow = hrMin + 100;
            mainTargetHigh = hrMax + 100;
        } else if (hrZone > 0) {
            mainTargetType = FIT_TARGET_TYPE.HEART_RATE;
            mainTargetVal = hrZone;
        }

        if (totalDistanceMeters > 2000) {
            const warmDist = Math.round(totalDistanceMeters * 0.15);
            const coolDist = Math.round(totalDistanceMeters * 0.15);
            const mainDist = totalDistanceMeters - warmDist - coolDist;

            descriptors.push({
                name: 'Warmup',
                durationType: FIT_DURATION_TYPE.DISTANCE,
                durationValue: warmDist * 100,
                targetType: FIT_TARGET_TYPE.OPEN,
                targetValue: 0,
                targetLow: 0,
                targetHigh: 0,
                intensity: FIT_INTENSITY.WARMUP,
            });
            descriptors.push({
                name: 'Main',
                durationType: FIT_DURATION_TYPE.DISTANCE,
                durationValue: mainDist * 100,
                targetType: mainTargetType,
                targetValue: mainTargetVal,
                targetLow: mainTargetLow,
                targetHigh: mainTargetHigh,
                intensity: FIT_INTENSITY.ACTIVE,
            });
            descriptors.push({
                name: 'Cooldown',
                durationType: FIT_DURATION_TYPE.DISTANCE,
                durationValue: coolDist * 100,
                targetType: FIT_TARGET_TYPE.OPEN,
                targetValue: 0,
                targetLow: 0,
                targetHigh: 0,
                intensity: FIT_INTENSITY.COOLDOWN,
            });
        } else if (totalDurationSec >= 900) {
            const warmSec = Math.min(600, Math.round(totalDurationSec * 0.15));
            const coolSec = Math.min(600, Math.round(totalDurationSec * 0.15));
            const mainSec = totalDurationSec - warmSec - coolSec;

            descriptors.push({
                name: 'Warmup',
                durationType: FIT_DURATION_TYPE.TIME,
                durationValue: warmSec * 1000,
                targetType: FIT_TARGET_TYPE.OPEN,
                targetValue: 0,
                targetLow: 0,
                targetHigh: 0,
                intensity: FIT_INTENSITY.WARMUP,
            });
            descriptors.push({
                name: 'Main',
                durationType: FIT_DURATION_TYPE.TIME,
                durationValue: mainSec * 1000,
                targetType: mainTargetType,
                targetValue: mainTargetVal,
                targetLow: mainTargetLow,
                targetHigh: mainTargetHigh,
                intensity: FIT_INTENSITY.ACTIVE,
            });
            descriptors.push({
                name: 'Cooldown',
                durationType: FIT_DURATION_TYPE.TIME,
                durationValue: coolSec * 1000,
                targetType: FIT_TARGET_TYPE.OPEN,
                targetValue: 0,
                targetLow: 0,
                targetHigh: 0,
                intensity: FIT_INTENSITY.COOLDOWN,
            });
        } else {
            // Short session or open duration
            const dur = totalDurationSec > 0 ? totalDurationSec * 1000 : (totalDistanceMeters > 0 ? totalDistanceMeters * 100 : 1800 * 1000);
            const durType = totalDurationSec > 0 ? FIT_DURATION_TYPE.TIME : (totalDistanceMeters > 0 ? FIT_DURATION_TYPE.DISTANCE : FIT_DURATION_TYPE.TIME);
            descriptors.push({
                name: (workout.workoutType || 'Workout') as string,
                durationType: durType,
                durationValue: dur,
                targetType: mainTargetType,
                targetValue: mainTargetVal,
                targetLow: mainTargetLow,
                targetHigh: mainTargetHigh,
                intensity: FIT_INTENSITY.ACTIVE,
            });
        }
    }

    return descriptors;
}

/**
 * Encodes a workout object into a binary Garmin FIT file (Uint8Array) with zero external dependencies.
 */
export function exportWorkoutFit(workout: unknown, defaultFtp = 200): Uint8Array {
    const w = (workout || {}) as Record<string, unknown>;
    const sport = resolveFitSport(w.sport as string, w.workoutType as string);
    const title = ((w.customName || w.workoutType || 'Workout') as string).slice(0, 15);
    const steps = buildFitStepDescriptors(w, defaultFtp);

    const writer = new FitBufferWriter();

    // 1. Definition Message for File ID (Local 0, Global 0)
    writer.writeUint8(0x40); // Definition, local mesg 0
    writer.writeUint8(0x00); // Reserved
    writer.writeUint8(0x00); // Little Endian
    writer.writeUint16LE(MESG_NUM_FILE_ID);
    writer.writeUint8(5); // 5 fields
    // Field 0: type (enum, 1 byte)
    writer.writeUint8(0); writer.writeUint8(1); writer.writeUint8(BASE_TYPE_ENUM);
    // Field 1: manufacturer (uint16, 2 bytes)
    writer.writeUint8(1); writer.writeUint8(2); writer.writeUint8(BASE_TYPE_UINT16);
    // Field 2: product (uint16, 2 bytes)
    writer.writeUint8(2); writer.writeUint8(2); writer.writeUint8(BASE_TYPE_UINT16);
    // Field 3: serial_number (uint32z, 4 bytes)
    writer.writeUint8(3); writer.writeUint8(4); writer.writeUint8(BASE_TYPE_UINT32Z);
    // Field 4: time_created (uint32, 4 bytes)
    writer.writeUint8(4); writer.writeUint8(4); writer.writeUint8(BASE_TYPE_UINT32);

    // 1b. Data Message for File ID
    const fitEpochSecs = Math.max(0, Math.floor(Date.now() / 1000) - 631065600);
    writer.writeUint8(0x00); // Data, local mesg 0
    writer.writeUint8(5); // file_type = workout (5)
    writer.writeUint16LE(255); // manufacturer = development (255)
    writer.writeUint16LE(0); // product
    writer.writeUint32LE(0); // serial
    writer.writeUint32LE(fitEpochSecs); // time_created

    // 2. Definition Message for Workout (Local 1, Global 26)
    writer.writeUint8(0x41); // Definition, local mesg 1
    writer.writeUint8(0x00);
    writer.writeUint8(0x00);
    writer.writeUint16LE(MESG_NUM_WORKOUT);
    writer.writeUint8(4); // 4 fields
    // Field 4: sport (enum, 1 byte)
    writer.writeUint8(4); writer.writeUint8(1); writer.writeUint8(BASE_TYPE_ENUM);
    // Field 5: capabilities (uint32z, 4 bytes)
    writer.writeUint8(5); writer.writeUint8(4); writer.writeUint8(BASE_TYPE_UINT32Z);
    // Field 6: num_valid_steps (uint16, 2 bytes)
    writer.writeUint8(6); writer.writeUint8(2); writer.writeUint8(BASE_TYPE_UINT16);
    // Field 8: wkt_name (string, 16 bytes)
    writer.writeUint8(8); writer.writeUint8(16); writer.writeUint8(BASE_TYPE_STRING);

    // 2b. Data Message for Workout
    writer.writeUint8(0x01); // Data, local mesg 1
    writer.writeUint8(sport);
    writer.writeUint32LE(0x20); // capabilities: custom workout
    writer.writeUint16LE(steps.length);
    writer.writeString(title, 16);

    // 3. Definition Message for Workout Step (Local 2, Global 27)
    writer.writeUint8(0x42); // Definition, local mesg 2
    writer.writeUint8(0x00);
    writer.writeUint8(0x00);
    writer.writeUint16LE(MESG_NUM_WORKOUT_STEP);
    writer.writeUint8(9); // 9 fields
    // Field 254: message_index (uint16, 2 bytes)
    writer.writeUint8(254); writer.writeUint8(2); writer.writeUint8(BASE_TYPE_UINT16);
    // Field 0: wkt_step_name (string, 16 bytes)
    writer.writeUint8(0); writer.writeUint8(16); writer.writeUint8(BASE_TYPE_STRING);
    // Field 1: duration_type (enum, 1 byte)
    writer.writeUint8(1); writer.writeUint8(1); writer.writeUint8(BASE_TYPE_ENUM);
    // Field 2: duration_value (uint32, 4 bytes)
    writer.writeUint8(2); writer.writeUint8(4); writer.writeUint8(BASE_TYPE_UINT32);
    // Field 3: target_type (enum, 1 byte)
    writer.writeUint8(3); writer.writeUint8(1); writer.writeUint8(BASE_TYPE_ENUM);
    // Field 4: target_value (uint32, 4 bytes)
    writer.writeUint8(4); writer.writeUint8(4); writer.writeUint8(BASE_TYPE_UINT32);
    // Field 5: custom_target_value_low (uint32, 4 bytes)
    writer.writeUint8(5); writer.writeUint8(4); writer.writeUint8(BASE_TYPE_UINT32);
    // Field 6: custom_target_value_high (uint32, 4 bytes)
    writer.writeUint8(6); writer.writeUint8(4); writer.writeUint8(BASE_TYPE_UINT32);
    // Field 7: intensity (enum, 1 byte)
    writer.writeUint8(7); writer.writeUint8(1); writer.writeUint8(BASE_TYPE_ENUM);

    // 3b. Data Messages for each step
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        writer.writeUint8(0x02); // Data, local mesg 2
        writer.writeUint16LE(i);
        writer.writeString(step.name, 16);
        writer.writeUint8(step.durationType);
        writer.writeUint32LE(step.durationValue);
        writer.writeUint8(step.targetType);
        writer.writeUint32LE(step.targetValue);
        writer.writeUint32LE(step.targetLow);
        writer.writeUint32LE(step.targetHigh);
        writer.writeUint8(step.intensity);
    }

    const dataBytes = writer.getBytes();
    const dataSize = dataBytes.length;

    // Build 14-byte Header
    const header = new Uint8Array(14);
    header[0] = 14; // header size
    header[1] = 0x20; // protocol version 2.0
    // profile version 2132 (0x0854)
    header[2] = 0x54;
    header[3] = 0x08;
    // data size (UInt32 LE)
    header[4] = dataSize & 0xFF;
    header[5] = (dataSize >> 8) & 0xFF;
    header[6] = (dataSize >> 16) & 0xFF;
    header[7] = (dataSize >> 24) & 0xFF;
    // data type ".FIT"
    header[8] = 0x2E; // '.'
    header[9] = 0x46; // 'F'
    header[10] = 0x49; // 'I'
    header[11] = 0x54; // 'T'
    // Header CRC on first 12 bytes
    const headerCrc = computeFitCrc(header, 0, 12);
    header[12] = headerCrc & 0xFF;
    header[13] = (headerCrc >> 8) & 0xFF;

    // Combine Header + Data
    const fullWithoutFileCrc = new Uint8Array(14 + dataSize);
    fullWithoutFileCrc.set(header, 0);
    fullWithoutFileCrc.set(dataBytes, 14);

    // Compute File CRC over header + data
    const fileCrc = computeFitCrc(fullWithoutFileCrc);

    // Final result: Header (14) + Data (dataSize) + File CRC (2)
    const result = new Uint8Array(14 + dataSize + 2);
    result.set(fullWithoutFileCrc, 0);
    result[14 + dataSize] = fileCrc & 0xFF;
    result[14 + dataSize + 1] = (fileCrc >> 8) & 0xFF;

    return result;
}

/**
 * Browser helper: downloads the workout as a `.fit` file directly.
 */
export function downloadWorkoutFit(workout: unknown, filename?: string): void {
    if (typeof window === 'undefined') return;
    const bytes = exportWorkoutFit(workout);
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/vnd.ant.fit' });
    const w = (workout || {}) as Record<string, unknown>;
    const defaultSlug = ((w.customName || w.workoutType || 'workout') as string)
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'workout';
    const finalFilename = filename || `${defaultSlug}.fit`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
