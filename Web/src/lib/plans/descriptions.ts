import { WorkoutType } from '@/generated/prisma/browser';

export type WorkoutSport = 'RUN' | 'RIDE' | 'SWIM' | 'STRENGTH' | 'OTHER';

export interface WorkoutInput {
  type: string;
  distance: number;
  targetPace?: number;
  duration?: number;
  phase?: string;
  isGoalPaceWorkout?: boolean;
  description?: string;
}

const RUN_TYPES = new Set<string>([
  WorkoutType.EASY, WorkoutType.LONG_RUN, WorkoutType.TEMPO,
  WorkoutType.INTERVALS, WorkoutType.FARTLEK, WorkoutType.REPETITIONS,
  WorkoutType.RECOVERY, WorkoutType.RACE,
]);

const RIDE_TYPES = new Set<string>([
  WorkoutType.RIDE, WorkoutType.LONG_RIDE, WorkoutType.RIDE_INTERVALS,
]);

const SWIM_TYPES = new Set<string>([
  WorkoutType.SWIM, WorkoutType.SWIM_DRILL, WorkoutType.OPEN_WATER_SWIM,
]);

export function formatPace(secPerKm: number): string {
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.round(secPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}/km`;
}

export function formatDuration(seconds: number): string {
  return `${Math.round(seconds / 60)}min`;
}

export function formatDistance(meters: number, sport: WorkoutSport): string {
  if (sport === 'SWIM') {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

export function inferSport(workoutType: string): WorkoutSport {
  if (RUN_TYPES.has(workoutType)) return 'RUN';
  if (RIDE_TYPES.has(workoutType)) return 'RIDE';
  if (SWIM_TYPES.has(workoutType)) return 'SWIM';
  if (workoutType === WorkoutType.STRENGTH) return 'STRENGTH';
  return 'OTHER';
}

export function getRacePace(raceType: string, paces: { marathon: number; threshold: number; interval: number }): number {
  switch (raceType) {
    case 'MARATHON': return paces.marathon;
    case 'HALF_MARATHON': return Math.round((paces.marathon + paces.threshold) / 2);
    case 'TEN_K': return paces.threshold;
    case 'FIVE_K': return paces.interval;
    default: return paces.marathon;
  }
}

function isGoalPace(workout: WorkoutInput, racePace?: number): boolean {
  if (workout.isGoalPaceWorkout) return true;
  if (!racePace || workout.targetPace === undefined || workout.targetPace === 0) return false;
  if (workout.phase !== 'PEAK') return false;
  if (workout.type !== WorkoutType.TEMPO && workout.type !== WorkoutType.INTERVALS) return false;
  return Math.abs(workout.targetPace - racePace) / racePace <= 0.03;
}

function extractRepDetail(description?: string): string {
  if (!description) return '';
  const repMatch = description.match(/(\d+x\d+(?:\.\d+)?(?:km|m))(?:\s*@\s*)?/);
  if (repMatch) return repMatch[1].trim();
  const distAtMatch = description.match(/(\d+(?:\.\d+)?km)\s*@/);
  if (distAtMatch) return distAtMatch[1];
  return '';
}

function extractFartlekStructure(description?: string): string {
  if (!description) return '';
  const match = description.match(/Fartlek:\s*\d+(?:\.\d+)?km\s*\((.+)\)/);
  return match ? match[1] : '';
}

export function generateDisplayDescription(workout: WorkoutInput, racePace?: number): string {
  const sport = inferSport(workout.type);

  if (sport === 'RUN') return generateRunDescription(workout, racePace);
  if (sport === 'RIDE') return generateRideDescription(workout);
  if (sport === 'SWIM') return generateSwimDescription(workout);
  return generateOtherDescription(workout);
}

function generateRunDescription(workout: WorkoutInput, racePace?: number): string {
  const dist = formatDistance(workout.distance, 'RUN');

  if (workout.type === WorkoutType.RACE) return 'Race Day';

  if (isGoalPace(workout, racePace) && workout.targetPace) {
    const detail = extractRepDetail(workout.description) || `${dist}`;
    return `Goal Pace: ${detail} @ ${formatPace(workout.targetPace)}`;
  }

  switch (workout.type) {
    case WorkoutType.EASY:
      return `Easy Run: ${dist}`;
    case WorkoutType.LONG_RUN: {
      const mpMatch = workout.description?.match(
        /([\d.]+)km\s*Easy\s*\+\s*([\d.]+)km\s*@\s*(?:MP|Race Pace|Ultra Pace)/
      );
      if (mpMatch) {
        return `Long Run: ${dist} (${mpMatch[1]}km Easy + ${mpMatch[2]}km @ MP)`;
      }
      return `Long Run: ${dist}`;
    }
    case WorkoutType.RECOVERY:
      return `Recovery Run: ${dist}`;
    case WorkoutType.TEMPO: {
      const mpSegMatch = workout.description?.match(/MP Segments:\s*(.+)/);
      if (mpSegMatch) {
        return `MP Segments: ${mpSegMatch[1]}`;
      }
      const steadyMatch = workout.description?.match(/^Steady(?:\s+State)?:\s*(.+)/);
      if (steadyMatch) {
        return `Steady Run: ${steadyMatch[1]}`;
      }
      const thresholdRep = extractRepDetail(workout.description);
      if (thresholdRep) {
        return `Threshold: ${thresholdRep}`;
      }
      return `Threshold: ${dist}`;
    }
    case WorkoutType.INTERVALS: {
      const rep = extractRepDetail(workout.description);
      return rep ? `Intervals: ${rep}` : `Intervals: ${dist}`;
    }
    case WorkoutType.REPETITIONS: {
      const rep = extractRepDetail(workout.description);
      return rep ? `Reps: ${rep}` : `Reps: ${dist}`;
    }
    case WorkoutType.FARTLEK: {
      const structure = extractFartlekStructure(workout.description);
      return structure ? `Fartlek: ${structure}` : `Fartlek: ${dist}`;
    }
    default:
      return `Run: ${dist}`;
  }
}

function generateRideDescription(workout: WorkoutInput): string {
  const dur = workout.duration ? formatDuration(workout.duration) : '60min';

  switch (workout.type) {
    case WorkoutType.RIDE:
      return `Zone 2 Ride: ${dur}`;
    case WorkoutType.LONG_RIDE:
      return `Long Ride: ${dur}`;
    case WorkoutType.RIDE_INTERVALS:
      return `Bike Intervals: ${dur} @ Threshold`;
    default:
      return `Ride: ${dur}`;
  }
}

function generateSwimDescription(workout: WorkoutInput): string {
  const dist = formatDistance(workout.distance, 'SWIM');

  switch (workout.type) {
    case WorkoutType.SWIM:
      return `Endurance Swim: ${dist}`;
    case WorkoutType.SWIM_DRILL:
      return `Swim Drill: ${dist}`;
    case WorkoutType.OPEN_WATER_SWIM:
      return `Open Water: ${dist}`;
    default:
      return `Swim: ${dist}`;
  }
}

function generateOtherDescription(workout: WorkoutInput): string {
  const dur = workout.duration ? formatDuration(workout.duration) : '';

  switch (workout.type) {
    case WorkoutType.STRENGTH:
      return `Strength: ${dur || '45min'}`;
    case WorkoutType.BRICK:
      return 'Brick Session';
    case WorkoutType.REST:
      return 'Rest Day';
    case WorkoutType.TRANSITION_PRACTICE:
      return 'Transition Practice';
    case WorkoutType.CROSS_TRAIN:
      return `Cross Training: ${dur || '45min'}`;
    case WorkoutType.DOUBLE_DAY:
      return 'Double Day';
    case WorkoutType.OTHER:
    default:
      return 'Training';
  }
}

export function inferIntensityZone(workoutType: string, description?: string): string | null {
  if (description) {
    if (workoutType === WorkoutType.TEMPO) {
      if (description.includes('MP Segments')) return 'MP/Race Pace';
      if (description.match(/^Steady(?:\s+State)?:/)) return 'Steady';
      if (description.includes('Ultra Threshold')) return 'Steady';
      if (description.includes('Target Race Pace')) return 'Race Pace';
    }
    if (workoutType === WorkoutType.LONG_RUN && description.match(/@\s*(?:MP|Race Pace|Ultra Pace)/)) {
      return 'E + MP';
    }
  }
  switch (workoutType) {
    case WorkoutType.EASY: return 'E Zone';
    case WorkoutType.LONG_RUN: return 'E Zone';
    case WorkoutType.RECOVERY: return 'E Zone';
    case WorkoutType.TEMPO: return 'T Zone';
    case WorkoutType.INTERVALS: return 'I Zone';
    case WorkoutType.REPETITIONS: return 'R Zone';
    case WorkoutType.FARTLEK: return 'F Zone';
    case WorkoutType.RACE: return 'Race';
    case WorkoutType.RIDE: return 'Zone 2';
    case WorkoutType.LONG_RIDE: return 'Zone 2';
    case WorkoutType.RIDE_INTERVALS: return 'Threshold';
    case WorkoutType.SWIM: return 'Endurance';
    case WorkoutType.SWIM_DRILL: return 'Drill';
    case WorkoutType.OPEN_WATER_SWIM: return 'Open Water';
    case WorkoutType.STRENGTH: return 'Strength';
    case WorkoutType.BRICK: return 'Mixed';
    case WorkoutType.TRANSITION_PRACTICE: return null;
    case WorkoutType.REST: return null;
    case WorkoutType.CROSS_TRAIN: return null;
    case WorkoutType.DOUBLE_DAY: return null;
    default: return null;
  }
}

export interface EnrichableWorkout {
  type: string;
  totalDistance: number;
  targetPace?: number;
  targetDuration?: number;
  phase?: string;
  description?: string;
  displayDescription?: string;
  sport?: string;
  intensityZone?: string | null;
}

export function enrichWorkoutsWithDescriptions(workouts: EnrichableWorkout[], racePace?: number): void {
  for (const w of workouts) {
    w.sport = inferSport(w.type);
    w.displayDescription = generateDisplayDescription({
      type: w.type,
      distance: w.totalDistance,
      targetPace: w.targetPace,
      duration: w.targetDuration,
      phase: w.phase,
      description: w.description,
    }, racePace);
    w.intensityZone = inferIntensityZone(w.type, w.description);
  }
}
