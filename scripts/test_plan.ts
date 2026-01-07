
import { generateTrainingPlan, PlanConfig, GeneratedWorkout } from '../src/lib/plans/index';
import { RaceType, WorkoutType } from '@prisma/client';

// Mock RaceType and WorkoutType if not available directly from prisma client in this context, 
// but since we are in the project, we can try to use them. 
// If it fails, I'll mock them.

const config: PlanConfig = {
    vdot: 40,
    raceType: 'MARATHON',
    raceDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7 * 16), // 16 weeks out
    startDate: new Date(),
    runsPerWeek: 4,
    weeklyMileageGoal: 60000, // 60km
};

const plan = generateTrainingPlan(config);

console.log(`Generated ${plan.length} workouts`);
let currentWeek = 0;
let weeklyVol = 0;
let weekStart = plan[0]?.date.getTime();

const weekStats: { week: number, vol: number, longRun: number }[] = [];

plan.forEach((w, i) => {
    const weekNum = Math.floor((w.date.getTime() - config.startDate!.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1;
    if (weekNum !== currentWeek) {
        if (currentWeek > 0) {
            // console.log(`Week ${currentWeek}: ${weeklyVol/1000}km`);
            weekStats.push({ week: currentWeek, vol: weeklyVol, longRun: 0 }); // Update long run later
        }
        currentWeek = weekNum;
        weeklyVol = 0;
    }
    weeklyVol += w.totalDistance;

    if (w.type === 'LONG_RUN') {
        // Find the stat for this week
        // Note: this loop logic is slightly slightly buggy for the very last item or strictly syncing logic, 
        // but sufficient for a rough check if we just process after.
    }
});
// Push last week
weekStats.push({ week: currentWeek, vol: weeklyVol, longRun: 0 });

// Re-iterate to find long runs
plan.filter(w => w.type === 'LONG_RUN').forEach(w => {
    const weekNum = Math.floor((w.date.getTime() - config.startDate!.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1;
    const stat = weekStats.find(s => s.week === weekNum);
    if (stat) stat.longRun = w.totalDistance;
});

console.log("Week | Volume (km) | Long Run (km) | LR %");
weekStats.forEach(s => {
    console.log(`${s.week.toString().padEnd(4)} | ${(s.vol / 1000).toFixed(1).padEnd(11)} | ${(s.longRun / 1000).toFixed(1).padEnd(13)} | ${s.vol > 0 ? Math.round(s.longRun / s.vol * 100) : 0}%`);
});
