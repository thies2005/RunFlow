-- CreateTable
CREATE TABLE "FatSecretFoodCache" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "results" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FatSecretFoodCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FatSecretFoodCache_query_key" ON "FatSecretFoodCache"("query");

-- CreateIndex
CREATE INDEX "FatSecretFoodCache_query_idx" ON "FatSecretFoodCache"("query");

-- CreateIndex
CREATE INDEX "FatSecretFoodCache_updatedAt_idx" ON "FatSecretFoodCache"("updatedAt");
