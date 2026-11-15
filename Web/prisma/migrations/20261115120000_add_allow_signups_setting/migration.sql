-- AlterTable
ALTER TABLE "GlobalAiSettings" ADD COLUMN IF NOT EXISTS "allowSignups" BOOLEAN NOT NULL DEFAULT true;
