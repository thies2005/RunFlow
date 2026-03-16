-- Add Non-realtime usage tracking fields to UserAiSettings
ALTER TABLE "public"."UserAiSettings" ADD COLUMN IF NOT EXISTS "mealSuggestsUsedToday" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "public"."UserAiSettings" ADD COLUMN IF NOT EXISTS "activityFeedbackUsedToday" INTEGER NOT NULL DEFAULT 0;
