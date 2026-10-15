-- AlterTable
ALTER TABLE "User" ADD COLUMN     "effectiveVo2maxCorrectionFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "matchToMyWhoosh" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "includeCrossTraining" SET DEFAULT false;
