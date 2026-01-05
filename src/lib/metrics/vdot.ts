/**
 * VDOT Calculator
 * Based on Jack Daniels' Running Formula (Daniels-Gilbert formula)
 * 
 * VDOT represents the running speed at which a runner achieves their VO2max
 * Used for race predictions and training pace calculations
 */

export type RaceDistance = '5K' | '10K' | 'HALF' | 'MARATHON';

export interface RaceInput {
    distance: RaceDistance;
    timeSeconds: number;
}

export interface VdotResult {
    vdot: number;
    predictions: Record<RaceDistance, number>; // seconds
    trainingPaces: TrainingPaces;
}

export interface TrainingPaces {
    easy: PaceRange;      // E pace (65-79% VO2max)
    marathon: number;     // M pace
    threshold: number;    // T pace (88-92% VO2max)
    interval: number;     // I pace (98-100% VO2max)
    repetition: number;   // R pace (105-110% VO2max)
}

export interface PaceRange {
    min: number; // sec/km
    max: number; // sec/km
}

// Race distances in meters
const DISTANCES: Record<RaceDistance, number> = {
    '5K': 5000,
    '10K': 10000,
    'HALF': 21097.5,
    'MARATHON': 42195,
};

/**
 * Calculate VDOT from a race performance
 * Uses the Daniels-Gilbert formula
 */
export function calculateVdot(input: RaceInput): number {
    const distanceMeters = DISTANCES[input.distance];
    const timeMinutes = input.timeSeconds / 60;

    // Velocity in meters per minute
    const velocity = distanceMeters / timeMinutes;

    // Oxygen cost at this velocity (ml/kg/min)
    // VO2 = -4.60 + 0.182258 * v + 0.000104 * v^2
    const vo2 = -4.60 + 0.182258 * velocity + 0.000104 * Math.pow(velocity, 2);

    // Percentage of VO2max that can be sustained for this duration
    // %VO2max = 0.8 + 0.1894393 * e^(-0.012778 * t) + 0.2989558 * e^(-0.1932605 * t)
    const percentVO2max = 0.8 +
        0.1894393 * Math.exp(-0.012778 * timeMinutes) +
        0.2989558 * Math.exp(-0.1932605 * timeMinutes);

    // VDOT = VO2 / %VO2max
    const vdot = vo2 / percentVO2max;

    return Math.round(vdot * 10) / 10;
}

/**
 * Predict race time from VDOT
 * Inverse of the calculateVdot function
 */
export function predictRaceTime(vdot: number, distance: RaceDistance): number {
    const distanceMeters = DISTANCES[distance];

    // Binary search for the time that gives this VDOT
    let low = 600;   // 10 minutes
    let high = 18000; // 5 hours

    for (let i = 0; i < 50; i++) {
        const mid = (low + high) / 2;
        const testVdot = calculateVdot({ distance, timeSeconds: mid });

        if (Math.abs(testVdot - vdot) < 0.01) {
            return Math.round(mid);
        }

        if (testVdot > vdot) {
            low = mid;
        } else {
            high = mid;
        }
    }

    return Math.round((low + high) / 2);
}

/**
 * Calculate velocity (m/min) from VDOT at a given percentage of VO2max
 */
function velocityAtPercentVO2max(vdot: number, percentVO2max: number): number {
    const vo2 = vdot * percentVO2max;

    // Inverse of VO2 = -4.60 + 0.182258 * v + 0.000104 * v^2
    // Using quadratic formula
    const a = 0.000104;
    const b = 0.182258;
    const c = -4.60 - vo2;

    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return 0;

    const velocity = (-b + Math.sqrt(discriminant)) / (2 * a);
    return velocity;
}

/**
 * Convert velocity (m/min) to pace (sec/km)
 */
function velocityToPace(velocityMetersPerMin: number): number {
    if (velocityMetersPerMin <= 0) return 0;
    const secondsPerKm = (1000 / velocityMetersPerMin) * 60;
    return Math.round(secondsPerKm);
}

/**
 * Calculate training paces from VDOT
 */
export function calculateTrainingPaces(vdot: number): TrainingPaces {
    // Easy pace range: 65-79% VO2max
    const easyMinVelocity = velocityAtPercentVO2max(vdot, 0.65);
    const easyMaxVelocity = velocityAtPercentVO2max(vdot, 0.79);

    // Marathon pace: ~75-80% VO2max (depends on VDOT)
    const marathonVelocity = velocityAtPercentVO2max(vdot, 0.78);

    // Threshold pace: 88% VO2max
    const thresholdVelocity = velocityAtPercentVO2max(vdot, 0.88);

    // Interval pace: 100% VO2max
    const intervalVelocity = velocityAtPercentVO2max(vdot, 1.0);

    // Repetition pace: 105% VO2max
    const repVelocity = velocityAtPercentVO2max(vdot, 1.05);

    return {
        easy: {
            min: velocityToPace(easyMaxVelocity), // Faster = lower sec/km
            max: velocityToPace(easyMinVelocity), // Slower = higher sec/km
        },
        marathon: velocityToPace(marathonVelocity),
        threshold: velocityToPace(thresholdVelocity),
        interval: velocityToPace(intervalVelocity),
        repetition: velocityToPace(repVelocity),
    };
}

/**
 * Get complete VDOT analysis from a race result
 */
export function analyzeRace(input: RaceInput): VdotResult {
    const vdot = calculateVdot(input);

    const predictions: Record<RaceDistance, number> = {
        '5K': predictRaceTime(vdot, '5K'),
        '10K': predictRaceTime(vdot, '10K'),
        'HALF': predictRaceTime(vdot, 'HALF'),
        'MARATHON': predictRaceTime(vdot, 'MARATHON'),
    };

    const trainingPaces = calculateTrainingPaces(vdot);

    return {
        vdot,
        predictions,
        trainingPaces,
    };
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
export function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format pace in min:sec/km
 */
export function formatPace(secsPerKm: number): string {
    const mins = Math.floor(secsPerKm / 60);
    const secs = Math.round(secsPerKm % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}/km`;
}
