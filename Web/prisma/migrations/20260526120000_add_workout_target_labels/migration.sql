ALTER TABLE "Workout" ADD COLUMN "targetHrZoneLabel" TEXT;
ALTER TABLE "Workout" ADD COLUMN "targetHrMinBpm" INTEGER;
ALTER TABLE "Workout" ADD COLUMN "targetHrMaxBpm" INTEGER;
ALTER TABLE "Workout" ADD COLUMN "targetPaceZoneLabel" TEXT;
ALTER TABLE "Workout" ADD COLUMN "targetPaceMinSecondsPerKm" DOUBLE PRECISION;
ALTER TABLE "Workout" ADD COLUMN "targetPaceMaxSecondsPerKm" DOUBLE PRECISION;
