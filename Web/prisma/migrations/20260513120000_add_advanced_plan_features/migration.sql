-- CreateEnum
CREATE TYPE "FeedbackJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "PlanSport" AS ENUM ('RUN', 'TRIATHLON');

-- CreateEnum
CREATE TYPE "PlanCreationMode" AS ENUM ('EXPERT_MANUAL', 'GUIDED', 'AI_ASSISTED', 'STANDARD_BUILDER', 'CSV_IMPORT');

-- CreateEnum
CREATE TYPE "GoalPriority" AS ENUM ('PRIMARY', 'SECONDARY', 'TUNE_UP', 'MILESTONE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RaceType" ADD VALUE 'FIFTY_K';
ALTER TYPE "RaceType" ADD VALUE 'FIFTY_MILE';
ALTER TYPE "RaceType" ADD VALUE 'HUNDRED_K';
ALTER TYPE "RaceType" ADD VALUE 'HUNDRED_MILE';
ALTER TYPE "RaceType" ADD VALUE 'TWELVE_HOUR';
ALTER TYPE "RaceType" ADD VALUE 'TWENTY_FOUR_HOUR';
ALTER TYPE "RaceType" ADD VALUE 'BACKYARD_ULTRA';
ALTER TYPE "RaceType" ADD VALUE 'CUSTOM_DISTANCE';
ALTER TYPE "RaceType" ADD VALUE 'SPRINT_TRI';
ALTER TYPE "RaceType" ADD VALUE 'OLYMPIC_TRI';
ALTER TYPE "RaceType" ADD VALUE 'HALF_IRONMAN';
ALTER TYPE "RaceType" ADD VALUE 'FULL_IRONMAN';
ALTER TYPE "RaceType" ADD VALUE 'CUSTOM_TRI';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WorkoutType" ADD VALUE 'FARTLEK';
ALTER TYPE "WorkoutType" ADD VALUE 'BRICK';
ALTER TYPE "WorkoutType" ADD VALUE 'OPEN_WATER_SWIM';
ALTER TYPE "WorkoutType" ADD VALUE 'LONG_RIDE';
ALTER TYPE "WorkoutType" ADD VALUE 'RIDE_INTERVALS';
ALTER TYPE "WorkoutType" ADD VALUE 'SWIM_DRILL';
ALTER TYPE "WorkoutType" ADD VALUE 'TRANSITION_PRACTICE';
ALTER TYPE "WorkoutType" ADD VALUE 'DOUBLE_DAY';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PlanPhase" ADD VALUE 'ENDURANCE';
ALTER TYPE "PlanPhase" ADD VALUE 'MENTAL_PREP';
ALTER TYPE "PlanPhase" ADD VALUE 'TUNE_UP';
ALTER TYPE "PlanPhase" ADD VALUE 'MAINTAIN';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "autoRevolvingCalculatedAt" TIMESTAMP(3),
ADD COLUMN     "autoRevolvingVo2max" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "GlobalAiSettings" ADD COLUMN     "activityFeedbackModel" TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
ADD COLUMN     "mealSuggestModel" TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
ADD COLUMN     "planBuilderModel" TEXT NOT NULL DEFAULT 'gpt-4o',
ADD COLUMN     "planBuilderProviderId" TEXT,
ADD COLUMN     "planMaxTokensPerAnalysis" INTEGER NOT NULL DEFAULT 8000,
ADD COLUMN     "tier1ActivityFeedbackLimit" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "tier1MealSuggestLimit" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "tier2ActivityFeedbackLimit" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "tier2MealSuggestLimit" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "tier3ActivityFeedbackLimit" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "tier3MealSuggestLimit" INTEGER NOT NULL DEFAULT 25;

-- AlterTable
ALTER TABLE "UserAiSettings" ADD COLUMN     "activityFeedbackUsedToday" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mealSuggestsUsedToday" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "DailyHealthLog" ADD COLUMN     "activeCalories" DOUBLE PRECISION,
ADD COLUMN     "waterIntake" INTEGER;

-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "backyardLoopDistM" DOUBLE PRECISION,
ADD COLUMN     "backyardLoopTimeS" INTEGER,
ADD COLUMN     "creationMode" "PlanCreationMode" NOT NULL DEFAULT 'STANDARD_BUILDER',
ADD COLUMN     "customBikeDistM" DOUBLE PRECISION,
ADD COLUMN     "customDistanceM" DOUBLE PRECISION,
ADD COLUMN     "customRunDistM" DOUBLE PRECISION,
ADD COLUMN     "customSwimDistM" DOUBLE PRECISION,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "guidanceLevel" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "parentGoalId" TEXT,
ADD COLUMN     "planSource" TEXT NOT NULL DEFAULT 'standard',
ADD COLUMN     "planStartDate" TIMESTAMP(3),
ADD COLUMN     "priority" "GoalPriority" NOT NULL DEFAULT 'PRIMARY',
ADD COLUMN     "sport" "PlanSport" NOT NULL DEFAULT 'RUN',
ADD COLUMN     "swimDay" INTEGER,
ADD COLUMN     "targetLaps" INTEGER,
ADD COLUMN     "trainingFocus" TEXT,
ALTER COLUMN "raceType" DROP NOT NULL,
ALTER COLUMN "raceDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Workout" ADD COLUMN     "color" TEXT,
ADD COLUMN     "customName" TEXT,
ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "intervalProgressionId" TEXT,
ADD COLUMN     "structuredSteps" JSONB,
ADD COLUMN     "subGoalId" TEXT;

-- AlterTable
ALTER TABLE "UserNutritionTarget" ADD COLUMN     "aiInsightApiKey" TEXT,
ADD COLUMN     "aiInsightProvider" TEXT DEFAULT 'gemini',
ADD COLUMN     "exerciseCalorieFactor" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
ADD COLUMN     "exerciseCalorieSource" TEXT NOT NULL DEFAULT 'strava',
ADD COLUMN     "fastingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fastingGoalHours" INTEGER NOT NULL DEFAULT 16,
ADD COLUMN     "waterGoalMl" INTEGER NOT NULL DEFAULT 2500,
ADD COLUMN     "waterTrackingEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "FeedbackJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "status" "FeedbackJobStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 5,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "errorLog" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaceResult" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "raceActivityId" TEXT,
    "actualTime" INTEGER,
    "chipTime" INTEGER,
    "placementOverall" INTEGER,
    "placementGender" INTEGER,
    "placementAgeGroup" INTEGER,
    "ageGroup" TEXT,
    "totalFinishers" INTEGER,
    "notes" TEXT,
    "weatherConditions" TEXT,
    "feltLike" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaceResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BodyMeasurement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "weight" DOUBLE PRECISION,
    "bodyFat" DOUBLE PRECISION,
    "muscleMass" DOUBLE PRECISION,
    "chest" DOUBLE PRECISION,
    "waist" DOUBLE PRECISION,
    "hips" DOUBLE PRECISION,
    "arms" DOUBLE PRECISION,
    "thighs" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BodyMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FastingSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FastingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthInsight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "rangeStart" TIMESTAMP(3) NOT NULL,
    "rangeEnd" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiRouteMetric" (
    "id" TEXT NOT NULL,
    "routePath" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "cpuUsage" DOUBLE PRECISION,
    "memoryUsage" DOUBLE PRECISION,
    "requestSize" INTEGER,
    "responseSize" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,

    CONSTRAINT "ApiRouteMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorLog" (
    "id" TEXT NOT NULL,
    "routePath" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "stackTrace" TEXT,
    "userId" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "count" INTEGER NOT NULL DEFAULT 1,
    "fingerprint" TEXT,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceSummary" (
    "id" TEXT NOT NULL,
    "routePath" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "timeRange" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestCount" INTEGER NOT NULL,
    "errorCount" INTEGER NOT NULL,
    "avgResponseTime" DOUBLE PRECISION NOT NULL,
    "p50ResponseTime" DOUBLE PRECISION NOT NULL,
    "p95ResponseTime" DOUBLE PRECISION NOT NULL,
    "p99ResponseTime" DOUBLE PRECISION NOT NULL,
    "avgCpuUsage" DOUBLE PRECISION NOT NULL,
    "avgMemoryUsage" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PerformanceSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionReplay" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT NOT NULL,
    "events" JSONB NOT NULL,
    "routePath" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER NOT NULL,

    CONSTRAINT "SessionReplay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Release" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "deployedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deployedBy" TEXT,
    "commitHash" TEXT,
    "notes" TEXT,

    CONSTRAINT "Release_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_readiness_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "_date" TIMESTAMP(3) NOT NULL,
    "compositeScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "state" TEXT NOT NULL DEFAULT 'unavailable',
    "confidence" TEXT NOT NULL DEFAULT 'unavailable',
    "componentScores" JSONB NOT NULL DEFAULT '[]',
    "reasons" JSONB NOT NULL DEFAULT '[]',
    "rhrJson" JSONB,
    "sleepJson" JSONB,
    "loadJson" JSONB,
    "subjectiveJson" JSONB,
    "overrideJson" JSONB,
    "computedAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3),
    "maxHr" INTEGER,
    "restingHr" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_readiness_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "readiness_baselines" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rhrMedian30Day" DOUBLE PRECISION,
    "sleepAverage28Day" DOUBLE PRECISION,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "readiness_baselines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adapted_workouts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalWorkoutId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "originalType" TEXT NOT NULL,
    "adaptedType" TEXT NOT NULL,
    "adaptationType" TEXT NOT NULL,
    "originalTargetDistance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adaptedTargetDistance" DOUBLE PRECISION,
    "originalTargetDuration" INTEGER NOT NULL DEFAULT 0,
    "adaptedTargetDuration" INTEGER,
    "originalTargetPace" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adaptedTargetPace" DOUBLE PRECISION,
    "reason" TEXT NOT NULL DEFAULT '',
    "readinessScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "readinessState" TEXT NOT NULL DEFAULT 'unavailable',
    "isAccepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncedAt" TIMESTAMP(3),

    CONSTRAINT "adapted_workouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_reconciliation_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "plannedLoad" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualLoad" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adaptedLoad" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deficitPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "surplusPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adjustmentDescription" TEXT,
    "isApplied" BOOLEAN NOT NULL DEFAULT false,
    "raceWeeksRemaining" INTEGER,
    "requiresReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncedAt" TIMESTAMP(3),

    CONSTRAINT "weekly_reconciliation_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanSnapshot" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "description" TEXT,
    "operation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeekTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "days" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeekTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntervalProgression" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "workoutType" "WorkoutType" NOT NULL,
    "startWeek" INTEGER NOT NULL,
    "endWeek" INTEGER NOT NULL,
    "weeks" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntervalProgression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPlanAnalysis" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION,
    "overallSummary" TEXT,
    "weekAnalyses" JSONB,
    "riskFlags" JSONB,
    "raceReadiness" JSONB,
    "suggestions" JSONB,
    "modelUsed" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiPlanAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanPaceProfile" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "baseVdot" DOUBLE PRECISION NOT NULL,
    "profiles" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanPaceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuidedPlanSession" (
    "id" TEXT NOT NULL,
    "goalId" TEXT,
    "userId" TEXT NOT NULL,
    "currentStep" TEXT NOT NULL,
    "responses" JSONB NOT NULL,
    "aiRecommendation" JSONB,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuidedPlanSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackJob_activityId_key" ON "FeedbackJob"("activityId");

-- CreateIndex
CREATE INDEX "FeedbackJob_status_nextRunAt_idx" ON "FeedbackJob"("status", "nextRunAt");

-- CreateIndex
CREATE INDEX "FeedbackJob_userId_activityId_idx" ON "FeedbackJob"("userId", "activityId");

-- CreateIndex
CREATE UNIQUE INDEX "RaceResult_goalId_key" ON "RaceResult"("goalId");

-- CreateIndex
CREATE UNIQUE INDEX "RaceResult_raceActivityId_key" ON "RaceResult"("raceActivityId");

-- CreateIndex
CREATE INDEX "RaceResult_goalId_idx" ON "RaceResult"("goalId");

-- CreateIndex
CREATE INDEX "BodyMeasurement_userId_idx" ON "BodyMeasurement"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BodyMeasurement_userId_date_key" ON "BodyMeasurement"("userId", "date");

-- CreateIndex
CREATE INDEX "FastingSession_userId_endTime_idx" ON "FastingSession"("userId", "endTime");

-- CreateIndex
CREATE INDEX "HealthInsight_userId_createdAt_idx" ON "HealthInsight"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ApiRouteMetric_routePath_timestamp_idx" ON "ApiRouteMetric"("routePath", "timestamp");

-- CreateIndex
CREATE INDEX "ApiRouteMetric_timestamp_idx" ON "ApiRouteMetric"("timestamp");

-- CreateIndex
CREATE INDEX "ApiRouteMetric_userId_idx" ON "ApiRouteMetric"("userId");

-- CreateIndex
CREATE INDEX "ErrorLog_timestamp_idx" ON "ErrorLog"("timestamp");

-- CreateIndex
CREATE INDEX "ErrorLog_routePath_idx" ON "ErrorLog"("routePath");

-- CreateIndex
CREATE INDEX "ErrorLog_errorMessage_idx" ON "ErrorLog"("errorMessage");

-- CreateIndex
CREATE INDEX "ErrorLog_fingerprint_idx" ON "ErrorLog"("fingerprint");

-- CreateIndex
CREATE INDEX "ErrorLog_resolved_idx" ON "ErrorLog"("resolved");

-- CreateIndex
CREATE INDEX "PerformanceSummary_routePath_timeRange_idx" ON "PerformanceSummary"("routePath", "timeRange");

-- CreateIndex
CREATE INDEX "PerformanceSummary_timestamp_idx" ON "PerformanceSummary"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceSummary_routePath_method_timeRange_timestamp_key" ON "PerformanceSummary"("routePath", "method", "timeRange", "timestamp");

-- CreateIndex
CREATE INDEX "SessionReplay_userId_timestamp_idx" ON "SessionReplay"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "SessionReplay_timestamp_idx" ON "SessionReplay"("timestamp");

-- CreateIndex
CREATE INDEX "SessionReplay_sessionId_idx" ON "SessionReplay"("sessionId");

-- CreateIndex
CREATE INDEX "DeviceToken_userId_idx" ON "DeviceToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_userId_token_key" ON "DeviceToken"("userId", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Release_version_key" ON "Release"("version");

-- CreateIndex
CREATE INDEX "Release_deployedAt_idx" ON "Release"("deployedAt");

-- CreateIndex
CREATE UNIQUE INDEX "daily_readiness_records_userId__date_key" ON "daily_readiness_records"("userId", "_date");

-- CreateIndex
CREATE UNIQUE INDEX "readiness_baselines_userId_key" ON "readiness_baselines"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "adapted_workouts_userId_originalWorkoutId_key" ON "adapted_workouts"("userId", "originalWorkoutId");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_reconciliation_records_userId_weekStartDate_key" ON "weekly_reconciliation_records"("userId", "weekStartDate");

-- CreateIndex
CREATE INDEX "PlanSnapshot_goalId_createdAt_idx" ON "PlanSnapshot"("goalId", "createdAt");

-- CreateIndex
CREATE INDEX "WeekTemplate_userId_idx" ON "WeekTemplate"("userId");

-- CreateIndex
CREATE INDEX "IntervalProgression_goalId_idx" ON "IntervalProgression"("goalId");

-- CreateIndex
CREATE UNIQUE INDEX "AiPlanAnalysis_goalId_key" ON "AiPlanAnalysis"("goalId");

-- CreateIndex
CREATE INDEX "AiPlanAnalysis_goalId_idx" ON "AiPlanAnalysis"("goalId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanPaceProfile_goalId_key" ON "PlanPaceProfile"("goalId");

-- CreateIndex
CREATE INDEX "PlanPaceProfile_goalId_idx" ON "PlanPaceProfile"("goalId");

-- CreateIndex
CREATE INDEX "GuidedPlanSession_userId_idx" ON "GuidedPlanSession"("userId");

-- CreateIndex
CREATE INDEX "GuidedPlanSession_goalId_idx" ON "GuidedPlanSession"("goalId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "ChatMessage_activityId_idx" ON "ChatMessage"("activityId");

-- CreateIndex
CREATE INDEX "NutritionLog_userId_date_idx" ON "NutritionLog"("userId", "date");

-- AddForeignKey
ALTER TABLE "GlobalAiSettings" ADD CONSTRAINT "GlobalAiSettings_planBuilderProviderId_fkey" FOREIGN KEY ("planBuilderProviderId") REFERENCES "AiProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityAiFeedback" ADD CONSTRAINT "ActivityAiFeedback_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackJob" ADD CONSTRAINT "FeedbackJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackJob" ADD CONSTRAINT "FeedbackJob_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_parentGoalId_fkey" FOREIGN KEY ("parentGoalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceResult" ADD CONSTRAINT "RaceResult_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceResult" ADD CONSTRAINT "RaceResult_raceActivityId_fkey" FOREIGN KEY ("raceActivityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_intervalProgressionId_fkey" FOREIGN KEY ("intervalProgressionId") REFERENCES "IntervalProgression"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_subGoalId_fkey" FOREIGN KEY ("subGoalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodyMeasurement" ADD CONSTRAINT "BodyMeasurement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FastingSession" ADD CONSTRAINT "FastingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthInsight" ADD CONSTRAINT "HealthInsight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_readiness_records" ADD CONSTRAINT "daily_readiness_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "readiness_baselines" ADD CONSTRAINT "readiness_baselines_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adapted_workouts" ADD CONSTRAINT "adapted_workouts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_reconciliation_records" ADD CONSTRAINT "weekly_reconciliation_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanSnapshot" ADD CONSTRAINT "PlanSnapshot_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeekTemplate" ADD CONSTRAINT "WeekTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntervalProgression" ADD CONSTRAINT "IntervalProgression_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPlanAnalysis" ADD CONSTRAINT "AiPlanAnalysis_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanPaceProfile" ADD CONSTRAINT "PlanPaceProfile_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuidedPlanSession" ADD CONSTRAINT "GuidedPlanSession_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuidedPlanSession" ADD CONSTRAINT "GuidedPlanSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

