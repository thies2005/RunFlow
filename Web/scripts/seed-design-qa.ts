/**
 * Design-QA seed: one email/password user with ~6 weeks of realistic data so
 * every screen (dashboard, analytics, plan, health/readiness) renders with
 * content. Idempotent: safe to re-run.
 *
 * Run with:
 *   npx tsx scripts/seed-design-qa.ts
 *
 * (Same runner documented for prisma/seed-templates.ts. The `seed:templates`
 * npm script's ts-node invocation does NOT work in this repo: package.json has
 * "type": "module", so ts-node picks its ESM loader, which cannot resolve the
 * extensionless relative imports inside src/generated/prisma. tsx handles it.)
 *
 * Requires DATABASE_URL in the environment (loaded via dotenv/config).
 *
 * NOTE: the password below is hashed with bcrypt directly (12 rounds, matching
 * src/lib/auth/auth-email.ts SALT_ROUNDS) instead of calling hashPassword(),
 * because hashPassword() enforces MIN_PASSWORD_LENGTH = 12 and the QA password
 * is shorter. Login only calls verifyPassword() (plain bcrypt.compare), so the
 * shorter QA password still authenticates.
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, ActivityType, WorkoutType } from '../src/generated/prisma/client';
import { DbNull } from '../src/generated/prisma/internal/prismaNamespaceBrowser';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
});

const QA_EMAIL = 'qa@runflow.local';
const QA_PASSWORD = 'Qa12345!';
const QA_STRAVA_ID_BASE = 730000000000n; // deterministic unique stravaIds

// ---------------------------------------------------------------- date utils

function utcDayAt(daysFromNow: number, hourUtc = 7, minuteUtc = 30): Date {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + daysFromNow);
    d.setUTCHours(hourUtc, minuteUtc, 0, 0);
    return d;
}

function utcMidnight(daysFromNow: number): Date {
    return utcDayAt(daysFromNow, 0, 0);
}

// ---------------------------------------------------------------- helpers

type ZoneTimes = {
    hrZone1Time: number; hrZone2Time: number; hrZone3Time: number;
    hrZone4Time: number; hrZone5Time: number; hrZone6Time: number;
    hrZone7Time: number;
};

/** Distribute movingTime across 7 HR zones using an intensity profile. */
function zoneTimes(movingTime: number, weights: number[]): ZoneTimes {
    const total = weights.reduce((a, b) => a + b, 0);
    const raw = weights.map(w => Math.floor((movingTime * w) / total));
    raw[0] += movingTime - raw.reduce((a, b) => a + b, 0); // fix rounding drift
    const [z1, z2, z3, z4, z5, z6, z7] = raw;
    return { hrZone1Time: z1, hrZone2Time: z2, hrZone3Time: z3, hrZone4Time: z4, hrZone5Time: z5, hrZone6Time: z6, hrZone7Time: z7 };
}

type RunSpec = {
    idx: number;
    daysAgo: number;
    name: string;
    km: number;
    paceSecPerKm: number;
    avgHr: number;
    maxHr: number;
    elev: number;
    trimpPerMin: number;
    vdot: number;
    trainingType: WorkoutType;
    hour?: number;
};

function runActivity(s: RunSpec) {
    const distance = Math.round(s.km * 1000);
    const movingTime = Math.round(s.km * s.paceSecPerKm);
    const elapsedTime = movingTime + Math.round(s.km * 6); // traffic lights etc.
    const calories = Math.round(s.km * 62);
    const rTss = Math.round((movingTime / 3600) * s.trimpPerMin * 58);
    // Easy runs: mostly z2/z3, intervals push into z4/z5.
    const easyProfile = [12, 34, 38, 13, 3, 0, 0];
    const hardProfile = [10, 18, 30, 24, 15, 3, 0];
    const longProfile = [14, 40, 34, 10, 2, 0, 0];
    const profile =
        s.trainingType === 'INTERVALS' || s.trainingType === 'TEMPO' ? hardProfile
            : s.trainingType === 'LONG_RUN' ? longProfile
                : easyProfile;
    return {
        stravaId: QA_STRAVA_ID_BASE + BigInt(s.idx),
        type: 'RUN' as ActivityType,
        sportType: 'Run',
        name: s.name,
        startDate: utcDayAt(-s.daysAgo, s.hour ?? 7, 45),
        timezone: 'Europe/Amsterdam',
        distance,
        movingTime,
        elapsedTime,
        averageSpeed: distance / movingTime,
        maxSpeed: (distance / movingTime) * 1.35,
        gradeAdjustedSpeed: (distance / movingTime) * 1.01,
        averageHr: s.avgHr,
        maxHr: s.maxHr,
        averageCadence: 168,
        hasHeartrate: true,
        totalElevation: s.elev,
        elevHigh: 22 + (s.idx % 5),
        elevLow: 4,
        calories,
        trimp: Math.round((movingTime / 60) * s.trimpPerMin),
        runningTss: rTss,
        estimatedVdot: s.vdot,
        trainingType: s.trainingType,
        deviceWatts: false,
        ...zoneTimes(movingTime, profile),
    };
}

function rideActivity(idx: number, daysAgo: number, name: string, km: number, avgKmh: number, avgHr: number, maxHr: number) {
    const distance = Math.round(km * 1000);
    const movingTime = Math.round((distance / (avgKmh / 3.6)));
    const elapsedTime = movingTime + 420;
    const moving = zoneTimes(movingTime, [22, 38, 28, 10, 2, 0, 0]);
    return {
        stravaId: QA_STRAVA_ID_BASE + BigInt(idx),
        type: 'VIRTUAL_RIDE' as ActivityType,
        sportType: 'VirtualRide',
        name,
        startDate: utcDayAt(-daysAgo, 18, 15),
        timezone: 'Europe/Amsterdam',
        distance,
        movingTime,
        elapsedTime,
        averageSpeed: distance / movingTime,
        maxSpeed: (avgKmh / 3.6) * 1.6,
        averageHr: avgHr,
        maxHr,
        averageCadence: 86,
        hasHeartrate: true,
        totalElevation: 210,
        elevHigh: 48,
        elevLow: 2,
        calories: Math.round(movingTime / 60 * 9.5 * 10) / 10 * 60 / 10, // rough
        trimp: Math.round((movingTime / 60) * 1.0),
        runningTss: null,
        estimatedVdot: null,
        trainingType: 'RIDE' as WorkoutType,
        deviceWatts: false,
        ...moving,
    };
}

function strengthActivity(idx: number, daysAgo: number, name: string, minutes: number) {
    const movingTime = minutes * 60;
    const moving = zoneTimes(movingTime, [30, 45, 20, 5, 0, 0, 0]);
    return {
        stravaId: QA_STRAVA_ID_BASE + BigInt(idx),
        type: 'WORKOUT' as ActivityType,
        sportType: 'WeightTraining',
        name,
        startDate: utcDayAt(-daysAgo, 17, 30),
        timezone: 'Europe/Amsterdam',
        distance: 0,
        movingTime,
        elapsedTime: movingTime + 300,
        averageSpeed: 0,
        maxSpeed: 0,
        averageHr: 118,
        maxHr: 142,
        averageCadence: null,
        hasHeartrate: true,
        totalElevation: 0,
        elevHigh: null,
        elevLow: null,
        calories: minutes * 6.5,
        trimp: Math.round(minutes * 0.5),
        runningTss: null,
        estimatedVdot: null,
        trainingType: 'STRENGTH' as WorkoutType,
        deviceWatts: false,
        ...moving,
    };
}

// ---------------------------------------------------------------- seed data

const activities = [
    // ---- current week (Mon 5 ... today) — first three link to plan workouts
    runActivity({ idx: 1, daysAgo: 5, name: 'Recovery shakeout', km: 6.1, paceSecPerKm: 348, avgHr: 128, maxHr: 141, elev: 24, trimpPerMin: 0.95, vdot: 43.2, trainingType: 'RECOVERY', hour: 7,  }),
    runActivity({ idx: 2, daysAgo: 4, name: '8x400m intervals', km: 10.4, paceSecPerKm: 289, avgHr: 158, maxHr: 181, elev: 38, trimpPerMin: 1.95, vdot: 47.8, trainingType: 'INTERVALS', hour: 18 }),
    runActivity({ idx: 3, daysAgo: 3, name: 'Easy conversational run', km: 10.1, paceSecPerKm: 330, avgHr: 141, maxHr: 154, elev: 41, trimpPerMin: 1.15, vdot: 44.6, trainingType: 'EASY' }),
    strengthActivity(4, 2, 'Strength — core & hips', 45),
    runActivity({ idx: 5, daysAgo: 1, name: 'Friday easy miles', km: 8.2, paceSecPerKm: 334, avgHr: 137, maxHr: 152, elev: 33, trimpPerMin: 1.1, vdot: 44.9, trainingType: 'EASY', hour: 17 }),
    // ---- prior weeks
    runActivity({ idx: 6, daysAgo: 6, name: 'Sunday long run', km: 22.3, paceSecPerKm: 336, avgHr: 146, maxHr: 163, elev: 96, trimpPerMin: 1.35, vdot: 45.1, trainingType: 'LONG_RUN', hour: 8 }),
    runActivity({ idx: 7, daysAgo: 9, name: 'Tempo — 3x10min @ threshold', km: 11.2, paceSecPerKm: 296, avgHr: 162, maxHr: 178, elev: 52, trimpPerMin: 1.8, vdot: 47.2, trainingType: 'TEMPO', hour: 18 }),
    rideActivity(8, 11, 'Zwift — Watopia flat', 28.5, 31.5, 138, 158),
    runActivity({ idx: 9, daysAgo: 13, name: 'Long run — canal loop', km: 21.0, paceSecPerKm: 341, avgHr: 144, maxHr: 160, elev: 74, trimpPerMin: 1.3, vdot: 44.8, trainingType: 'LONG_RUN', hour: 8 }),
    runActivity({ idx: 10, daysAgo: 16, name: 'Easy aerobic build', km: 9.3, paceSecPerKm: 331, avgHr: 139, maxHr: 153, elev: 36, trimpPerMin: 1.12, vdot: 44.4, trainingType: 'EASY' }),
    runActivity({ idx: 11, daysAgo: 18, name: '6x1000m @ 5K effort', km: 9.8, paceSecPerKm: 291, avgHr: 157, maxHr: 180, elev: 29, trimpPerMin: 1.9, vdot: 47.5, trainingType: 'INTERVALS', hour: 18 }),
    runActivity({ idx: 12, daysAgo: 20, name: 'Long run — forest trails', km: 19.5, paceSecPerKm: 345, avgHr: 142, maxHr: 158, elev: 118, trimpPerMin: 1.28, vdot: 44.1, trainingType: 'LONG_RUN', hour: 8 }),
    runActivity({ idx: 13, daysAgo: 23, name: 'Steady evening run', km: 8.7, paceSecPerKm: 327, avgHr: 138, maxHr: 151, elev: 27, trimpPerMin: 1.08, vdot: 44.7, trainingType: 'EASY', hour: 18 }),
    strengthActivity(14, 25, 'Strength — legs & posterior chain', 50),
    runActivity({ idx: 15, daysAgo: 27, name: 'Long run — riverside', km: 18.2, paceSecPerKm: 348, avgHr: 140, maxHr: 156, elev: 61, trimpPerMin: 1.25, vdot: 43.8, trainingType: 'LONG_RUN', hour: 8 }),
    rideActivity(16, 30, 'Sunday group ride', 32.4, 28.9, 131, 152),
    runActivity({ idx: 17, daysAgo: 32, name: 'Tempo — 20min cruise', km: 10.6, paceSecPerKm: 301, avgHr: 160, maxHr: 175, elev: 44, trimpPerMin: 1.75, vdot: 46.9, trainingType: 'TEMPO', hour: 18 }),
    runActivity({ idx: 18, daysAgo: 34, name: 'Long run — dunes', km: 17.4, paceSecPerKm: 352, avgHr: 139, maxHr: 155, elev: 87, trimpPerMin: 1.22, vdot: 43.5, trainingType: 'LONG_RUN', hour: 8 }),
];

// ---------------------------------------------------------------- main

async function main() {
    console.log('Seeding design-QA data…');

    // ---------------------------------------------------------- 1. User
    const passwordHash = await bcrypt.hash(QA_PASSWORD, 12); // same cost as auth-email.ts
    const user = await prisma.user.upsert({
        where: { email: QA_EMAIL },
        update: {
            passwordHash,
            emailVerified: utcDayAt(-60, 12, 0),
            authMethod: 'email',
            hrMax: 185,
            hrRest: 52,
            weight: 72.4,
            height: 178,
            thresholdHeartRate: 172,
            thresholdPace: 245, // seconds per km (~4:05/km)
            useImperial: false,
            healthTrackingEnabled: true,
            includeCrossTraining: true,
            lastSyncAt: utcDayAt(0, 6, 10),
            syncInProgress: false,
        },
        create: {
            email: QA_EMAIL,
            name: 'Thies',
            passwordHash,
            emailVerified: utcDayAt(-60, 12, 0),
            authMethod: 'email',
            sex: 'MALE',
            birthDate: utcDayAt(-13650, 12, 0),
            hrMax: 185,
            hrRest: 52,
            weight: 72.4,
            height: 178,
            thresholdHeartRate: 172,
            thresholdPace: 245,
            hrZoneMethod: 'LTHR',
            useImperial: false,
            healthTrackingEnabled: true,
            includeCrossTraining: true,
            lastSyncAt: utcDayAt(0, 6, 10),
        },
    });
    console.log(`  user ${user.email} (${user.id})`);

    // ---------------------------------------------------------- 2. Goal (the "Plan")
    const today = new Date();
    const dowMonday = (d: Date) => (d.getUTCDay() === 0 ? -6 : 1 - d.getUTCDay());
    const thisMonday = utcMidnight(dowMonday(today)); // Monday of current week
    const raceDate = utcDayAt(56, 11, 0); // marathon ~8 weeks out (a Sunday)
    const planWeeks = 12;

    const goal = await prisma.goal.upsert({
        where: { importKey: 'qa-seed-marathon' },
        update: { raceDate, isActive: true, deletedAt: null },
        create: {
            userId: user.id,
            name: 'Rotterdam Marathon',
            raceType: 'MARATHON',
            raceDate,
            planStartDate: new Date(thisMonday.getTime() - 35 * 86400000), // 5 weeks ago (Monday)
            targetTime: 3 * 3600 + 45 * 60, // 3:45:00
            currentVdot: 47.5,
            predictedTime: 3 * 3600 + 43 * 60,
            weeklyMileageGoal: 62,
            planWeeks,
            runsPerWeek: 5,
            strengthPerWeek: 1,
            longRunDay: 0, // Sunday
            workoutDay: 2, // Tuesday
            restDays: [1, 5],
            isActive: true,
            sport: 'RUN',
            creationMode: 'STANDARD_BUILDER',
            planSource: 'standard',
            guidanceLevel: 'none',
            importKey: 'qa-seed-marathon',
            priority: 'PRIMARY',
        },
    });
    console.log(`  goal "${goal.name}" race ${raceDate.toISOString().slice(0, 10)}`);

    // ---------------------------------------------------------- 3. Activities
    for (const a of activities) {
        await prisma.activity.upsert({
            where: { stravaId: a.stravaId },
            update: a,
            create: { ...a, userId: user.id },
        });
    }
    console.log(`  ${activities.length} activities`);

    const byIdx = (i: number) => activities[i - 1];

    // ---------------------------------------------------------- 4. Workouts (current + next week)
    // Recreate scoped to this goal so re-runs stay clean.
    await prisma.workout.deleteMany({ where: { goalId: goal.id } });

    type W = {
        dayOffset: number; // from Monday of current week
        workoutType: WorkoutType;
        description: string;
        phase?: 'BASE' | 'BUILD' | 'PEAK';
        order: number;
        targetDistance?: number;
        targetDuration?: number;
        targetPace?: number;
        targetHrZone?: number;
        targetHrZoneLabel?: string;
        targetHrMinBpm?: number;
        targetHrMaxBpm?: number;
        plannedTss?: number;
        completed?: boolean;
        linkedActivityIdx?: number;
        sport?: string;
        intensityZone?: string;
    };

    const nextMonday = thisMonday.getTime() + 7 * 86400000;
    const at = (mondayMs: number, offsetDays: number, hour = 7) =>
        new Date(mondayMs + offsetDays * 86400000 + hour * 3600000);

    const workouts: W[] = [
        // --- current week (BUILD)
        { dayOffset: 0, workoutType: 'RECOVERY', description: 'Recovery run — 6km, fully relaxed, focus on form', order: 1, targetDistance: 6000, targetPace: 348, targetHrZone: 1, targetHrZoneLabel: 'Z1', targetHrMinBpm: 118, targetHrMaxBpm: 130, plannedTss: 25, completed: true, linkedActivityIdx: 1 },
        { dayOffset: 1, workoutType: 'INTERVALS', description: '8x400m @ 5K pace, 90s jog recovery', order: 2, phase: 'BUILD', targetDistance: 10400, targetPace: 289, targetHrZone: 5, targetHrZoneLabel: 'Z5', targetHrMinBpm: 170, targetHrMaxBpm: 185, plannedTss: 62, completed: true, linkedActivityIdx: 2, intensityZone: 'VO2max' },
        { dayOffset: 2, workoutType: 'EASY', description: 'Easy aerobic run — 10km conversational', order: 3, targetDistance: 10000, targetPace: 330, targetHrZone: 2, targetHrZoneLabel: 'Z2', targetHrMinBpm: 130, targetHrMaxBpm: 148, plannedTss: 45, completed: true, linkedActivityIdx: 3 },
        { dayOffset: 3, workoutType: 'STRENGTH', description: 'Strength — core, hips and glutes (45min)', order: 4, targetDuration: 2700, plannedTss: 20, completed: true, sport: 'STRENGTH' },
        { dayOffset: 4, workoutType: 'REST', description: 'Rest day — stretch, hydrate, sleep', order: 5 },
        { dayOffset: 5, workoutType: 'TEMPO', description: 'Tempo — 3x10min @ threshold, 2min float', order: 6, phase: 'BUILD', targetDistance: 12000, targetPace: 298, targetHrZone: 4, targetHrZoneLabel: 'Z4', targetHrMinBpm: 160, targetHrMaxBpm: 172, plannedTss: 68, intensityZone: 'Threshold' },
        { dayOffset: 6, workoutType: 'LONG_RUN', description: 'Long run — 24km easy, last 3km @ marathon effort', order: 7, phase: 'BUILD', targetDistance: 24000, targetPace: 336, targetHrZone: 2, targetHrZoneLabel: 'Z2', targetHrMinBpm: 132, targetHrMaxBpm: 150, plannedTss: 105 },
        // --- next week
        { dayOffset: 7, workoutType: 'RECOVERY', description: 'Recovery run — 6km', order: 8, targetDistance: 6000, targetPace: 348, targetHrZone: 1, targetHrZoneLabel: 'Z1', targetHrMinBpm: 118, targetHrMaxBpm: 130, plannedTss: 25 },
        { dayOffset: 8, workoutType: 'INTERVALS', description: '6x1000m @ 10K pace, 2:30 jog recovery', order: 9, phase: 'BUILD', targetDistance: 10600, targetPace: 291, targetHrZone: 5, targetHrZoneLabel: 'Z5', targetHrMinBpm: 170, targetHrMaxBpm: 185, plannedTss: 64, intensityZone: 'VO2max' },
        { dayOffset: 9, workoutType: 'EASY', description: 'Easy aerobic run — 10km', order: 10, targetDistance: 10000, targetPace: 330, targetHrZone: 2, targetHrZoneLabel: 'Z2', targetHrMinBpm: 130, targetHrMaxBpm: 148, plannedTss: 45 },
        { dayOffset: 10, workoutType: 'STRENGTH', description: 'Strength — full body (50min)', order: 11, targetDuration: 3000, plannedTss: 20, sport: 'STRENGTH' },
        { dayOffset: 11, workoutType: 'REST', description: 'Rest day', order: 12 },
        { dayOffset: 12, workoutType: 'LONG_RUN', description: 'Long run — 26km with 2x5km @ marathon pace', order: 13, phase: 'BUILD', targetDistance: 26000, targetPace: 334, targetHrZone: 3, targetHrZoneLabel: 'Z3', targetHrMinBpm: 140, targetHrMaxBpm: 158, plannedTss: 118 },
        { dayOffset: 13, workoutType: 'EASY', description: 'Easy wind-down — 8km', order: 14, targetDistance: 8000, targetPace: 336, targetHrZone: 2, targetHrZoneLabel: 'Z2', targetHrMinBpm: 130, targetHrMaxBpm: 148, plannedTss: 38 },
    ];

    for (const w of workouts) {
        const mondayMs = w.dayOffset < 7 ? thisMonday.getTime() : nextMonday;
        const offsetInWeek = w.dayOffset < 7 ? w.dayOffset : w.dayOffset - 7;
        const linkedId = w.linkedActivityIdx ? byIdx(w.linkedActivityIdx).stravaId : undefined;
        const linked = linkedId
            ? await prisma.activity.findUnique({ where: { stravaId: linkedId }, select: { id: true } })
            : null;
        await prisma.workout.create({
            data: {
                goalId: goal.id,
                scheduledDate: at(mondayMs, offsetInWeek, 7),
                workoutType: w.workoutType,
                description: w.description,
                phase: w.phase ?? 'BUILD',
                order: w.order,
                targetDistance: w.targetDistance,
                targetDuration: w.targetDuration,
                targetPace: w.targetPace,
                targetHrZone: w.targetHrZone,
                targetHrZoneLabel: w.targetHrZoneLabel,
                targetHrMinBpm: w.targetHrMinBpm,
                targetHrMaxBpm: w.targetHrMaxBpm,
                plannedTss: w.plannedTss,
                isCompleted: w.completed ?? false,
                completedAt: w.completed ? at(mondayMs, offsetInWeek, 8) : null,
                linkedActivityId: linked?.id,
                sport: w.sport ?? 'RUN',
                intensityZone: w.intensityZone,
            },
        });
    }
    console.log(`  ${workouts.length} workouts (current + next week)`);

    // ---------------------------------------------------------- 5. DailyFitness cache (45 days, EMA from seeded TRIMP)
    const trimpByDay = new Map<string, number>();
    for (const a of activities) {
        if (a.trimp == null) continue;
        const day = new Date(a.startDate);
        day.setUTCHours(0, 0, 0, 0);
        const key = day.toISOString().slice(0, 10);
        trimpByDay.set(key, (trimpByDay.get(key) ?? 0) + a.trimp);
    }
    const ctlDecay = Math.exp(-1 / 42);
    const atlDecay = Math.exp(-1 / 7);
    let ctl = 20, atl = 20;
    for (let d = 44; d >= 0; d--) {
        const day = utcMidnight(-d);
        const trimp = trimpByDay.get(day.toISOString().slice(0, 10)) ?? 0;
        ctl = ctl * ctlDecay + trimp * (1 - ctlDecay);
        atl = atl * atlDecay + trimp * (1 - atlDecay);
        const tsb = ctl - atl;
        await prisma.dailyFitness.upsert({
            where: { userId_date: { userId: user.id, date: day } },
            update: { ctl, atl, tsb, ctlRunning: ctl * 0.93, trimp, runningTss: trimp * 0.9 },
            create: { userId: user.id, date: day, ctl, atl, tsb, ctlRunning: ctl * 0.93, trimp, runningTss: trimp * 0.9 },
        });
    }
    console.log('  45 days of DailyFitness (CTL/ATL/TSB)');

    // ---------------------------------------------------------- 6. DailyHealthLog (30 days)
    for (let d = 29; d >= 0; d--) {
        const day = utcMidnight(-d);
        const wave = Math.sin(d / 3.1);
        await prisma.dailyHealthLog.upsert({
            where: { userId_date: { userId: user.id, date: day } },
            update: {},
            create: {
                userId: user.id,
                date: day,
                steps: Math.round(9500 + wave * 3200 + (d % 5) * 210),
                weight: Math.round((72.6 - (29 - d) * 0.008 + wave * 0.25) * 10) / 10,
                waterIntake: Math.round(2200 + wave * 450),
                activeCalories: Math.round(520 + wave * 210),
            },
        });
    }
    console.log('  30 days of DailyHealthLog (steps/weight/water/calories)');

    // ---------------------------------------------------------- 7. DailyReadinessRecord (30 days)
    for (let d = 29; d >= 0; d--) {
        const day = utcMidnight(-d);
        const wave = Math.sin(d / 4.2) + Math.sin(d / 1.7) * 0.4;
        const compositeScore = Math.round(Math.min(94, Math.max(38, 71 + wave * 14)) * 10) / 10;
        const state = compositeScore >= 85 ? 'EXCELLENT' : compositeScore >= 70 ? 'GOOD' : compositeScore >= 50 ? 'MODERATE' : 'REDUCED';
        const todayTrimp = trimpByDay.get(day.toISOString().slice(0, 10)) ?? 0;
        const rhr = Math.round(53 + wave * 2.2);
        const hrv = Math.round((58 + wave * 6) * 10) / 10;
        const hrvPrev = Math.round((58 + Math.sin((d + 1) / 4.2) * 6 + Math.sin((d + 1) / 1.7) * 0.4 * 6) * 10) / 10;
        const sleepMinutes = Math.round(415 + wave * 32);
        const deep = Math.round(sleepMinutes * 0.15);
        const rem = Math.round(sleepMinutes * 0.22);
        const trendDir = hrv - hrvPrev > 1 ? 'up' : hrvPrev - hrv > 1 ? 'down' : 'flat';
        await prisma.dailyReadinessRecord.upsert({
            where: { userId_date: { userId: user.id, date: day } },
            update: {},
            create: {
                userId: user.id,
                date: day,
                compositeScore,
                state,
                confidence: 'full',
                componentScores: {
                    hrr: { score: Math.min(100, Math.round(compositeScore + 4)), isAvailable: true, reason: 'rhr ok' },
                    sleep: { score: Math.min(100, Math.round(compositeScore - 2)), isAvailable: true },
                    load: { score: Math.min(100, Math.round(compositeScore + 1)), isAvailable: true },
                    hrv: { score: Math.min(100, Math.round(compositeScore - 4)), isAvailable: true },
                },
                reasons: [
                    rhr <= 53 ? 'Resting heart rate stable' : 'Resting heart rate slightly elevated',
                    `Sleep: ${(sleepMinutes / 60).toFixed(1)}h`,
                ],
                rhrJson: { todayRhr: rhr, baselineRhr: 52.5, rhrDelta: Math.round((rhr - 52.5) * 10) / 10, trendDirection: rhr < 52.5 ? 1 : rhr > 54 ? -1 : 0 },
                sleepJson: {
                    totalDurationMinutes: sleepMinutes,
                    deepMinutes: deep,
                    remMinutes: rem,
                    lightMinutes: sleepMinutes - deep - rem,
                    deepPercent: Math.round((deep / sleepMinutes) * 10000) / 100,
                    remPercent: Math.round((rem / sleepMinutes) * 10000) / 100,
                },
                loadJson: {
                    todayTrimp,
                    atl: Math.round(atl * 10) / 10,
                    ctl: Math.round(ctl * 10) / 10,
                    tsb: Math.round((ctl - atl) * 10) / 10,
                    workloadRatio: ctl > 0 ? Math.round((atl / ctl) * 100) / 100 : 0,
                    trimpStrategy: 'hrZones',
                    sevenDayTrimpTotal: Math.round((atl * 7 * 0.92) * 10) / 10,
                },
                subjectiveJson: DbNull,
                hrvJson: { todayHrv: hrv, baselineHrv: 58.0, hrvDelta: Math.round((hrv - 58) * 10) / 10, trendDirection: trendDir },
                overrideJson: DbNull,
                computedAt: new Date(day.getTime() + 6 * 3600000),
                syncedAt: new Date(day.getTime() + 6 * 3600000 + 5 * 60000),
                maxHr: 185,
                restingHr: rhr,
            },
        });
    }
    console.log('  30 days of DailyReadinessRecord (RHR/HRV/sleep/load)');

    // ---------------------------------------------------------- 8. ReadinessBaseline + consent
    await prisma.readinessBaseline.upsert({
        where: { userId: user.id },
        update: { rhrMedian30Day: 52.5, sleepAverage28Day: 418 },
        create: { userId: user.id, rhrMedian30Day: 52.5, sleepAverage28Day: 418 },
    });

    const existingConsent = await prisma.userConsent.findFirst({
        where: { userId: user.id, consentType: 'HEALTH_DATA', action: 'GRANTED' },
    });
    if (!existingConsent) {
        await prisma.userConsent.create({
            data: {
                userId: user.id,
                consentType: 'HEALTH_DATA',
                action: 'GRANTED',
                policyVersion: '1.0',
                userAgent: 'seed-design-qa',
            },
        });
    }
    console.log('  readiness baseline + HEALTH_DATA consent');

    console.log('Done. Login with qa@runflow.local / Qa12345!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
