-- Add createdAt column for FastingSession
ALTER TABLE "public"."FastingSession"
    ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();
