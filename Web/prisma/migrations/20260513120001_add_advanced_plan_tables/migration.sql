-- DropIndex
DROP INDEX IF EXISTS "NutritionLog_userId_foodItemId_idx";

-- DropIndex
DROP INDEX IF EXISTS "FastingSession_userId_startTime_idx";

-- DropIndex
DROP INDEX IF EXISTS "HealthInsight_userId_date_idx";

-- AlterTable
ALTER TABLE "GlobalAiSettings" ADD COLUMN IF NOT EXISTS     "planBuilderModel" TEXT NOT NULL DEFAULT 'gpt-4o',
ADD COLUMN IF NOT EXISTS     "planBuilderProviderId" TEXT,
ADD COLUMN IF NOT EXISTS     "planMaxTokensPerAnalysis" INTEGER NOT NULL DEFAULT 8000,
ALTER COLUMN "tier1MealSuggestLimit" SET DEFAULT 3,
ALTER COLUMN "tier2MealSuggestLimit" SET DEFAULT 10,
ALTER COLUMN "tier3MealSuggestLimit" SET DEFAULT 25,
ALTER COLUMN "tier1ActivityFeedbackLimit" SET DEFAULT 5,
ALTER COLUMN "tier2ActivityFeedbackLimit" SET DEFAULT 15,
ALTER COLUMN "tier3ActivityFeedbackLimit" SET DEFAULT 50;

-- AlterTable
ALTER TABLE "Goal" ADD COLUMN IF NOT EXISTS     "backyardLoopDistM" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS     "backyardLoopTimeS" INTEGER,
ADD COLUMN IF NOT EXISTS     "creationMode" "PlanCreationMode" NOT NULL DEFAULT 'STANDARD_BUILDER',
ADD COLUMN IF NOT EXISTS     "customBikeDistM" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS     "customDistanceM" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS     "customRunDistM" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS     "customSwimDistM" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS     "guidanceLevel" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN IF NOT EXISTS     "parentGoalId" TEXT,
ADD COLUMN IF NOT EXISTS     "planSource" TEXT NOT NULL DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS     "priority" "GoalPriority" NOT NULL DEFAULT 'PRIMARY',
ADD COLUMN IF NOT EXISTS     "sport" "PlanSport" NOT NULL DEFAULT 'RUN',
ADD COLUMN IF NOT EXISTS     "targetLaps" INTEGER,
ADD COLUMN IF NOT EXISTS     "trainingFocus" TEXT,
ALTER COLUMN "raceType" DROP NOT NULL,
ALTER COLUMN "raceDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Workout" ADD COLUMN IF NOT EXISTS     "color" TEXT,
ADD COLUMN IF NOT EXISTS     "customName" TEXT,
ADD COLUMN IF NOT EXISTS     "groupId" TEXT,
ADD COLUMN IF NOT EXISTS     "intervalProgressionId" TEXT,
ADD COLUMN IF NOT EXISTS     "structuredSteps" JSONB,
ADD COLUMN IF NOT EXISTS     "subGoalId" TEXT;

-- AlterTable
ALTER TABLE "UserNutritionTarget" ALTER COLUMN "aiInsightProvider" DROP NOT NULL;

-- AlterTable
ALTER TABLE "FastingSession" DROP COLUMN "targetHours",
ALTER COLUMN "startTime" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "HealthInsight" ALTER COLUMN "date" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PerformanceSummary" ADD CONSTRAINT "PerformanceSummary_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE IF NOT EXISTS "DeviceToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "daily_readiness_records" (
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
CREATE TABLE IF NOT EXISTS "readiness_baselines" (
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
CREATE TABLE IF NOT EXISTS "adapted_workouts" (
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
CREATE TABLE IF NOT EXISTS "weekly_reconciliation_records" (
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
CREATE TABLE IF NOT EXISTS "PlanSnapshot" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "description" TEXT,
    "operation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WeekTemplate" (
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
CREATE TABLE IF NOT EXISTS "IntervalProgression" (
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
CREATE TABLE IF NOT EXISTS "AiPlanAnalysis" (
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
CREATE TABLE IF NOT EXISTS "PlanPaceProfile" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "baseVdot" DOUBLE PRECISION NOT NULL,
    "profiles" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanPaceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GuidedPlanSession" (
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
CREATE INDEX IF NOT EXISTS "DeviceToken_userId_idx" ON "DeviceToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DeviceToken_userId_token_key" ON "DeviceToken"("userId", "token");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "daily_readiness_records_userId__date_key" ON "daily_readiness_records"("userId", "_date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "readiness_baselines_userId_key" ON "readiness_baselines"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "adapted_workouts_userId_originalWorkoutId_key" ON "adapted_workouts"("userId", "originalWorkoutId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "weekly_reconciliation_records_userId_weekStartDate_key" ON "weekly_reconciliation_records"("userId", "weekStartDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlanSnapshot_goalId_createdAt_idx" ON "PlanSnapshot"("goalId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WeekTemplate_userId_idx" ON "WeekTemplate"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IntervalProgression_goalId_idx" ON "IntervalProgression"("goalId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AiPlanAnalysis_goalId_key" ON "AiPlanAnalysis"("goalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AiPlanAnalysis_goalId_idx" ON "AiPlanAnalysis"("goalId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PlanPaceProfile_goalId_key" ON "PlanPaceProfile"("goalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlanPaceProfile_goalId_idx" ON "PlanPaceProfile"("goalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GuidedPlanSession_userId_idx" ON "GuidedPlanSession"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GuidedPlanSession_goalId_idx" ON "GuidedPlanSession"("goalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BodyMeasurement_userId_idx" ON "BodyMeasurement"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FastingSession_userId_endTime_idx" ON "FastingSession"("userId", "endTime");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "HealthInsight_userId_createdAt_idx" ON "HealthInsight"("userId", "createdAt");

DO $$ BEGIN
    ALTER TABLE "GlobalAiSettings" ADD CONSTRAINT "GlobalAiSettings_planBuilderProviderId_fkey" FOREIGN KEY ("planBuilderProviderId") REFERENCES "AiProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "Goal" ADD CONSTRAINT "Goal_parentGoalId_fkey" FOREIGN KEY ("parentGoalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "Workout" ADD CONSTRAINT "Workout_intervalProgressionId_fkey" FOREIGN KEY ("intervalProgressionId") REFERENCES "IntervalProgression"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "Workout" ADD CONSTRAINT "Workout_subGoalId_fkey" FOREIGN KEY ("subGoalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "daily_readiness_records" ADD CONSTRAINT "daily_readiness_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "readiness_baselines" ADD CONSTRAINT "readiness_baselines_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "adapted_workouts" ADD CONSTRAINT "adapted_workouts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "weekly_reconciliation_records" ADD CONSTRAINT "weekly_reconciliation_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "PlanSnapshot" ADD CONSTRAINT "PlanSnapshot_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "WeekTemplate" ADD CONSTRAINT "WeekTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "IntervalProgression" ADD CONSTRAINT "IntervalProgression_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "AiPlanAnalysis" ADD CONSTRAINT "AiPlanAnalysis_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "PlanPaceProfile" ADD CONSTRAINT "PlanPaceProfile_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "GuidedPlanSession" ADD CONSTRAINT "GuidedPlanSession_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "GuidedPlanSession" ADD CONSTRAINT "GuidedPlanSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- RenameIndex
ALTER INDEX "PerformanceSummary_route_method_timeRange_timestamp_key" RENAME TO "PerformanceSummary_routePath_method_timeRange_timestamp_key";
