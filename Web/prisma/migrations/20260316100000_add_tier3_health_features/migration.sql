-- CreateTable for HealthInsight
CREATE TABLE "public"."HealthInsight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "rangeStart" TIMESTAMP(3) NOT NULL,
    "rangeEnd" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable for BodyMeasurement
CREATE TABLE "public"."BodyMeasurement" (
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

-- CreateTable for FastingSession
CREATE TABLE "public"."FastingSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "targetHours" INTEGER NOT NULL DEFAULT 16,

    CONSTRAINT "FastingSession_pkey" PRIMARY KEY ("id")
);

-- Add new Tier 3 columns to UserNutritionTarget
ALTER TABLE "public"."UserNutritionTarget" ADD COLUMN IF NOT EXISTS "aiInsightProvider" TEXT NOT NULL DEFAULT 'gemini';
ALTER TABLE "public"."UserNutritionTarget" ADD COLUMN IF NOT EXISTS "aiInsightApiKey" TEXT;
ALTER TABLE "public"."UserNutritionTarget" ADD COLUMN IF NOT EXISTS "fastingEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "public"."UserNutritionTarget" ADD COLUMN IF NOT EXISTS "fastingGoalHours" INTEGER NOT NULL DEFAULT 16;

-- CreateIndex
CREATE INDEX "HealthInsight_userId_date_idx" ON "public"."HealthInsight"("userId", "date");
CREATE UNIQUE INDEX "BodyMeasurement_userId_date_key" ON "public"."BodyMeasurement"("userId", "date");
CREATE INDEX "FastingSession_userId_startTime_idx" ON "public"."FastingSession"("userId", "startTime");

-- AddForeignKey
ALTER TABLE "public"."HealthInsight" ADD CONSTRAINT "HealthInsight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."BodyMeasurement" ADD CONSTRAINT "BodyMeasurement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."FastingSession" ADD CONSTRAINT "FastingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
