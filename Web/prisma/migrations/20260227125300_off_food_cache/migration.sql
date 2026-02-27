-- CreateTable
CREATE TABLE "OffFoodCache" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "results" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OffFoodCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OffFoodCache_query_key" ON "OffFoodCache"("query");

-- CreateIndex
CREATE INDEX "OffFoodCache_query_idx" ON "OffFoodCache"("query");

-- CreateIndex
CREATE INDEX "OffFoodCache_updatedAt_idx" ON "OffFoodCache"("updatedAt");
