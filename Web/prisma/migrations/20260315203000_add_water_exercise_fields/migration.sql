-- AlterTable
ALTER TABLE "DailyHealthLog" ADD COLUMN "waterIntake" INTEGER;

-- AlterTable
ALTER TABLE "UserNutritionTarget" ADD COLUMN "exerciseCalorieFactor" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
ADD COLUMN "waterGoalMl" INTEGER NOT NULL DEFAULT 2500,
ADD COLUMN "waterTrackingEnabled" BOOLEAN NOT NULL DEFAULT false;
