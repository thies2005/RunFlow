-- AlterTable
ALTER TABLE "UserNutritionTarget" ADD COLUMN IF NOT EXISTS "exerciseCalorieSource" TEXT NOT NULL DEFAULT 'strava';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NutritionLog_userId_foodItemId_idx" ON "NutritionLog"("userId", "foodItemId");
