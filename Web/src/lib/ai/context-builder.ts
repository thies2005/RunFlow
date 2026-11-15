/**
 * AI Context Builder - Assembles user data based on permission settings
 */

import { prisma } from '@/lib/db';
import { DAY_MS } from '@/lib/constants';
import { fenceUntrusted, stripWidgetMarkers } from '@/lib/ai/prompts';

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
        raceType?: string;
        raceDate?: string;
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
        ftpWatts?: number;
        thresholdPace?: number;
        swimCssSecPer100m?: number;
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

    // Health & recovery (gated by accessBiometrics / accessNutritionLogs)
    healthRecovery?: {
        readiness?: {
            date: string;
            compositeScore: number;
            state: string;
            confidence: string;
            componentScores?: Record<string, number>;
            hrv?: number;
            sleepHours?: number;
            restingHr?: number;
        };
        dailyHealth?: {
            date: string;
            steps?: number;
            waterIntake?: number;
            weight?: number;
        };
        fasting?: {
            isActive: boolean;
            startedAt: string;
            elapsedHours: number;
        };
        supplements?: {
            totalScheduled: number;
            takenCount: number;
        };
    };

    // Nutrition data (if accessNutritionLogs)
    nutritionToday?: {
        totalCalories: number;
        totalProtein: number;
        totalCarbs: number;
        totalFats: number;
        target?: {
            calories: number;
            protein: number;
            carbs: number;
            fats: number;
        };
        remainingCalories?: number;
        mealCount: number;
    };

    // Today's most recent activity (if accessActivityLogs)
    todayActivity?: {
        name: string;
        type: string;
        distance: number;
        duration: number;
        pace: number;
        avgHr?: number;
        completedAt: string;
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
            select: {
                startDate: true,
                type: true,
                distance: true,
                movingTime: true,
                averageHr: true,
                totalElevation: true,
                averageCadence: true,
                runningTss: true,
                trimp: true,
            },
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
            raceType: g.raceType ?? undefined,
            raceDate: g.raceDate?.toISOString().split('T')[0] ?? undefined,
            targetTime: g.targetTime || undefined,
            predictedTime: g.predictedTime || undefined,
            currentVdot: g.currentVdot || undefined,
        }));
    }

    // Training plan
    if (settings.accessTrainingPlan && user.goals.length > 0) {
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * DAY_MS);
        const lastWeek = new Date(now.getTime() - 7 * DAY_MS);

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
                .slice(-5)
                .map((w) => ({
                    date: w.scheduledDate.toISOString().split('T')[0],
                    type: w.workoutType,
                    completed: w.isCompleted,
                })),
        };
    }

    // Nutrition data (today)
    if (settings.accessNutritionLogs) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        const todayLogs = await prisma.nutritionLog.findMany({
            where: { userId, date: todayStr },
        });

        const target = await prisma.userNutritionTarget.findUnique({
            where: { userId },
        });

        if (todayLogs.length > 0 || target) {
            const totals = todayLogs.reduce(
                (acc, log) => ({
                    calories: acc.calories + (log.calories || 0),
                    protein: acc.protein + (log.protein || 0),
                    carbs: acc.carbs + (log.carbs || 0),
                    fats: acc.fats + (log.fats || 0),
                }),
                { calories: 0, protein: 0, carbs: 0, fats: 0 }
            );

            context.nutritionToday = {
                totalCalories: totals.calories,
                totalProtein: totals.protein,
                totalCarbs: totals.carbs,
                totalFats: totals.fats,
                mealCount: todayLogs.length,
                target: target ? {
                    calories: target.dailyCalories,
                    protein: Math.round((target.dailyCalories * (target.proteinPercent / 100)) / 4),
                    carbs: Math.round((target.dailyCalories * (target.carbsPercent / 100)) / 4),
                    fats: Math.round((target.dailyCalories * (target.fatsPercent / 100)) / 9),
                } : undefined,
                remainingCalories: target ? target.dailyCalories - totals.calories : undefined,
            };
        }
    }

    // Today's most recent activity (for proactive context)
    if (settings.accessActivityLogs) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const recentActivity = await prisma.activity.findFirst({
            where: { userId, startDate: { gte: todayStart } },
            orderBy: { startDate: 'desc' },
        });

        if (recentActivity) {
            context.todayActivity = {
                name: recentActivity.name,
                type: recentActivity.type,
                distance: recentActivity.distance,
                duration: recentActivity.movingTime,
                pace: recentActivity.distance > 0
                    ? recentActivity.movingTime / (recentActivity.distance / 1000)
                    : 0,
                avgHr: recentActivity.averageHr || undefined,
                completedAt: recentActivity.startDate.toISOString(),
            };
        }
    }

    // Performance
    if (settings.accessPerformance) {
        context.performance = {
            currentVdot: user.goals[0]?.currentVdot || undefined,
            vdotCorrectionFactor: user.vdotCorrectionFactor,
            ftpWatts: user.ftpWatts || undefined,
            thresholdPace: user.thresholdPace || undefined,
            swimCssSecPer100m: user.swimCssSecPer100m || undefined,
        };
    }

    const now = new Date();
    const todayUtcStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrowUtcStart = new Date(todayUtcStart.getTime() + DAY_MS);
    const todayUtcKey = todayUtcStart.toISOString().split('T')[0];

    let todayDailyHealth: { date: Date; steps: number | null; waterIntake: number | null; weight: number | null } | null = null;
    if (settings.accessBiometrics || settings.accessNutritionLogs) {
        todayDailyHealth = await prisma.dailyHealthLog.findFirst({
            where: {
                userId,
                date: { gte: todayUtcStart, lt: tomorrowUtcStart },
            },
            orderBy: { date: 'desc' },
            select: { date: true, steps: true, waterIntake: true, weight: true },
        });
    }

    const healthRecovery: NonNullable<UserContext['healthRecovery']> = {};

    // Biometrics + Physiological Recovery (Readiness, steps, latest weight)
    if (settings.accessBiometrics) {
        let age: number | undefined;
        if (user.birthDate) {
            age = now.getFullYear() - user.birthDate.getFullYear();
        }

        let latestWeight = todayDailyHealth?.weight ?? undefined;
        if (latestWeight === undefined) {
            const latestWeightLog = await prisma.dailyHealthLog.findFirst({
                where: { userId, weight: { not: null } },
                orderBy: { date: 'desc' },
                select: { weight: true },
            });
            if (latestWeightLog?.weight != null) {
                latestWeight = latestWeightLog.weight;
            }
        }

        context.biometrics = {
            weight: latestWeight ?? user.weight ?? undefined,
            height: user.height || undefined,
            age,
            sex: user.sex,
        };

        const readinessRecord = await prisma.dailyReadinessRecord.findFirst({
            where: {
                userId,
                date: { gte: todayUtcStart, lt: tomorrowUtcStart },
            },
            orderBy: { date: 'desc' },
        });

        if (readinessRecord) {
            const extractedComponents: Record<string, number> = {};
            if (readinessRecord.componentScores && typeof readinessRecord.componentScores === 'object' && !Array.isArray(readinessRecord.componentScores)) {
                for (const [key, val] of Object.entries(readinessRecord.componentScores as Record<string, unknown>)) {
                    if (typeof val === 'number' && Number.isFinite(val)) {
                        extractedComponents[key] = val;
                    } else if (val && typeof val === 'object' && 'score' in val) {
                        const entry = val as { score?: unknown; isAvailable?: unknown };
                        if (entry.isAvailable !== false && typeof entry.score === 'number' && Number.isFinite(entry.score)) {
                            extractedComponents[key] = entry.score;
                        }
                    }
                }
            }

            const hrvObj = readinessRecord.hrvJson as Record<string, unknown> | null;
            const sleepObj = readinessRecord.sleepJson as Record<string, unknown> | null;
            const rhrObj = readinessRecord.rhrJson as Record<string, unknown> | null;

            const hrv = typeof hrvObj?.todayHrv === 'number' ? hrvObj.todayHrv : undefined;
            const sleepHours =
                typeof sleepObj?.hours === 'number' ? sleepObj.hours
                    : typeof sleepObj?.sleepHours === 'number' ? sleepObj.sleepHours
                        : typeof sleepObj?.durationHours === 'number' ? sleepObj.durationHours
                            : typeof sleepObj?.totalMinutes === 'number' ? sleepObj.totalMinutes / 60
                                : undefined;
            const restingHr =
                readinessRecord.restingHr
                ?? (typeof rhrObj?.todayRhr === 'number' ? rhrObj.todayRhr : undefined)
                ?? (typeof rhrObj?.restingHr === 'number' ? rhrObj.restingHr : undefined);

            healthRecovery.readiness = {
                date: readinessRecord.date.toISOString().split('T')[0],
                compositeScore: readinessRecord.compositeScore,
                state: readinessRecord.state,
                confidence: readinessRecord.confidence,
                componentScores: Object.keys(extractedComponents).length > 0 ? extractedComponents : undefined,
                hrv,
                sleepHours,
                restingHr,
            };
        }

        if (todayDailyHealth && (todayDailyHealth.steps != null || latestWeight != null)) {
            healthRecovery.dailyHealth = {
                date: todayUtcKey,
                steps: todayDailyHealth.steps ?? undefined,
                weight: latestWeight,
            };
        } else if (latestWeight != null) {
            healthRecovery.dailyHealth = {
                date: todayUtcKey,
                weight: latestWeight,
            };
        }
    }

    // Nutrition-gated health recovery (water intake, active fasting, supplement adherence)
    if (settings.accessNutritionLogs) {
        if (todayDailyHealth?.waterIntake != null) {
            healthRecovery.dailyHealth = {
                ...(healthRecovery.dailyHealth ?? { date: todayUtcKey }),
                waterIntake: todayDailyHealth.waterIntake,
            };
        }

        const activeFast = await prisma.fastingSession.findFirst({
            where: { userId, endTime: null },
            orderBy: { startTime: 'desc' },
        });
        if (activeFast) {
            const elapsedHours = Math.max(0, (now.getTime() - activeFast.startTime.getTime()) / (1000 * 60 * 60));
            healthRecovery.fasting = {
                isActive: true,
                startedAt: activeFast.startTime.toISOString(),
                elapsedHours,
            };
        }

        const [supplements, supplementLogs] = await Promise.all([
            prisma.supplement.findMany({
                where: { userId, isActive: true },
                select: { id: true, daysOfWeek: true },
            }),
            prisma.supplementLog.findMany({
                where: {
                    date: todayUtcStart,
                    taken: true,
                    supplement: { userId },
                },
                select: { supplementId: true },
            }),
        ]);

        if (supplements.length > 0) {
            const todayDow = now.getUTCDay();
            const scheduled = supplements.filter((s) => {
                if (!Array.isArray(s.daysOfWeek) || s.daysOfWeek.length === 0) return true;
                return s.daysOfWeek.includes(todayDow);
            });
            const scheduledIds = new Set(scheduled.map((s) => s.id));
            const takenCount = supplementLogs.filter((l) => scheduledIds.has(l.supplementId)).length;
            healthRecovery.supplements = {
                totalScheduled: scheduled.length,
                takenCount,
            };
        }
    }

    if (
        healthRecovery.readiness ||
        healthRecovery.dailyHealth ||
        healthRecovery.fasting ||
        healthRecovery.supplements
    ) {
        context.healthRecovery = healthRecovery;
    }

    return context;
}

/**
 * Build context for a specific activity
 *
 * The activity is fetched with an owner scope: an activityId belonging to
 * another user yields null (treated as absent) rather than leaking their data.
 */
export async function buildActivityContext(activityId: string, userId: string): Promise<ActivityContext | null> {
    const activity = await prisma.activity.findFirst({
        where: { id: activityId, userId },
    });

    if (!activity) return null;

    const activityDate = activity.startDate;

    // Find any planned workout for this date
    const plannedWorkout = await prisma.workout.findFirst({
        where: {
            goal: { userId: activity.userId },
            scheduledDate: {
                gte: new Date(new Date(activityDate).setHours(0, 0, 0, 0)),
                lt: new Date(new Date(activityDate).setHours(23, 59, 59, 999)),
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
        parts.push(`Athlete: ${fenceUntrusted(context.name)}`);
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
            const daysUntil = g.raceDate ? Math.ceil((new Date(g.raceDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
            const raceStr = g.raceType ? `${g.raceType}${daysUntil !== null ? `, ${daysUntil} days away` : ''}` : '';
            return `${fenceUntrusted(g.name)} (${raceStr}${g.targetTime ? `, target: ${formatTime(g.targetTime)}` : ''})`;
        });
        parts.push(`Goals: ${goalStrs.join('; ')}`);
    }

    if (context.performance) {
        if (context.performance.currentVdot) {
            parts.push(`Current VDOT: ${context.performance.currentVdot.toFixed(1)}`);
        }
        const perfExtras = [
            context.performance.ftpWatts ? `Cycling FTP: ${context.performance.ftpWatts}W` : null,
            context.performance.thresholdPace
                ? `Threshold Pace: ${Math.floor(context.performance.thresholdPace / 60)}:${Math.floor(context.performance.thresholdPace % 60).toString().padStart(2, '0')}/km`
                : null,
            context.performance.swimCssSecPer100m
                ? `Swim CSS: ${formatTime(context.performance.swimCssSecPer100m)}/100m`
                : null,
        ].filter(Boolean);
        if (perfExtras.length > 0) {
            parts.push(perfExtras.join(', '));
        }
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
        if (context.trainingPlan.recentCompletedWorkouts.length > 0) {
            const recent = context.trainingPlan.recentCompletedWorkouts
                .slice(0, 5)
                .map((w) => `${w.date}: ${w.type} (${w.completed ? 'completed' : 'missed'})`)
                .join(', ');
            parts.push(`Recent workouts: ${recent}`);
        }
    }

    if (context.healthRecovery) {
        const hr = context.healthRecovery;
        if (hr.readiness) {
            const r = hr.readiness;
            const metrics = [
                r.hrv != null ? `HRV: ${Math.round(r.hrv)}ms` : null,
                r.sleepHours != null ? `Sleep: ${r.sleepHours.toFixed(1)}h` : null,
                r.restingHr != null ? `RHR: ${Math.round(r.restingHr)}bpm` : null,
            ].filter(Boolean).join(', ');
            parts.push(`Readiness (${r.date}): ${Math.round(r.compositeScore)}/100 (${r.state}, ${r.confidence} confidence)${metrics ? ` | ${metrics}` : ''}`);
        }
        if (hr.dailyHealth) {
            const d = hr.dailyHealth;
            const dhParts = [
                d.steps != null ? `Steps: ${d.steps}` : null,
                d.waterIntake != null ? `Water: ${d.waterIntake}ml` : null,
                d.weight != null ? `Weight: ${d.weight}kg` : null,
            ].filter(Boolean).join(', ');
            if (dhParts) {
                parts.push(`Daily Health (${d.date}): ${dhParts}`);
            }
        }
        if (hr.fasting?.isActive) {
            parts.push(`Fasting: Active (${hr.fasting.elapsedHours.toFixed(1)}h elapsed)`);
        }
        if (hr.supplements && hr.supplements.totalScheduled > 0) {
            parts.push(`Supplements Today: ${hr.supplements.takenCount}/${hr.supplements.totalScheduled} taken`);
        }
    }

    if (context.nutritionToday) {
        const n = context.nutritionToday;
        let nutritionStr = `Today's Nutrition: ${n.totalCalories} kcal (${n.mealCount} meals) - P: ${n.totalProtein}g, C: ${n.totalCarbs}g, F: ${n.totalFats}g`;
        if (n.target) {
            nutritionStr += ` | Target: ${n.target.calories} kcal (${n.remainingCalories} remaining)`;
        }
        parts.push(nutritionStr);
    }

    if (context.todayActivity) {
        const a = context.todayActivity;
        const dist = (a.distance / 1000).toFixed(1);
        const paceMin = Math.floor(a.pace / 60);
        const paceSec = Math.floor(a.pace % 60).toString().padStart(2, '0');
        parts.push(`Today's Activity: ${fenceUntrusted(a.name)} (${a.type}) - ${dist}km at ${paceMin}:${paceSec}/km${a.avgHr ? ` | ${Math.round(a.avgHr)}bpm` : ''}`);
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
        // AI-H2: activity names are untrusted (Strava-synced); strip widget
        // marker tokens BEFORE truncating so no marker (whole or re-formed)
        // can ride into the model prompt through the history table.
        lines.push(`${date}|${a.type}|${dist}|${time}|${hr}|${elev}|${stripWidgetMarkers(a.name).substring(0, 20)}`);
    });

    return `\n\n--- EXTENDED ACTIVITY HISTORY (Last ${activities.length}) ---\n${lines.join('\n')}`;
}
