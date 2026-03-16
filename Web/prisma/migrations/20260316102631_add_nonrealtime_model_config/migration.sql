-- Add non-realtime model config fields to GlobalAiSettings
ALTER TABLE "public"."GlobalAiSettings" ADD COLUMN IF NOT EXISTS "mealSuggestModel" TEXT NOT NULL DEFAULT 'gemini-1.5-flash';
ALTER TABLE "public"."GlobalAiSettings" ADD COLUMN IF NOT EXISTS "activityFeedbackModel" TEXT NOT NULL DEFAULT 'gemini-1.5-flash';
