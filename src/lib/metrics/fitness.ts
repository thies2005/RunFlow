/**
 * Fitness Tracking using Banister's Impulse-Response Model
 * 
 * CTL (Chronic Training Load) - 42-day exponentially weighted average
 * ATL (Acute Training Load) - 7-day exponentially weighted average
 * TSB (Training Stress Balance) = CTL - ATL (Form/Freshness)
 * 
 * Cross-Training Logic:
 * - VirtualRide/Ride: Contributes to CTL (aerobic base) via TRIMP
 * - Running Stress Score (rTSS): Only from Run activities
 */

export interface DailyLoad {
    date: Date;
    trimp: number;          // Total TRIMP (all activities)
    runningTss: number;     // Running-specific TSS
    activityTypes: string[];
}

export interface FitnessMetrics {
    ctl: number;        // Chronic Training Load (fitness)
    atl: number;        // Acute Training Load (fatigue)
    tsb: number;        // Training Stress Balance (form)
    ctlRunning: number; // Running-only CTL
}

export interface FitnessHistory {
    date: Date;
    metrics: FitnessMetrics;
}

// Time constants (in days)
const CTL_TIME_CONSTANT = 42;
const ATL_TIME_CONSTANT = 7;

/**
 * Calculate exponential decay factor
 * decay = e^(-1/timeConstant)
 */
function calculateDecayFactor(timeConstant: number): number {
    return Math.exp(-1 / timeConstant);
}

/**
 * Calculate fitness metrics for a series of daily loads
 * Uses exponentially weighted moving average
 */
export function calculateFitnessHistory(
    dailyLoads: DailyLoad[],
    initialCtl: number = 0,
    initialAtl: number = 0
): FitnessHistory[] {
    const ctlDecay = calculateDecayFactor(CTL_TIME_CONSTANT);
    const atlDecay = calculateDecayFactor(ATL_TIME_CONSTANT);

    let ctl = initialCtl;
    let atl = initialAtl;
    let ctlRunning = initialCtl;

    const history: FitnessHistory[] = [];

    // Sort by date
    const sorted = [...dailyLoads].sort((a, b) => a.date.getTime() - b.date.getTime());

    for (const day of sorted) {
        // Update CTL (total TRIMP from all activities)
        ctl = ctl * ctlDecay + day.trimp * (1 - ctlDecay);

        // Update ATL (total TRIMP)
        atl = atl * atlDecay + day.trimp * (1 - atlDecay);

        // Update Running-only CTL
        ctlRunning = ctlRunning * ctlDecay + day.runningTss * (1 - ctlDecay);

        const tsb = ctl - atl;

        history.push({
            date: day.date,
            metrics: {
                ctl: Math.round(ctl * 10) / 10,
                atl: Math.round(atl * 10) / 10,
                tsb: Math.round(tsb * 10) / 10,
                ctlRunning: Math.round(ctlRunning * 10) / 10,
            },
        });
    }

    return history;
}

/**
 * Calculate current fitness metrics from activity history
 */
export function calculateCurrentFitness(dailyLoads: DailyLoad[]): FitnessMetrics {
    const history = calculateFitnessHistory(dailyLoads);

    if (history.length === 0) {
        return { ctl: 0, atl: 0, tsb: 0, ctlRunning: 0 };
    }

    return history[history.length - 1].metrics;
}

/**
 * Calculate Running Training Stress Score (rTSS)
 * Based on intensity factor (IF) and normalized graded pace (NGP)
 * 
 * Simplified formula: rTSS = (duration_hours × IF² × 100)
 * Where IF = actual_pace / threshold_pace
 */
export function calculateRunningTss(
    durationSeconds: number,
    distanceMeters: number,
    thresholdPaceSecPerKm: number
): number {
    if (distanceMeters <= 0 || durationSeconds <= 0) return 0;

    // Calculate actual pace in sec/km
    const actualPace = (durationSeconds / distanceMeters) * 1000;

    // Intensity Factor = threshold_pace / actual_pace
    // (lower pace = faster = higher IF)
    const intensityFactor = thresholdPaceSecPerKm / actualPace;

    // Clamp IF to reasonable range
    const clampedIF = Math.max(0.5, Math.min(1.5, intensityFactor));

    // rTSS = duration_hours × IF² × 100
    const durationHours = durationSeconds / 3600;
    const tss = durationHours * Math.pow(clampedIF, 2) * 100;

    return Math.round(tss * 10) / 10;
}

/**
 * Determine activity contribution to training load
 * Cross-training (cycling) contributes to aerobic CTL but NOT to running stress
 */
export interface ActivityContribution {
    contributesToCtl: boolean;
    contributesToRunningTss: boolean;
    activityCategory: 'running' | 'cycling' | 'cross-training' | 'other';
}

export function getActivityContribution(activityType: string): ActivityContribution {
    const type = activityType.toUpperCase();

    // Running activities
    if (type === 'RUN' || type === 'VIRTUAL_RUN' || type === 'TRAIL_RUN') {
        return {
            contributesToCtl: true,
            contributesToRunningTss: true,
            activityCategory: 'running',
        };
    }

    // Cycling activities (indoor and outdoor)
    if (type === 'RIDE' || type === 'VIRTUAL_RIDE' || type === 'CYCLING' || type === 'INDOOR_CYCLING') {
        return {
            contributesToCtl: true,
            contributesToRunningTss: false, // Key: cycling doesn't add running stress
            activityCategory: 'cycling',
        };
    }

    // Other cross-training
    if (type === 'SWIM' || type === 'ROWING' || type === 'ELLIPTICAL' || type === 'STAIR_STEPPER') {
        return {
            contributesToCtl: true,
            contributesToRunningTss: false,
            activityCategory: 'cross-training',
        };
    }

    // Walking, hiking - light activity
    if (type === 'WALK' || type === 'HIKE') {
        return {
            contributesToCtl: true,
            contributesToRunningTss: false,
            activityCategory: 'other',
        };
    }

    return {
        contributesToCtl: false,
        contributesToRunningTss: false,
        activityCategory: 'other',
    };
}

/**
 * Interpret TSB (Training Stress Balance) value
 */
export function interpretTsb(tsb: number): {
    status: 'peaked' | 'fresh' | 'neutral' | 'fatigued' | 'very_fatigued';
    description: string;
    color: string;
} {
    if (tsb >= 25) {
        return {
            status: 'peaked',
            description: 'Peaked - Ready to race!',
            color: '#4ade80', // Green
        };
    }
    if (tsb >= 5) {
        return {
            status: 'fresh',
            description: 'Fresh - Good form',
            color: '#a3e635', // Lime
        };
    }
    if (tsb >= -10) {
        return {
            status: 'neutral',
            description: 'Optimal training zone',
            color: '#facc15', // Yellow
        };
    }
    if (tsb >= -30) {
        return {
            status: 'fatigued',
            description: 'Fatigued - Monitor recovery',
            color: '#fb923c', // Orange
        };
    }
    return {
        status: 'very_fatigued',
        description: 'Very fatigued - Risk of overtraining',
        color: '#ef4444', // Red
    };
}
