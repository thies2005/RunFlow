/**
 * Seed the global WorkoutTemplate library (audit G8).
 *
 * Idempotent: upserts each template keyed on `name`. Safe to re-run.
 *
 * Run with:
 *   npx tsx prisma/seed-templates.ts
 *
 * Requires DATABASE_URL in the environment (loaded via dotenv/config).
 */

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, WorkoutType } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
});

type SeedTemplate = {
    name: string;
    description: string;
    workoutType: WorkoutType;
    sport?: string;
    targetDistance?: number; // meters
    targetDuration?: number; // seconds
    targetPace?: number; // seconds per km
    structuredSteps?: unknown;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    tags: string[];
    category: 'speed' | 'endurance' | 'recovery' | 'threshold' | 'long';
};

// targetPace values are seconds-per-km.
// targetDistance is meters, targetDuration is seconds.
const templates: SeedTemplate[] = [
    // ---------- SPEED ----------
    {
        name: '8x400m Repeats',
        description:
            'Classic short interval speed session. 8 x 400m at roughly 5K-3K pace with equal-time recovery jogs. Great for building top-end speed and running economy.',
        workoutType: WorkoutType.INTERVALS,
        sport: 'RUN',
        targetDistance: 8000,
        targetDuration: 2400,
        targetPace: 95, // ~3:45/km for the reps
        difficulty: 'intermediate',
        tags: ['speed', 'intervals', 'anaerobic', '5k'],
        category: 'speed',
        structuredSteps: [
            { type: 'warmup', distanceM: 2000, description: 'Easy jog + dynamic drills' },
            { type: 'repeat', repeat: 8, steps: [
                { type: 'interval', distanceM: 400, targetPace: 95, description: '400m hard (~3:45/km)' },
                { type: 'recovery', distanceM: 200, description: '200m easy jog (~90s)' },
            ]},
            { type: 'cooldown', distanceM: 1600, description: 'Easy jog' },
        ],
    },
    {
        name: 'Yasso 800s',
        description:
            'Marathon predictor workout popularized by Bart Yasso. 10 x 800m at goal marathon pace (expressed as mm:ss), with equal-time recovery jogs.',
        workoutType: WorkoutType.INTERVALS,
        sport: 'RUN',
        targetDistance: 12000,
        targetDuration: 3600,
        targetPace: 180, // e.g. 3:00/km for a 3:00 marathon; adjust to goal
        difficulty: 'advanced',
        tags: ['speed', 'marathon', 'predictor', '800m'],
        category: 'speed',
        structuredSteps: [
            { type: 'warmup', distanceM: 2000, description: 'Easy jog + strides' },
            { type: 'repeat', repeat: 10, steps: [
                { type: 'interval', distanceM: 800, targetPace: 180, description: '800m at goal marathon pace' },
                { type: 'recovery', durationS: 180, description: 'Equal-time easy jog recovery' },
            ]},
            { type: 'cooldown', distanceM: 2000, description: 'Easy jog' },
        ],
    },
    {
        name: '12x200m Strides Repeats',
        description:
            'Short speed development. 12 x 200m near mile pace with full recovery. Builds neuromuscular power and turnover without high fatigue.',
        workoutType: WorkoutType.REPETITIONS,
        sport: 'RUN',
        targetDistance: 6000,
        targetDuration: 1800,
        targetPace: 48, // ~4:00/km
        difficulty: 'beginner',
        tags: ['speed', 'strides', 'neuromuscular', 'mile'],
        category: 'speed',
        structuredSteps: [
            { type: 'warmup', distanceM: 2000, description: 'Easy jog + drills' },
            { type: 'repeat', repeat: 12, steps: [
                { type: 'interval', distanceM: 200, targetPace: 48, description: '200m fast, controlled' },
                { type: 'recovery', durationS: 60, description: 'Walk/jog full recovery' },
            ]},
            { type: 'cooldown', distanceM: 1600, description: 'Easy jog' },
        ],
    },
    {
        name: '6x1km Repeats',
        description:
            'Long interval session at ~10K pace. 6 x 1km with 90s easy jog recoveries. Strong VO2max and lactate tolerance stimulus.',
        workoutType: WorkoutType.INTERVALS,
        sport: 'RUN',
        targetDistance: 12000,
        targetDuration: 3300,
        targetPace: 210, // 3:30/km
        difficulty: 'advanced',
        tags: ['speed', 'intervals', 'vo2max', '10k'],
        category: 'speed',
        structuredSteps: [
            { type: 'warmup', distanceM: 2400, description: 'Easy jog + strides' },
            { type: 'repeat', repeat: 6, steps: [
                { type: 'interval', distanceM: 1000, targetPace: 210, description: '1km at 10K pace' },
                { type: 'recovery', durationS: 90, description: 'Easy jog' },
            ]},
            { type: 'cooldown', distanceM: 1600, description: 'Easy jog' },
        ],
    },

    // ---------- THRESHOLD ----------
    {
        name: '3x2km at Threshold',
        description:
            'Lactate threshold session. 3 x 2km at comfortably hard effort (~half marathon pace) with 2 min easy jog recoveries. Raises the pace you can sustain.',
        workoutType: WorkoutType.TEMPO,
        sport: 'RUN',
        targetDistance: 12000,
        targetDuration: 3300,
        targetPace: 240, // 4:00/km
        difficulty: 'advanced',
        tags: ['threshold', 'tempo', 'lactate', 'half-marathon'],
        category: 'threshold',
        structuredSteps: [
            { type: 'warmup', distanceM: 2400, description: 'Easy jog + strides' },
            { type: 'repeat', repeat: 3, steps: [
                { type: 'interval', distanceM: 2000, targetPace: 240, description: '2km at threshold effort' },
                { type: 'recovery', durationS: 120, description: 'Easy jog recovery' },
            ]},
            { type: 'cooldown', distanceM: 1600, description: 'Easy jog' },
        ],
    },
    {
        name: 'Tempo Run 20min',
        description:
            'Continuous tempo run: warm up, then 20 minutes at lactate threshold effort (roughly 10K-half marathon pace), then cool down.',
        workoutType: WorkoutType.TEMPO,
        sport: 'RUN',
        targetDistance: 10000,
        targetDuration: 3000,
        targetPace: 240,
        difficulty: 'intermediate',
        tags: ['threshold', 'tempo', 'continuous'],
        category: 'threshold',
        structuredSteps: [
            { type: 'warmup', distanceM: 2400, description: 'Easy jog + strides' },
            { type: 'interval', durationS: 1200, targetPace: 240, description: '20 min at threshold pace' },
            { type: 'cooldown', distanceM: 2000, description: 'Easy jog' },
        ],
    },
    {
        name: 'Cruise Intervals 4x1mile',
        description:
            'Faster threshold development. 4 x 1 mile at tempo effort with 60-90s easy jog recoveries. Stronger lactate clearance than a continuous tempo.',
        workoutType: WorkoutType.TEMPO,
        sport: 'RUN',
        targetDistance: 11000,
        targetDuration: 3000,
        targetPace: 245,
        difficulty: 'intermediate',
        tags: ['threshold', 'cruise', 'intervals', 'mile'],
        category: 'threshold',
        structuredSteps: [
            { type: 'warmup', distanceM: 2400, description: 'Easy jog + strides' },
            { type: 'repeat', repeat: 4, steps: [
                { type: 'interval', distanceM: 1609, targetPace: 245, description: '1 mile at tempo effort' },
                { type: 'recovery', durationS: 75, description: 'Easy jog recovery' },
            ]},
            { type: 'cooldown', distanceM: 1800, description: 'Easy jog' },
        ],
    },
    {
        name: 'Progression Run',
        description:
            'Ends fast. Start easy and increase pace every 10 minutes so the final segment is at threshold. Builds endurance plus the ability to run hard when fatigued.',
        workoutType: WorkoutType.TEMPO,
        sport: 'RUN',
        targetDistance: 10000,
        targetDuration: 3000,
        targetPace: 250,
        difficulty: 'intermediate',
        tags: ['threshold', 'progression', 'endurance'],
        category: 'threshold',
        structuredSteps: [
            { type: 'interval', distanceM: 10000, description: 'Progress from easy to threshold pace over the run', targetPace: 250 },
        ],
    },

    // ---------- ENDURANCE ----------
    {
        name: 'Long Run 20km',
        description:
            'Steady endurance long run at a comfortable, conversational pace. Builds aerobic capacity, capillary density, and fat oxidation.',
        workoutType: WorkoutType.LONG_RUN,
        sport: 'RUN',
        targetDistance: 20000,
        targetDuration: 7200,
        targetPace: 330, // 5:30/km easy
        difficulty: 'beginner',
        tags: ['endurance', 'long-run', 'aerobic'],
        category: 'endurance',
        structuredSteps: [
            { type: 'interval', distanceM: 20000, targetPace: 330, description: 'Steady conversational pace' },
        ],
    },
    {
        name: 'Progressive Long Run',
        description:
            'Long run that finishes faster than it starts. Begin easy, hold easy for most of the run, then drop to marathon pace for the final 3-5km.',
        workoutType: WorkoutType.LONG_RUN,
        sport: 'RUN',
        targetDistance: 24000,
        targetDuration: 8700,
        targetPace: 300,
        difficulty: 'advanced',
        tags: ['endurance', 'long-run', 'progression', 'marathon'],
        category: 'endurance',
        structuredSteps: [
            { type: 'interval', distanceM: 19000, targetPace: 345, description: 'Easy long-run pace' },
            { type: 'interval', distanceM: 5000, targetPace: 270, description: 'Marathon pace finish' },
        ],
    },
    {
        name: 'Easy Aerobic Run 8km',
        description:
            'Short easy day at fully conversational pace to build aerobic base and recover between harder sessions. Heart rate zone 1-2.',
        workoutType: WorkoutType.EASY,
        sport: 'RUN',
        targetDistance: 8000,
        targetDuration: 2700,
        targetPace: 345,
        difficulty: 'beginner',
        tags: ['endurance', 'easy', 'aerobic', 'base'],
        category: 'endurance',
        structuredSteps: [
            { type: 'interval', distanceM: 8000, targetPace: 345, description: 'Conversational easy pace' },
        ],
    },

    // ---------- RECOVERY ----------
    {
        name: 'Recovery Jog 5km',
        description:
            'Very easy recovery run to promote blood flow and aid recovery. Deliberately slow (you should be able to hold a full conversation).',
        workoutType: WorkoutType.RECOVERY,
        sport: 'RUN',
        targetDistance: 5000,
        targetDuration: 1800,
        targetPace: 390, // 6:30/km
        difficulty: 'beginner',
        tags: ['recovery', 'easy', 'active-recovery'],
        category: 'recovery',
        structuredSteps: [
            { type: 'interval', distanceM: 5000, targetPace: 390, description: 'Very easy recovery pace' },
        ],
    },
    {
        name: 'Recovery Run with Strides',
        description:
            'Short easy run followed by 4-6 light strides to keep the legs snappy on a recovery day without adding meaningful fatigue.',
        workoutType: WorkoutType.RECOVERY,
        sport: 'RUN',
        targetDistance: 5000,
        targetDuration: 1700,
        targetPace: 384,
        difficulty: 'beginner',
        tags: ['recovery', 'strides', 'easy'],
        category: 'recovery',
        structuredSteps: [
            { type: 'interval', distanceM: 4000, targetPace: 390, description: 'Easy recovery jog' },
            { type: 'repeat', repeat: 5, steps: [
                { type: 'interval', distanceM: 100, description: 'Relaxed stride (not a sprint)' },
                { type: 'recovery', durationS: 40, description: 'Walk back' },
            ]},
            { type: 'cooldown', distanceM: 500, description: 'Easy jog' },
        ],
    },

    // ---------- LONG ----------
    {
        name: 'Marathon Paced Long Run',
        description:
            'Long run with a significant block at goal marathon pace. Teaches the body and mind to hold marathon pace on tired legs.',
        workoutType: WorkoutType.LONG_RUN,
        sport: 'RUN',
        targetDistance: 28000,
        targetDuration: 10200,
        targetPace: 270, // 4:30/km
        difficulty: 'advanced',
        tags: ['long', 'marathon', 'goal-pace', 'endurance'],
        category: 'long',
        structuredSteps: [
            { type: 'warmup', distanceM: 16000, targetPace: 345, description: 'Easy long-run pace' },
            { type: 'interval', distanceM: 10000, targetPace: 270, description: '10km at goal marathon pace' },
            { type: 'cooldown', distanceM: 2000, targetPace: 390, description: 'Easy jog' },
        ],
    },
    {
        name: 'Long Run 25km Steady',
        description:
            'Solid medium-long run at a steady, mostly-easy effort with a touch of pace late. Bridges base endurance and marathon prep.',
        workoutType: WorkoutType.LONG_RUN,
        sport: 'RUN',
        targetDistance: 25000,
        targetDuration: 9000,
        targetPace: 315,
        difficulty: 'intermediate',
        tags: ['long', 'endurance', 'steady'],
        category: 'long',
        structuredSteps: [
            { type: 'interval', distanceM: 22000, targetPace: 330, description: 'Steady easy pace' },
            { type: 'interval', distanceM: 3000, targetPace: 300, description: 'Pick it up to steady' },
        ],
    },
    {
        name: 'Back-to-Back Easy Long Run',
        description:
            'Time-on-feet focused long run at strict easy pace to build durability for ultras. Keep effort low; duration is the goal.',
        workoutType: WorkoutType.LONG_RUN,
        sport: 'RUN',
        targetDistance: 30000,
        targetDuration: 12000,
        targetPace: 360,
        difficulty: 'advanced',
        tags: ['long', 'ultra', 'time-on-feet', 'endurance'],
        category: 'long',
        structuredSteps: [
            { type: 'interval', distanceM: 30000, targetPace: 360, description: 'Strict easy, time on feet' },
        ],
    },

    // ---------- FARTLEK / VARIETY ----------
    {
        name: 'Fartlek 40min',
        description:
            'Unstructured speed play. Alternate faster and easier segments by feel to build both aerobic and anaerobic systems without rigid pacing.',
        workoutType: WorkoutType.FARTLEK,
        sport: 'RUN',
        targetDistance: 7000,
        targetDuration: 2400,
        targetPace: 300,
        difficulty: 'intermediate',
        tags: ['fartlek', 'speed-play', 'variety'],
        category: 'speed',
        structuredSteps: [
            { type: 'warmup', distanceM: 1500, description: 'Easy jog' },
            { type: 'interval', durationS: 1500, description: 'Fartlek: alternate 1-2 min hard / 1-2 min easy by feel' },
            { type: 'cooldown', distanceM: 1500, description: 'Easy jog' },
        ],
    },
];

async function main() {
    console.log(`Seeding ${templates.length} workout templates...`);

    let created = 0;
    let updated = 0;

    for (const t of templates) {
        const result = await prisma.workoutTemplate.upsert({
            where: { name: t.name },
            update: {
                description: t.description,
                workoutType: t.workoutType,
                sport: t.sport ?? 'RUN',
                targetDistance: t.targetDistance ?? null,
                targetDuration: t.targetDuration ?? null,
                targetPace: t.targetPace ?? null,
                structuredSteps: (t.structuredSteps ?? null) as never,
                difficulty: t.difficulty,
                tags: t.tags,
                category: t.category,
                isPublished: true,
            },
            create: {
                name: t.name,
                description: t.description,
                workoutType: t.workoutType,
                sport: t.sport ?? 'RUN',
                targetDistance: t.targetDistance ?? null,
                targetDuration: t.targetDuration ?? null,
                targetPace: t.targetPace ?? null,
                structuredSteps: (t.structuredSteps ?? null) as never,
                difficulty: t.difficulty,
                tags: t.tags,
                category: t.category,
                isPublished: true,
                createdById: null, // system-seeded
            },
        });

        // Heuristic: if updatedAt is the same minute as createdAt, treat as new.
        // (upsert always returns the row; we just log counts approximately.)
        if (result.createdAt.getTime() === result.updatedAt.getTime()) {
            created++;
        } else {
            updated++;
        }
    }

    console.log(`Done. Created ~${created}, updated ~${updated}.`);
}

main()
    .catch((error) => {
        console.error('Seed failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
