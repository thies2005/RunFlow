-- AlterTable
ALTER TABLE "Activity" ADD COLUMN "averageWatts" DOUBLE PRECISION;
ALTER TABLE "Activity" ADD COLUMN "weightedAverageWatts" DOUBLE PRECISION;
ALTER TABLE "Activity" ADD COLUMN "deviceWatts" BOOLEAN NOT NULL DEFAULT false;
