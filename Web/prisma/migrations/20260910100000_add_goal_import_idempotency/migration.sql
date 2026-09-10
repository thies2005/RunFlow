-- Idempotency for POST /api/plans/import: a lost response after the server
-- committed would otherwise make the app's retry import a duplicate plan.
-- importKey is derived from the workout localIds; importIdMap replays the
-- original localId -> serverId mapping on retry.
ALTER TABLE "Goal" ADD COLUMN "importKey" TEXT;
ALTER TABLE "Goal" ADD COLUMN "importIdMap" JSONB;

CREATE UNIQUE INDEX "Goal_importKey_key" ON "Goal"("importKey");
