-- AlterTable
ALTER TABLE "UserNutritionTarget" ADD COLUMN "exerciseCalorieSource" TEXT NOT NULL DEFAULT 'strava';

-- CreateIndex (from schema.prisma @@index on NutritionLog)
CREATE INDEX IF NOT EXISTS "NutritionLog_userId_foodItemId_idx" ON "NutritionLog"("userId", "foodItemId");
