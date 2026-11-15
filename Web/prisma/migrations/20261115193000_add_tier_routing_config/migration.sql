-- AlterTable
ALTER TABLE "GlobalAiSettings" ADD COLUMN IF NOT EXISTS "routingConfig" JSONB;
