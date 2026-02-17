-- CreateTable
CREATE TABLE "Lap" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "distance" DOUBLE PRECISION,
    "movingTime" INTEGER,
    "totalElevationGain" DOUBLE PRECISION,

    CONSTRAINT "Lap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Split" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "distance" DOUBLE PRECISION,
    "movingTime" INTEGER,
    "averageSpeed" DOUBLE PRECISION,
    "averageHr" DOUBLE PRECISION,
    "totalElevationGain" DOUBLE PRECISION,

    CONSTRAINT "Split_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lap_activityId_idx" ON "Lap"("activityId");

-- CreateIndex
CREATE INDEX "Split_activityId_idx" ON "Split"("activityId");

-- AddForeignKey
ALTER TABLE "Lap" ADD CONSTRAINT "Lap_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Split" ADD CONSTRAINT "Split_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
