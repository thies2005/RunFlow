-- Create ApiRouteMetric table
CREATE TABLE IF NOT EXISTS "ApiRouteMetric" (
    "id" TEXT NOT NULL,
    "routePath" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "cpuUsage" DOUBLE PRECISION,
    "memoryUsage" DOUBLE PRECISION,
    "requestSize" INTEGER,
    "responseSize" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "userId" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT
);

-- Create indexes for ApiRouteMetric
CREATE INDEX IF NOT EXISTS "ApiRouteMetric_routePath_timestamp_idx" ON "ApiRouteMetric"("routePath", "timestamp");
CREATE INDEX IF NOT EXISTS "ApiRouteMetric_timestamp_idx" ON "ApiRouteMetric"("timestamp");
CREATE INDEX IF NOT EXISTS "ApiRouteMetric_userId_idx" ON "ApiRouteMetric"("userId");

-- Create ErrorLog table
CREATE TABLE IF NOT EXISTS "ErrorLog" (
    "id" TEXT NOT NULL,
    "routePath" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "stackTrace" TEXT,
    "userId" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "resolved" BOOLEAN NOT NULL DEFAULT FALSE,
    "count" INTEGER NOT NULL DEFAULT 1,
    "fingerprint" TEXT
);

-- Create indexes for ErrorLog
CREATE INDEX IF NOT EXISTS "ErrorLog_timestamp_idx" ON "ErrorLog"("timestamp");
CREATE INDEX IF NOT EXISTS "ErrorLog_routePath_idx" ON "ErrorLog"("routePath");
CREATE INDEX IF NOT EXISTS "ErrorLog_errorMessage_idx" ON "ErrorLog"("errorMessage");
CREATE INDEX IF NOT EXISTS "ErrorLog_fingerprint_idx" ON "ErrorLog"("fingerprint");
CREATE INDEX IF NOT EXISTS "ErrorLog_resolved_idx" ON "ErrorLog"("resolved");

-- Create PerformanceSummary table
CREATE TABLE IF NOT EXISTS "PerformanceSummary" (
    "id" TEXT NOT NULL,
    "routePath" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "timeRange" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "requestCount" INTEGER NOT NULL,
    "errorCount" INTEGER NOT NULL,
    "avgResponseTime" DOUBLE PRECISION NOT NULL,
    "p50ResponseTime" DOUBLE PRECISION NOT NULL,
    "p95ResponseTime" DOUBLE PRECISION NOT NULL,
    "p99ResponseTime" DOUBLE PRECISION NOT NULL,
    "avgCpuUsage" DOUBLE PRECISION NOT NULL,
    "avgMemoryUsage" DOUBLE PRECISION NOT NULL
);

-- Create unique constraint for PerformanceSummary
CREATE UNIQUE INDEX IF NOT EXISTS "PerformanceSummary_route_method_timeRange_timestamp_key" ON "PerformanceSummary"("routePath", "method", "timeRange", "timestamp");
CREATE INDEX IF NOT EXISTS "PerformanceSummary_routePath_timeRange_idx" ON "PerformanceSummary"("routePath", "timeRange");
CREATE INDEX IF NOT EXISTS "PerformanceSummary_timestamp_idx" ON "PerformanceSummary"("timestamp");

-- Create SessionReplay table
CREATE TABLE IF NOT EXISTS "SessionReplay" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT NOT NULL,
    "events" JSONB,
    "routePath" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "duration" INTEGER NOT NULL
);

-- Create indexes for SessionReplay
CREATE INDEX IF NOT EXISTS "SessionReplay_userId_timestamp_idx" ON "SessionReplay"("userId", "timestamp");
CREATE INDEX IF NOT EXISTS "SessionReplay_timestamp_idx" ON "SessionReplay"("timestamp");
CREATE INDEX IF NOT EXISTS "SessionReplay_sessionId_idx" ON "SessionReplay"("sessionId");

-- Create Release table
CREATE TABLE IF NOT EXISTS "Release" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "deployedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "deployedBy" TEXT,
    "commitHash" TEXT,
    "notes" TEXT
);

-- Create indexes for Release
CREATE INDEX IF NOT EXISTS "Release_deployedAt_idx" ON "Release"("deployedAt");
