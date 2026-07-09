-- CreateTable: shared workout library (audit G8)
CREATE TABLE "WorkoutTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "workoutType" "WorkoutType" NOT NULL,
    "sport" TEXT NOT NULL DEFAULT 'RUN',
    "targetDistance" DOUBLE PRECISION,
    "targetDuration" INTEGER,
    "targetPace" DOUBLE PRECISION,
    "structuredSteps" JSONB,
    "difficulty" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkoutTemplate_workoutType_idx" ON "WorkoutTemplate"("workoutType");

-- CreateIndex
CREATE INDEX "WorkoutTemplate_category_idx" ON "WorkoutTemplate"("category");

-- CreateIndex
CREATE INDEX "WorkoutTemplate_isPublished_idx" ON "WorkoutTemplate"("isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutTemplate_name_key" ON "WorkoutTemplate"("name");
