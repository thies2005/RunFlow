/**
 * AI Context Builder - Assembles user data based on permission settings
 */

import { prisma } from '@/lib/db';
import type { UserAiSettings } from '@prisma/client';

export interface UserContext {
    // Basic info
    name?: string;

    // Fitness metrics (if accessFitnessMetrics)
    fitnessMetrics?: {
        ctl: number;
        atl: number;
        tsb: number;
        ctlRunning: number;
    };

    // Activity history (if accessActivityHistory)
    recentActivities?: {
        date: string;
        type: string;
        distance: number; // meters
        duration: number; // seconds
        pace: number; // sec/km
        avgHr?: number;
        elevationGain?: number;
        cadence?: number;
        tss?: number;
        trimp?: number;
    }[];

    // Heart rate data (if accessHeartRateData)
    heartRateData?: {
        maxHr?: number;
        restingHr?: number;
        thresholdHr?: number;
        zones: number[];
        recentAvgHr?: number;
    };

    // Goals (if accessGoals)
    goals?: {
        name: string;
        raceType: string;
        raceDate: string;
        targetTime?: number;
        predictedTime?: number;
        currentVdot?: number;
    }[];

    // Training plan (if accessTrainingPlan)
    trainingPlan?: {
        upcomingWorkouts: {
            date: string;
            type: string;
            description: string;
        }[];
        recentCompletedWorkouts: {
            date: string;
            type: string;
            completed: boolean;
        }[];
    };

    // Performance (if accessPerformance)
    performance?: {
        currentVdot?: number;
        vdotCorrectionFactor: number;
        recentRacePaces?: {
            distance: string;
            pace: number;
        }[];
    };

    // Biometrics (if accessBiometrics)
    biometrics?: {
        weight?: number;
        height?: number;
        age?: number;
        sex?: string;
    };
}

export interface ActivityContext {
    activity: {
        id: string;
        name: string;
        type: string;
        date: string;
        distance: number;
        duration: number;
        pace: number;
        avgHr?: number;
        maxHr?: number;
        elevationGain?: number;
        hrZones?: {
            zone: number;
            seconds: number;
        }[];
        trimp?: number;
        tss?: number;
    };

    plannedWorkout?: {
        type: string;
        description: string;
        targetDistance?: number;
        targetDuration?: number;
        targetPace?: number;
        targetHrZone?: number;
    };
}

/**
 * Build the full user context based on their permission settings
 */
export async function buildUserContext(userId: string): Promise<UserContext> {
    const [user, settings] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            include: {
                goals: {
                    where: { isActive: true },
                    include: { workouts: true },
                },
                DailyFitness: {
                    orderBy: { date: 'desc' },
                    take: 1,
                },
            },
        }),
        prisma.userAiSettings.findUnique({
            where: { userId },
        }),
    ]);

    if (!user || !settings) {
        return { name: user?.name || undefined };
    }

    const context: UserContext = {
        name: user.name || undefined,
    };

    // Fitness metrics
    if (settings.accessFitnessMetrics && user.DailyFitness[0]) {
        const latest = user.DailyFitness[0];
        context.fitnessMetrics = {
            ctl: latest.ctl,
            atl: latest.atl,
            tsb: latest.tsb,
            ctlRunning: latest.ctlRunning,
        };
    }

    // Activity history
    if (settings.accessActivityHistory) {
        const activities = await prisma.activity.findMany({
            where: { userId },
            orderBy: { startDate: 'desc' },
            take: 20,
        });

        context.recentActivities = activities.map((a) => ({
            date: a.startDate.toISOString().split('T')[0],
            type: a.type,
            distance: a.distance,
            duration: a.movingTime,
            pace: a.distance > 0 ? (a.movingTime / (a.distance / 1000)) : 0,
            avgHr: a.averageHr || undefined,
            elevationGain: a.totalElevation || undefined,
            cadence: a.averageCadence || undefined,
            tss: a.runningTss || undefined,
            trimp: a.trimp || undefined,
        }));
    }

    // Heart rate data
    if (settings.accessHeartRateData) {
        context.heartRateData = {
            maxHr: user.hrMax || undefined,
            restingHr: user.hrRest || undefined,
            thresholdHr: user.thresholdHeartRate || undefined,
            zones: [user.hrZone1Max, user.hrZone2Max, user.hrZone3Max, user.hrZone4Max, user.hrZone5Max, user.hrZone6Max],
        };

        // Get recent average HR from activities
        const recentActivitiesWithHr = await prisma.activity.findMany({
            where: { userId, hasHeartrate: true },
            orderBy: { startDate: 'desc' },
            take: 10,
            select: { averageHr: true },
        });

        if (recentActivitiesWithHr.length > 0) {
            const avgHrs = recentActivitiesWithHr.filter((a) => a.averageHr).map((a) => a.averageHr!);
            context.heartRateData.recentAvgHr = avgHrs.reduce((a, b) => a + b, 0) / avgHrs.length;
        }
    }

    // Goals
    if (settings.accessGoals && user.goals.length > 0) {
        context.goals = user.goals.map((g) => ({
            name: g.name,
            raceType: g.raceType,
            raceDate: g.raceDate.toISOString().split('T')[0],
            targetTime: g.targetTime || undefined,
            predictedTime: g.predictedTime || undefined,
            currentVdot: g.currentVdot || undefined,
        }));
    }

    // Training plan
    if (settings.accessTrainingPlan && user.goals.length > 0) {
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const workouts = await prisma.workout.findMany({
            where: {
                goal: { userId },
                scheduledDate: {
                    gte: lastWeek,
                    lte: nextWeek,
                },
            },
            orderBy: { scheduledDate: 'asc' },
        });

        context.trainingPlan = {
            upcomingWorkouts: workouts
                .filter((w) => w.scheduledDate >= now)
                .slice(0, 5)
                .map((w) => ({
                    date: w.scheduledDate.toISOString().split('T')[0],
                    type: w.workoutType,
                    description: w.description,
                })),
            recentCompletedWorkouts: workouts
                .filter((w) => w.scheduledDate < now)
                .slice(0, 5)
                .map((w) => ({
                    date: w.scheduledDate.toISOString().split('T')[0],
                    type: w.workoutType,
                    completed: w.isCompleted,
                })),
        };
    }

    // Performance
    if (settings.accessPerformance) {
        context.performance = {
            currentVdot: user.goals[0]?.currentVdot || undefined,
            vdotCorrectionFactor: user.vdotCorrectionFactor,
        };
    }

    // Biometrics
    if (settings.accessBiometrics) {
        let age: number | undefined;
        if (user.birthDate) {
            const today = new Date();
            age = today.getFullYear() - user.birthDate.getFullYear();
        }

        context.biometrics = {
            weight: user.weight || undefined,
            height: user.height || undefined,
            age,
            sex: user.sex,
        };
    }

    return context;
}

/**
 * Build context for a specific activity
 */
export async function buildActivityContext(activityId: string): Promise<ActivityContext | null> {
    const activity = await prisma.activity.findUnique({
        where: { id: activityId },
    });

    if (!activity) return null;

    const activityDate = activity.startDate;

    // Find any planned workout for this date
    const plannedWorkout = await prisma.workout.findFirst({
        where: {
            goal: { userId: activity.userId },
            scheduledDate: {
                gte: new Date(activityDate.setHours(0, 0, 0, 0)),
                lt: new Date(activityDate.setHours(23, 59, 59, 999)),
            },
        },
    });

    return {
        activity: {
            id: activity.id,
            name: activity.name,
            type: activity.type,
            date: activity.startDate.toISOString().split('T')[0],
            distance: activity.distance,
            duration: activity.movingTime,
            pace: activity.distance > 0 ? (activity.movingTime / (activity.distance / 1000)) : 0,
            avgHr: activity.averageHr || undefined,
            maxHr: activity.maxHr || undefined,
            elevationGain: activity.totalElevation || undefined,
            hrZones: [
                { zone: 1, seconds: activity.hrZone1Time || 0 },
                { zone: 2, seconds: activity.hrZone2Time || 0 },
                { zone: 3, seconds: activity.hrZone3Time || 0 },
                { zone: 4, seconds: activity.hrZone4Time || 0 },
                { zone: 5, seconds: activity.hrZone5Time || 0 },
                { zone: 6, seconds: activity.hrZone6Time || 0 },
                { zone: 7, seconds: activity.hrZone7Time || 0 },
            ].filter((z) => z.seconds > 0),
            trimp: activity.trimp || undefined,
            tss: activity.runningTss || undefined,
        },
        plannedWorkout: plannedWorkout
            ? {
                type: plannedWorkout.workoutType,
                description: plannedWorkout.description,
                targetDistance: plannedWorkout.targetDistance || undefined,
                targetDuration: plannedWorkout.targetDuration || undefined,
                targetPace: plannedWorkout.targetPace || undefined,
                targetHrZone: plannedWorkout.targetHrZone || undefined,
            }
            : undefined,
    };
}

/**
 * Format context into a readable string for the AI
 */
export function formatContextForAi(context: UserContext): string {
    const parts: string[] = [];

    if (context.name) {
        parts.push(`Athlete: ${context.name}`);
    }

    if (context.biometrics) {
        const bio = context.biometrics;
        const bioStr = [
            bio.age ? `${bio.age} years old` : null,
            bio.sex ? bio.sex.toLowerCase() : null,
            bio.weight ? `${bio.weight}kg` : null,
            bio.height ? `${bio.height}cm` : null,
        ].filter(Boolean).join(', ');
        if (bioStr) parts.push(`Profile: ${bioStr}`);
    }

    if (context.fitnessMetrics) {
        const fm = context.fitnessMetrics;
        parts.push(`Current Fitness: CTL ${fm.ctl.toFixed(1)}, ATL ${fm.atl.toFixed(1)}, TSB ${fm.tsb.toFixed(1)} (Form: ${fm.tsb > 10 ? 'Fresh' : fm.tsb < -10 ? 'Fatigued' : 'Balanced'})`);
    }

    if (context.heartRateData) {
        const hr = context.heartRateData;
        const hrStr = [
            hr.maxHr ? `Max HR: ${hr.maxHr}` : null,
            hr.restingHr ? `Resting HR: ${hr.restingHr}` : null,
            hr.thresholdHr ? `LTHR: ${hr.thresholdHr}` : null,
        ].filter(Boolean).join(', ');
        if (hrStr) parts.push(hrStr);
    }

    if (context.goals && context.goals.length > 0) {
        const goalStrs = context.goals.map((g) => {
            const daysUntil = Math.ceil((new Date(g.raceDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return `${g.name} (${g.raceType}, ${daysUntil} days away${g.targetTime ? `, target: ${formatTime(g.targetTime)}` : ''})`;
        });
        parts.push(`Goals: ${goalStrs.join('; ')}`);
    }

    if (context.performance?.currentVdot) {
        parts.push(`Current VDOT: ${context.performance.currentVdot.toFixed(1)}`);
    }

    if (context.recentActivities && context.recentActivities.length > 0) {
        const last7Days = context.recentActivities.slice(0, 7);
        const totalDistance = last7Days.reduce((sum, a) => sum + a.distance, 0) / 1000;
        const totalDuration = last7Days.reduce((sum, a) => sum + a.duration, 0);
        parts.push(`Last 7 days: ${totalDistance.toFixed(1)}km in ${Math.round(totalDuration / 60)} minutes across ${last7Days.length} activities`);

        // List individual recent activities so the AI can reference specific runs
        parts.push('\nRecent Activities (Last 20):');
        context.recentActivities.forEach((a) => {
            const dist = (a.distance / 1000).toFixed(1);
            const paceMin = Math.floor(a.pace / 60);
            const paceSec = Math.floor(a.pace % 60).toString().padStart(2, '0');

            let details = `${a.date} | ${a.type} | ${dist}km | ${paceMin}:${paceSec}/km`;
            if (a.avgHr) details += ` | ${Math.round(a.avgHr)}bpm`;
            if (a.elevationGain) details += ` | +${Math.round(a.elevationGain)}m`;
            if (a.tss) details += ` | TSS ${Math.round(a.tss)}`;

            parts.push(`  ${details}`);
        });
    }

    if (context.trainingPlan) {
        if (context.trainingPlan.upcomingWorkouts.length > 0) {
            const upcoming = context.trainingPlan.upcomingWorkouts
                .slice(0, 3)
                .map((w) => `${w.date}: ${w.type}`)
                .join(', ');
            parts.push(`Upcoming workouts: ${upcoming}`);
        }
    }

    return parts.join('\n');
}

function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Build extended history context for lazy loading (up to 1000 items)
 */
export async function buildExtendedHistoryContext(userId: string): Promise<string> {
    const activities = await prisma.activity.findMany({
        where: { userId },
        orderBy: { startDate: 'desc' },
        take: 1000,
        select: {
            startDate: true,
            type: true,
            distance: true,
            movingTime: true,
            averageHr: true,
            totalElevation: true,
            name: true,
        }
    });

    if (activities.length === 0) return "No activity history found.";

    // Compress data to save tokens
    // Format: Date|Type|Dist(km)|Time(min)|HR|Elev
    const lines = ["Date | Type | km | min | HR | Elev | Name"];

    // Group by month to provide structure? No, just list them. 
    // Maybe filter out very short activities?

    activities.forEach(a => {
        const date = a.startDate.toISOString().split('T')[0];
        const dist = (a.distance / 1000).toFixed(1);
        const time = Math.round(a.movingTime / 60);
        const hr = a.averageHr ? Math.round(a.averageHr) : '-';
        const elev = a.totalElevation ? Math.round(a.totalElevation) : '-';
        lines.push(`${date}|${a.type}|${dist}|${time}|${hr}|${elev}|${a.name.substring(0, 20)}`);
    });

    return `\n\n--- EXTENDED ACTIVITY HISTORY (Last ${activities.length}) ---\n${lines.join('\n')}`;
}
