ALTER TABLE "User" ADD COLUMN "stravaSyncToken" TEXT,
ADD COLUMN "stravaSyncExpiresAt" TIMESTAMP(3),
ADD COLUMN "stravaSyncRange" TEXT;
UPDATE "User" SET "syncInProgress" = false WHERE "syncInProgress";
CREATE INDEX "User_pending_strava_sync_idx" ON "User" ("stravaSyncExpiresAt") WHERE "stravaSyncRange" IS NOT NULL;

CREATE TABLE "StravaWebhookJob" (
    "userId" TEXT NOT NULL,
    "activityId" BIGINT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "eventTime" BIGINT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT,
    "version" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "fitnessFrom" TIMESTAMP(3),
    CONSTRAINT "StravaWebhookJob_pkey" PRIMARY KEY ("userId", "activityId"),
    CONSTRAINT "StravaWebhookJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "StravaWebhookJob_completedAt_dueAt_idx" ON "StravaWebhookJob"("completedAt", "dueAt");
CREATE INDEX "StravaWebhookJob_userId_completedAt_dueAt_idx" ON "StravaWebhookJob"("userId", "completedAt", "dueAt");
