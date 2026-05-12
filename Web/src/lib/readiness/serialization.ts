import { parseUtcDayKey, toUtcDayKey } from '@/lib/health/dates';

export function parseDateOnly(dateStr: string): Date {
  return parseUtcDayKey(dateStr);
}

export function toDateOnlyKey(date: Date): string {
  return toUtcDayKey(date);
}

export function serializeDailyRecord(record: {
  id: string;
  userId: string;
  date: Date;
  compositeScore: number;
  state: string;
  confidence: string;
  componentScores: unknown;
  reasons: unknown;
  rhrJson: unknown;
  sleepJson: unknown;
  loadJson: unknown;
  subjectiveJson: unknown;
  overrideJson: unknown;
  computedAt: Date | null;
  syncedAt: Date | null;
  maxHr: number | null;
  restingHr: number | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: record.id,
    date: toDateOnlyKey(record.date),
    compositeScore: record.compositeScore,
    state: record.state,
    confidence: record.confidence,
    componentScores: record.componentScores,
    reasons: record.reasons,
    rhrJson: record.rhrJson,
    sleepJson: record.sleepJson,
    loadJson: record.loadJson,
    subjectiveJson: record.subjectiveJson,
    overrideJson: record.overrideJson,
    computedAt: record.computedAt?.toISOString() ?? null,
    syncedAt: record.syncedAt?.toISOString() ?? null,
    maxHr: record.maxHr,
    restingHr: record.restingHr,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function serializeBaseline(record: {
  id: string;
  userId: string;
  rhrMedian30Day: number | null;
  sleepAverage28Day: number | null;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: record.id,
    rhrMedian30Day: record.rhrMedian30Day,
    sleepAverage28Day: record.sleepAverage28Day,
    lastUpdated: record.lastUpdated.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function serializeAdaptedWorkout(record: {
  id: string;
  userId: string;
  originalWorkoutId: string;
  date: Date;
  originalType: string;
  adaptedType: string;
  adaptationType: string;
  originalTargetDistance: number;
  adaptedTargetDistance: number | null;
  originalTargetDuration: number;
  adaptedTargetDuration: number | null;
  originalTargetPace: number;
  adaptedTargetPace: number | null;
  reason: string;
  readinessScore: number;
  readinessState: string;
  isAccepted: boolean;
  createdAt: Date;
  syncedAt: Date | null;
}) {
  return {
    id: record.id,
    originalWorkoutId: record.originalWorkoutId,
    date: toDateOnlyKey(record.date),
    originalType: record.originalType,
    adaptedType: record.adaptedType,
    adaptationType: record.adaptationType,
    originalTargetDistance: record.originalTargetDistance,
    adaptedTargetDistance: record.adaptedTargetDistance,
    originalTargetDuration: record.originalTargetDuration,
    adaptedTargetDuration: record.adaptedTargetDuration,
    originalTargetPace: record.originalTargetPace,
    adaptedTargetPace: record.adaptedTargetPace,
    reason: record.reason,
    readinessScore: record.readinessScore,
    readinessState: record.readinessState,
    isAccepted: record.isAccepted,
    createdAt: record.createdAt.toISOString(),
    syncedAt: record.syncedAt?.toISOString() ?? null,
  };
}

export function serializeWeeklyRecord(record: {
  id: string;
  userId: string;
  weekStartDate: Date;
  plannedLoad: number;
  actualLoad: number;
  adaptedLoad: number;
  deficitPercent: number;
  surplusPercent: number;
  adjustmentDescription: string | null;
  isApplied: boolean;
  raceWeeksRemaining: number | null;
  requiresReview: boolean;
  createdAt: Date;
  syncedAt: Date | null;
}) {
  return {
    id: record.id,
    weekStartDate: toDateOnlyKey(record.weekStartDate),
    plannedLoad: record.plannedLoad,
    actualLoad: record.actualLoad,
    adaptedLoad: record.adaptedLoad,
    deficitPercent: record.deficitPercent,
    surplusPercent: record.surplusPercent,
    adjustmentDescription: record.adjustmentDescription,
    isApplied: record.isApplied,
    raceWeeksRemaining: record.raceWeeksRemaining,
    requiresReview: record.requiresReview,
    createdAt: record.createdAt.toISOString(),
    syncedAt: record.syncedAt?.toISOString() ?? null,
  };
}
