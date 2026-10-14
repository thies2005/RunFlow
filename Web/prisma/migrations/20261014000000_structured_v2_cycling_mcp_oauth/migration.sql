-- AlterTable: User (Cycling FTP & Swim CSS)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ftpWatts" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "autoEstimateFtp" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "swimCssSecPer100m" INTEGER;

-- AlterTable: Activity (Cycling Power & Zone Telemetry)
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "maxWatts" DOUBLE PRECISION;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "kilojoules" DOUBLE PRECISION;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "npWatts" DOUBLE PRECISION;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "intensityFactor" DOUBLE PRECISION;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "variabilityIndex" DOUBLE PRECISION;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "bikeTss" DOUBLE PRECISION;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "efficiencyFactor" DOUBLE PRECISION;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "aerobicDecoupling" DOUBLE PRECISION;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "powerZone1Time" INTEGER;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "powerZone2Time" INTEGER;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "powerZone3Time" INTEGER;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "powerZone4Time" INTEGER;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "powerZone5Time" INTEGER;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "powerZone6Time" INTEGER;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "powerZone7Time" INTEGER;

-- AlterTable: DailyFitness (Bike PMC Load)
ALTER TABLE "DailyFitness" ADD COLUMN IF NOT EXISTS "bikeTss" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "DailyFitness" ADD COLUMN IF NOT EXISTS "ctlBike" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "DailyFitness" ADD COLUMN IF NOT EXISTS "atlBike" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "DailyFitness" ADD COLUMN IF NOT EXISTS "tsbBike" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable: Goal (Multi-Sport Creation Baselines & Phase Blocks)
ALTER TABLE "Goal" ADD COLUMN IF NOT EXISTS "ftpAtCreation" INTEGER;
ALTER TABLE "Goal" ADD COLUMN IF NOT EXISTS "swimCssAtCreation" INTEGER;
ALTER TABLE "Goal" ADD COLUMN IF NOT EXISTS "weeklyBikeTssGoal" DOUBLE PRECISION;
ALTER TABLE "Goal" ADD COLUMN IF NOT EXISTS "weeklySwimMetersGoal" DOUBLE PRECISION;
ALTER TABLE "Goal" ADD COLUMN IF NOT EXISTS "targetWeeklyTss" DOUBLE PRECISION;
ALTER TABLE "Goal" ADD COLUMN IF NOT EXISTS "phaseBlocks" JSONB;

-- AlterTable: Workout (v2 Power, Cadence & RPE Targets)
ALTER TABLE "Workout" ADD COLUMN IF NOT EXISTS "targetPowerWatts" INTEGER;
ALTER TABLE "Workout" ADD COLUMN IF NOT EXISTS "targetPowerMinWatts" INTEGER;
ALTER TABLE "Workout" ADD COLUMN IF NOT EXISTS "targetPowerMaxWatts" INTEGER;
ALTER TABLE "Workout" ADD COLUMN IF NOT EXISTS "targetPowerZone" INTEGER;
ALTER TABLE "Workout" ADD COLUMN IF NOT EXISTS "targetFtpPercent" INTEGER;
ALTER TABLE "Workout" ADD COLUMN IF NOT EXISTS "targetCadenceRpm" INTEGER;
ALTER TABLE "Workout" ADD COLUMN IF NOT EXISTS "targetRpe" INTEGER;

-- CreateTable: McpOAuthClient
CREATE TABLE IF NOT EXISTS "McpOAuthClient" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecretHash" TEXT,
    "clientName" TEXT NOT NULL,
    "redirectUris" JSONB NOT NULL,
    "grantTypes" JSONB NOT NULL DEFAULT '["authorization_code","refresh_token"]',
    "responseTypes" JSONB NOT NULL DEFAULT '["code"]',
    "tokenEndpointAuthMethod" TEXT NOT NULL DEFAULT 'none',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "McpOAuthClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable: McpOAuthCode
CREATE TABLE IF NOT EXISTS "McpOAuthCode" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "codeChallenge" TEXT NOT NULL,
    "codeChallengeMethod" TEXT NOT NULL DEFAULT 'S256',
    "scope" TEXT NOT NULL DEFAULT 'mcp:full',
    "resource" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "McpOAuthCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable: McpOAuthToken
CREATE TABLE IF NOT EXISTS "McpOAuthToken" (
    "id" TEXT NOT NULL,
    "accessTokenHash" TEXT NOT NULL,
    "refreshTokenHash" TEXT,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'mcp:full',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "refreshExpiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "McpOAuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX IF NOT EXISTS "McpOAuthClient_clientId_key" ON "McpOAuthClient"("clientId");
CREATE UNIQUE INDEX IF NOT EXISTS "McpOAuthCode_codeHash_key" ON "McpOAuthCode"("codeHash");
CREATE INDEX IF NOT EXISTS "McpOAuthCode_userId_idx" ON "McpOAuthCode"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "McpOAuthToken_accessTokenHash_key" ON "McpOAuthToken"("accessTokenHash");
CREATE UNIQUE INDEX IF NOT EXISTS "McpOAuthToken_refreshTokenHash_key" ON "McpOAuthToken"("refreshTokenHash");
CREATE INDEX IF NOT EXISTS "McpOAuthToken_userId_idx" ON "McpOAuthToken"("userId");
CREATE INDEX IF NOT EXISTS "McpOAuthToken_accessTokenHash_idx" ON "McpOAuthToken"("accessTokenHash");

-- AddForeignKeys (Idempotent DO blocks)
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'McpOAuthCode_clientId_fkey') THEN ALTER TABLE "McpOAuthCode" ADD CONSTRAINT "McpOAuthCode_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "McpOAuthClient"("clientId") ON DELETE CASCADE ON UPDATE CASCADE; END IF; IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'McpOAuthCode_userId_fkey') THEN ALTER TABLE "McpOAuthCode" ADD CONSTRAINT "McpOAuthCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'McpOAuthToken_clientId_fkey') THEN ALTER TABLE "McpOAuthToken" ADD CONSTRAINT "McpOAuthToken_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "McpOAuthClient"("clientId") ON DELETE CASCADE ON UPDATE CASCADE; END IF; IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'McpOAuthToken_userId_fkey') THEN ALTER TABLE "McpOAuthToken" ADD CONSTRAINT "McpOAuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;
