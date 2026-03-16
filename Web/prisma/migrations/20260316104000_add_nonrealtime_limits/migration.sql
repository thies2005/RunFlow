-- Add 6 non-realtime AI limit fields
ALTER TABLE "public"."GlobalAiSettings" ADD COLUMN IF NOT EXISTS "tier1MealSuggestLimit" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "public"."GlobalAiSettings" ADD COLUMN IF NOT EXISTS "tier2MealSuggestLimit" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "public"."GlobalAiSettings" ADD COLUMN IF NOT EXISTS "tier3MealSuggestLimit" INTEGER NOT NULL DEFAULT 6;

ALTER TABLE "public"."GlobalAiSettings" ADD COLUMN IF NOT EXISTS "tier1ActivityFeedbackLimit" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "public"."GlobalAiSettings" ADD COLUMN IF NOT EXISTS "tier2ActivityFeedbackLimit" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "public"."GlobalAiSettings" ADD COLUMN IF NOT EXISTS "tier3ActivityFeedbackLimit" INTEGER NOT NULL DEFAULT 6;
