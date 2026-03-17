-- =============================================================
-- Baseline migration: full initial schema
-- Creates all tables that existed before the tracked migrations.
-- Fully idempotent: uses DO blocks for enums, CREATE TABLE IF NOT EXISTS,
-- and CREATE INDEX IF NOT EXISTS so it is safe to re-run on an existing DB.
-- =============================================================

-- Enums (idempotent)
DO $$ BEGIN CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AuthCodeType" AS ENUM ('VERIFY_EMAIL', 'PASSWORD_RESET'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ActivityType" AS ENUM ('RUN', 'VIRTUAL_RIDE', 'RIDE', 'WALK', 'HIKE', 'SWIM', 'WORKOUT', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "RaceType" AS ENUM ('FIVE_K', 'TEN_K', 'HALF_MARATHON', 'MARATHON'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "WorkoutType" AS ENUM ('EASY', 'LONG_RUN', 'TEMPO', 'INTERVALS', 'REPETITIONS', 'RECOVERY', 'RACE', 'REST', 'CROSS_TRAIN', 'RIDE', 'SWIM', 'STRENGTH', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PlanPhase" AS ENUM ('BASE', 'BUILD', 'PEAK', 'TAPER', 'RACE_WEEK', 'RECOVERY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- User
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "image" TEXT,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT,
    "authMethod" TEXT NOT NULL DEFAULT 'strava',
    "stravaId" TEXT,
    "stravaAccessToken" TEXT,
    "stravaRefreshToken" TEXT,
    "stravaTokenExpiry" TIMESTAMP(3),
    "sex" "Sex" NOT NULL DEFAULT 'MALE',
    "birthDate" TIMESTAMP(3),
    "hrMax" INTEGER,
    "hrRest" INTEGER,
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "thresholdHeartRate" INTEGER,
    "thresholdPace" INTEGER,
    "hrZone1Max" INTEGER NOT NULL DEFAULT 130,
    "hrZone2Max" INTEGER NOT NULL DEFAULT 148,
    "hrZone3Max" INTEGER NOT NULL DEFAULT 160,
    "hrZone4Max" INTEGER NOT NULL DEFAULT 170,
    "hrZone5Max" INTEGER NOT NULL DEFAULT 178,
    "hrZone6Max" INTEGER NOT NULL DEFAULT 187,
    "vdotCorrectionFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "vdotReferenceRaceDate" TIMESTAMP(3),
    "vdotReferenceRaceTime" INTEGER,
    "vdotReferenceRaceType" TEXT,
    "includeCrossTraining" BOOLEAN NOT NULL DEFAULT true,
    "useImperial" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncAt" TIMESTAMP(3),
    "syncInProgress" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "healthTrackingEnabled" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "User_stravaId_key" ON "User"("stravaId");

-- Account (NextAuth)
CREATE TABLE IF NOT EXISTS "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
DO $$ BEGIN ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Session (NextAuth)
CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken");
DO $$ BEGIN ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- VerificationToken (NextAuth)
CREATE TABLE IF NOT EXISTS "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- AuthCode
CREATE TABLE IF NOT EXISTS "AuthCode" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "AuthCodeType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthCode_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AuthCode_email_type_idx" ON "AuthCode"("email", "type");

-- Activity
CREATE TABLE IF NOT EXISTS "Activity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stravaId" BIGINT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "sportType" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT,
    "distance" DOUBLE PRECISION NOT NULL,
    "movingTime" INTEGER NOT NULL,
    "elapsedTime" INTEGER NOT NULL,
    "averageSpeed" DOUBLE PRECISION,
    "maxSpeed" DOUBLE PRECISION,
    "gradeAdjustedSpeed" DOUBLE PRECISION,
    "averageHr" DOUBLE PRECISION,
    "maxHr" INTEGER,
    "averageCadence" DOUBLE PRECISION,
    "hasHeartrate" BOOLEAN NOT NULL DEFAULT false,
    "totalElevation" DOUBLE PRECISION,
    "elevHigh" DOUBLE PRECISION,
    "elevLow" DOUBLE PRECISION,
    "calories" DOUBLE PRECISION,
    "trimp" DOUBLE PRECISION,
    "runningTss" DOUBLE PRECISION,
    "estimatedVdot" DOUBLE PRECISION,
    "hrZone1Time" INTEGER,
    "hrZone2Time" INTEGER,
    "hrZone3Time" INTEGER,
    "hrZone4Time" INTEGER,
    "hrZone5Time" INTEGER,
    "hrZone6Time" INTEGER,
    "hrZone7Time" INTEGER,
    "rawJson" JSONB,
    "streams" JSONB,
    "trainingType" "WorkoutType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Activity_stravaId_key" ON "Activity"("stravaId");
CREATE INDEX IF NOT EXISTS "Activity_userId_startDate_idx" ON "Activity"("userId", "startDate");
CREATE INDEX IF NOT EXISTS "Activity_type_idx" ON "Activity"("type");
CREATE INDEX IF NOT EXISTS "Activity_userId_type_startDate_idx" ON "Activity"("userId", "type", "startDate");
CREATE INDEX IF NOT EXISTS "Activity_userId_hasHeartrate_idx" ON "Activity"("userId", "hasHeartrate");
CREATE INDEX IF NOT EXISTS "Activity_userId_estimatedVdot_idx" ON "Activity"("userId", "estimatedVdot");
CREATE INDEX IF NOT EXISTS "Activity_stravaId_idx" ON "Activity"("stravaId");
DO $$ BEGIN ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- DailyFitness
CREATE TABLE IF NOT EXISTS "DailyFitness" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "ctl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "atl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tsb" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ctlRunning" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trimp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "runningTss" DOUBLE PRECISION NOT NULL DEFAULT 0,
    CONSTRAINT "DailyFitness_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DailyFitness_userId_date_key" ON "DailyFitness"("userId", "date");
CREATE INDEX IF NOT EXISTS "DailyFitness_userId_date_idx" ON "DailyFitness"("userId", "date");
DO $$ BEGIN ALTER TABLE "DailyFitness" ADD CONSTRAINT "DailyFitness_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Goal
CREATE TABLE IF NOT EXISTS "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "raceType" "RaceType" NOT NULL,
    "raceDate" TIMESTAMP(3) NOT NULL,
    "targetTime" INTEGER,
    "currentVdot" DOUBLE PRECISION,
    "predictedTime" INTEGER,
    "marathonShapeFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "weeklyMileageGoal" DOUBLE PRECISION,
    "planWeeks" INTEGER NOT NULL DEFAULT 12,
    "runsPerWeek" INTEGER NOT NULL DEFAULT 4,
    "ridesPerWeek" INTEGER NOT NULL DEFAULT 0,
    "strengthPerWeek" INTEGER NOT NULL DEFAULT 0,
    "swimsPerWeek" INTEGER NOT NULL DEFAULT 0,
    "taperWeeks" INTEGER NOT NULL DEFAULT 2,
    "peakWeeks" INTEGER NOT NULL DEFAULT 4,
    "buildWeeks" INTEGER NOT NULL DEFAULT 4,
    "longRunDay" INTEGER NOT NULL DEFAULT 0,
    "workoutDay" INTEGER NOT NULL DEFAULT 3,
    "restDays" JSONB NOT NULL DEFAULT '[1, 5]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Goal_userId_isActive_idx" ON "Goal"("userId", "isActive");
DO $$ BEGIN ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Workout
CREATE TABLE IF NOT EXISTS "Workout" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "workoutType" "WorkoutType" NOT NULL,
    "description" TEXT NOT NULL,
    "phase" "PlanPhase" NOT NULL DEFAULT 'BASE',
    "order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "targetDistance" DOUBLE PRECISION,
    "targetDuration" INTEGER,
    "targetPace" DOUBLE PRECISION,
    "targetHrZone" INTEGER,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "linkedActivityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Workout_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Workout_goalId_scheduledDate_idx" ON "Workout"("goalId", "scheduledDate");
CREATE INDEX IF NOT EXISTS "Workout_goalId_isCompleted_idx" ON "Workout"("goalId", "isCompleted");
CREATE INDEX IF NOT EXISTS "Workout_linkedActivityId_idx" ON "Workout"("linkedActivityId");
DO $$ BEGIN ALTER TABLE "Workout" ADD CONSTRAINT "Workout_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Workout" ADD CONSTRAINT "Workout_linkedActivityId_fkey" FOREIGN KEY ("linkedActivityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Notification
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "read");
DO $$ BEGIN ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ApiKey
CREATE TABLE IF NOT EXISTS "ApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'My API Key',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ApiKey_userId_key" ON "ApiKey"("userId");
CREATE INDEX IF NOT EXISTS "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");
DO $$ BEGIN ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ChatSession
CREATE TABLE IF NOT EXISTS "ChatSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New Chat',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ChatSession_userId_updatedAt_idx" ON "ChatSession"("userId", "updatedAt");
DO $$ BEGIN ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ChatMessage
CREATE TABLE IF NOT EXISTS "ChatMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activityId" TEXT,
    "sessionId" TEXT,
    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ChatMessage_userId_createdAt_idx" ON "ChatMessage"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ChatMessage_sessionId_idx" ON "ChatMessage"("sessionId");
DO $$ BEGIN ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AiProvider
CREATE TABLE IF NOT EXISTS "AiProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "models" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsageReset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monthlyInputTokensUsed" INTEGER NOT NULL DEFAULT 0,
    "monthlyOutputTokensUsed" INTEGER NOT NULL DEFAULT 0,
    "monthlyTokenLimit" BIGINT,
    CONSTRAINT "AiProvider_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AiProvider_slug_key" ON "AiProvider"("slug");

-- GlobalAiSettings
CREATE TABLE IF NOT EXISTS "GlobalAiSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "defaultBaseUrl" TEXT NOT NULL DEFAULT 'https://api.openai.com/v1',
    "defaultApiKey" TEXT,
    "defaultModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "tier1Name" TEXT NOT NULL DEFAULT 'Basic',
    "tier1DailyLimit" INTEGER NOT NULL DEFAULT 10,
    "tier1MonthlyLimit" INTEGER NOT NULL DEFAULT 100,
    "tier2Name" TEXT NOT NULL DEFAULT 'Standard',
    "tier2DailyLimit" INTEGER NOT NULL DEFAULT 25,
    "tier2MonthlyLimit" INTEGER NOT NULL DEFAULT 300,
    "tier3Name" TEXT NOT NULL DEFAULT 'Premium',
    "tier3DailyLimit" INTEGER NOT NULL DEFAULT 50,
    "tier3MonthlyLimit" INTEGER NOT NULL DEFAULT 500,
    "dailyMessageLimit" INTEGER NOT NULL DEFAULT 50,
    "monthlyMessageLimit" INTEGER NOT NULL DEFAULT 500,
    "systemPrompt" TEXT NOT NULL DEFAULT 'You are a knowledgeable and encouraging running coach. Analyze the athlete''s data and provide personalized, actionable advice. Be specific when referencing their metrics and progress. Keep responses concise but insightful.',
    "activeProviderId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tier1DailyTokenLimit" INTEGER NOT NULL DEFAULT 50000,
    "tier1MonthlyTokenLimit" INTEGER NOT NULL DEFAULT 500000,
    "tier2DailyTokenLimit" INTEGER NOT NULL DEFAULT 100000,
    "tier2MonthlyTokenLimit" INTEGER NOT NULL DEFAULT 1000000,
    "tier3DailyTokenLimit" INTEGER NOT NULL DEFAULT 200000,
    "tier3MonthlyTokenLimit" INTEGER NOT NULL DEFAULT 2000000,
    "fallbackProviderId" TEXT,
    CONSTRAINT "GlobalAiSettings_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN ALTER TABLE "GlobalAiSettings" ADD CONSTRAINT "GlobalAiSettings_activeProviderId_fkey" FOREIGN KEY ("activeProviderId") REFERENCES "AiProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "GlobalAiSettings" ADD CONSTRAINT "GlobalAiSettings_fallbackProviderId_fkey" FOREIGN KEY ("fallbackProviderId") REFERENCES "AiProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- UserAiSettings
CREATE TABLE IF NOT EXISTS "UserAiSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adminAllowed" BOOLEAN NOT NULL DEFAULT false,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT false,
    "usageTier" TEXT NOT NULL DEFAULT 'none',
    "customBaseUrl" TEXT,
    "customApiKey" TEXT,
    "customModel" TEXT,
    "feedbackMode" TEXT NOT NULL DEFAULT 'on_demand',
    "accessFitnessMetrics" BOOLEAN NOT NULL DEFAULT false,
    "accessActivityHistory" BOOLEAN NOT NULL DEFAULT false,
    "accessHeartRateData" BOOLEAN NOT NULL DEFAULT false,
    "accessGoals" BOOLEAN NOT NULL DEFAULT false,
    "accessTrainingPlan" BOOLEAN NOT NULL DEFAULT false,
    "accessPerformance" BOOLEAN NOT NULL DEFAULT false,
    "accessBiometrics" BOOLEAN NOT NULL DEFAULT false,
    "customPromptAddition" TEXT,
    "messagesUsedToday" INTEGER NOT NULL DEFAULT 0,
    "messagesUsedThisMonth" INTEGER NOT NULL DEFAULT 0,
    "lastUsageReset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accessAllActivities" BOOLEAN NOT NULL DEFAULT false,
    "inputTokensUsedThisMonth" INTEGER NOT NULL DEFAULT 0,
    "inputTokensUsedToday" INTEGER NOT NULL DEFAULT 0,
    "outputTokensUsedThisMonth" INTEGER NOT NULL DEFAULT 0,
    "outputTokensUsedToday" INTEGER NOT NULL DEFAULT 0,
    "accessActivityLogs" BOOLEAN NOT NULL DEFAULT false,
    "accessNutritionLogs" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "UserAiSettings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserAiSettings_userId_key" ON "UserAiSettings"("userId");
CREATE INDEX IF NOT EXISTS "UserAiSettings_userId_idx" ON "UserAiSettings"("userId");
DO $$ BEGIN ALTER TABLE "UserAiSettings" ADD CONSTRAINT "UserAiSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AiDailyTokenUsage
CREATE TABLE IF NOT EXISTS "AiDailyTokenUsage" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "providerId" TEXT NOT NULL,
    CONSTRAINT "AiDailyTokenUsage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AiDailyTokenUsage_date_providerId_key" ON "AiDailyTokenUsage"("date", "providerId");
CREATE INDEX IF NOT EXISTS "AiDailyTokenUsage_date_idx" ON "AiDailyTokenUsage"("date");
DO $$ BEGIN ALTER TABLE "AiDailyTokenUsage" ADD CONSTRAINT "AiDailyTokenUsage_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AiProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AiUsageHistory
CREATE TABLE IF NOT EXISTS "AiUsageHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerId" TEXT,
    "model" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiUsageHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AiUsageHistory_userId_idx" ON "AiUsageHistory"("userId");
CREATE INDEX IF NOT EXISTS "AiUsageHistory_timestamp_idx" ON "AiUsageHistory"("timestamp");
DO $$ BEGIN ALTER TABLE "AiUsageHistory" ADD CONSTRAINT "AiUsageHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ActivityAiFeedback
CREATE TABLE IF NOT EXISTS "ActivityAiFeedback" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "plannedComparison" TEXT,
    "progressAnalysis" TEXT,
    "goalTrajectory" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityAiFeedback_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ActivityAiFeedback_activityId_key" ON "ActivityAiFeedback"("activityId");
CREATE INDEX IF NOT EXISTS "ActivityAiFeedback_activityId_idx" ON "ActivityAiFeedback"("activityId");
DO $$ BEGIN ALTER TABLE "ActivityAiFeedback" ADD CONSTRAINT "ActivityAiFeedback_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- FoodItem
CREATE TABLE IF NOT EXISTS "FoodItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "barcode" TEXT,
    "calories" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "fats" DOUBLE PRECISION NOT NULL,
    "servingSize" TEXT,
    "fiber" DOUBLE PRECISION,
    "sugar" DOUBLE PRECISION,
    "saturatedFat" DOUBLE PRECISION,
    "sodium" DOUBLE PRECISION,
    "potassium" DOUBLE PRECISION,
    "cholesterol" DOUBLE PRECISION,
    "calcium" DOUBLE PRECISION,
    "iron" DOUBLE PRECISION,
    CONSTRAINT "FoodItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FoodItem_barcode_key" ON "FoodItem"("barcode");

-- NutritionLog
CREATE TABLE IF NOT EXISTS "NutritionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "mealType" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "calories" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "fats" DOUBLE PRECISION NOT NULL,
    "fiber" DOUBLE PRECISION,
    "sugar" DOUBLE PRECISION,
    "saturatedFat" DOUBLE PRECISION,
    "sodium" DOUBLE PRECISION,
    "potassium" DOUBLE PRECISION,
    "cholesterol" DOUBLE PRECISION,
    "calcium" DOUBLE PRECISION,
    "iron" DOUBLE PRECISION,
    "foodItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NutritionLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "NutritionLog_userId_foodItemId_idx" ON "NutritionLog"("userId", "foodItemId");
DO $$ BEGIN ALTER TABLE "NutritionLog" ADD CONSTRAINT "NutritionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "NutritionLog" ADD CONSTRAINT "NutritionLog_foodItemId_fkey" FOREIGN KEY ("foodItemId") REFERENCES "FoodItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- UserNutritionTarget
CREATE TABLE IF NOT EXISTS "UserNutritionTarget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dailyCalories" INTEGER NOT NULL DEFAULT 2000,
    "proteinPercent" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "carbsPercent" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "fatsPercent" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserNutritionTarget_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserNutritionTarget_userId_key" ON "UserNutritionTarget"("userId");
CREATE INDEX IF NOT EXISTS "UserNutritionTarget_userId_idx" ON "UserNutritionTarget"("userId");
DO $$ BEGIN ALTER TABLE "UserNutritionTarget" ADD CONSTRAINT "UserNutritionTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- SavedMeal
CREATE TABLE IF NOT EXISTS "SavedMeal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalCalories" DOUBLE PRECISION NOT NULL,
    "totalProtein" DOUBLE PRECISION NOT NULL,
    "totalCarbs" DOUBLE PRECISION NOT NULL,
    "totalFats" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SavedMeal_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SavedMeal_userId_idx" ON "SavedMeal"("userId");
DO $$ BEGIN ALTER TABLE "SavedMeal" ADD CONSTRAINT "SavedMeal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- SavedMealItem
CREATE TABLE IF NOT EXISTS "SavedMealItem" (
    "id" TEXT NOT NULL,
    "savedMealId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "estimatedGrams" DOUBLE PRECISION NOT NULL,
    "calories" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "fats" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "SavedMealItem_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN ALTER TABLE "SavedMealItem" ADD CONSTRAINT "SavedMealItem_savedMealId_fkey" FOREIGN KEY ("savedMealId") REFERENCES "SavedMeal"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- DailyHealthLog
CREATE TABLE IF NOT EXISTS "DailyHealthLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "steps" INTEGER,
    "weight" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DailyHealthLog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DailyHealthLog_userId_date_key" ON "DailyHealthLog"("userId", "date");
CREATE INDEX IF NOT EXISTS "DailyHealthLog_userId_date_idx" ON "DailyHealthLog"("userId", "date");
DO $$ BEGIN ALTER TABLE "DailyHealthLog" ADD CONSTRAINT "DailyHealthLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Supplement
CREATE TABLE IF NOT EXISTS "Supplement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "timeOfDay" TEXT NOT NULL,
    "daysOfWeek" JSONB NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Supplement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Supplement_userId_timeOfDay_idx" ON "Supplement"("userId", "timeOfDay");
DO $$ BEGIN ALTER TABLE "Supplement" ADD CONSTRAINT "Supplement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- SupplementLog
CREATE TABLE IF NOT EXISTS "SupplementLog" (
    "id" TEXT NOT NULL,
    "supplementId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "taken" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupplementLog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SupplementLog_supplementId_date_key" ON "SupplementLog"("supplementId", "date");
DO $$ BEGIN ALTER TABLE "SupplementLog" ADD CONSTRAINT "SupplementLog_supplementId_fkey" FOREIGN KEY ("supplementId") REFERENCES "Supplement"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AdminAuditLog
CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminUser" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AdminAuditLog_adminUser_idx" ON "AdminAuditLog"("adminUser");
CREATE INDEX IF NOT EXISTS "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");
