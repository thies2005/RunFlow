-- AlterTable
ALTER TABLE "GlobalAiSettings" ADD COLUMN     "calorieSnapModel" TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
ADD COLUMN     "tier1CalorieSnapLimit" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "tier2CalorieSnapLimit" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "tier3CalorieSnapLimit" INTEGER NOT NULL DEFAULT 6;

-- AlterTable
ALTER TABLE "UserAiSettings" ADD COLUMN     "calorieSnapsUsedToday" INTEGER NOT NULL DEFAULT 0;
