-- CreateTable
CREATE TABLE "RaceResult" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "raceActivityId" TEXT,
    "actualTime" INTEGER,
    "chipTime" INTEGER,
    "placementOverall" INTEGER,
    "placementGender" INTEGER,
    "placementAgeGroup" INTEGER,
    "ageGroup" TEXT,
    "totalFinishers" INTEGER,
    "notes" TEXT,
    "weatherConditions" TEXT,
    "feltLike" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaceResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RaceResult_goalId_key" ON "RaceResult"("goalId");

-- CreateIndex
CREATE UNIQUE INDEX "RaceResult_raceActivityId_key" ON "RaceResult"("raceActivityId");

-- CreateIndex
CREATE INDEX "RaceResult_goalId_idx" ON "RaceResult"("goalId");

-- AddForeignKey
ALTER TABLE "RaceResult" ADD CONSTRAINT "RaceResult_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceResult" ADD CONSTRAINT "RaceResult_raceActivityId_fkey" FOREIGN KEY ("raceActivityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
