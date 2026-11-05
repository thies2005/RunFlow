-- Install the feed atomically. No backfill: new clients bootstrap from Activity.
BEGIN;

CREATE TABLE "ActivityFeedClock" (
    "userId" TEXT PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "version" BIGINT NOT NULL DEFAULT 0,
    "minimum" BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE "ActivityFeedChange" (
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "activityId" TEXT NOT NULL,
    "version" BIGINT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    PRIMARY KEY ("userId", "activityId")
);

CREATE INDEX "Activity_userId_id_idx" ON "Activity"("userId", "id");
CREATE INDEX "ActivityFeedChange_userId_version_idx" ON "ActivityFeedChange"("userId", "version");
CREATE INDEX "ActivityFeedChange_userId_deletedAt_idx" ON "ActivityFeedChange"("userId", "deletedAt");

CREATE FUNCTION runflow_record_activity_feed(feed_user TEXT, activity_id TEXT, is_deleted BOOLEAN)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    next_version BIGINT;
    pruned_version BIGINT;
BEGIN
    -- User deletion cascades clean up both feed tables themselves.
    IF NOT EXISTS (SELECT 1 FROM "User" WHERE "id" = feed_user) THEN
        RETURN;
    END IF;

    -- This per-user row stays locked until commit. A later version can never
    -- become visible before an earlier version for that user, even when a
    -- transaction mutates multiple activities or rolls back.
    INSERT INTO "ActivityFeedClock" ("userId", "version") VALUES (feed_user, 1)
    ON CONFLICT ("userId") DO UPDATE
        SET "version" = "ActivityFeedClock"."version" + 1
    RETURNING "version" INTO next_version;

    INSERT INTO "ActivityFeedChange" ("userId", "activityId", "version", "deletedAt")
    VALUES (feed_user, activity_id, next_version, CASE WHEN is_deleted THEN timezone('UTC', clock_timestamp()) END)
    ON CONFLICT ("userId", "activityId") DO UPDATE
        SET "version" = EXCLUDED."version", "deletedAt" = EXCLUDED."deletedAt";

    -- The feed stores only the latest event per activity. Occasionally prune
    -- old tombstones and force devices that predate them to rebootstrap.
    IF next_version % 128 = 0 THEN
        WITH removed AS (
            DELETE FROM "ActivityFeedChange"
            WHERE "userId" = feed_user AND "deletedAt" < timezone('UTC', clock_timestamp()) - INTERVAL '90 days'
            RETURNING "version"
        )
        SELECT MAX("version") INTO pruned_version FROM removed;
        IF pruned_version IS NOT NULL THEN
            UPDATE "ActivityFeedClock" SET "minimum" = GREATEST("minimum", pruned_version)
            WHERE "userId" = feed_user;
        END IF;
    END IF;
END;
$$;

-- Capture changes after the statement has acquired its activity row locks.
-- Taking the feed clock in a row trigger would let a bulk delete hold the
-- clock while waiting on a row whose writer is itself waiting for the clock.
CREATE FUNCTION runflow_track_activity_feed()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    change RECORD;
BEGIN
    IF TG_OP = 'DELETE' THEN
        FOR change IN SELECT "userId", "id" FROM old_activities ORDER BY "userId", "id" LOOP
            PERFORM runflow_record_activity_feed(change."userId", change."id", true);
        END LOOP;
    ELSIF TG_OP = 'INSERT' THEN
        FOR change IN SELECT "userId", "id" FROM new_activities ORDER BY "userId", "id" LOOP
            PERFORM runflow_record_activity_feed(change."userId", change."id", false);
        END LOOP;
    ELSE
        FOR change IN
            SELECT prior."userId", prior."id", true AS deleted
            FROM old_activities prior
            WHERE NOT EXISTS (
                SELECT 1 FROM new_activities current_row
                WHERE current_row."userId" = prior."userId" AND current_row."id" = prior."id"
            )
            UNION ALL
            SELECT "userId", "id", false FROM new_activities
            ORDER BY "userId", "id", deleted DESC
        LOOP
            PERFORM runflow_record_activity_feed(change."userId", change."id", change.deleted);
        END LOOP;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER runflow_activity_feed_after_insert
AFTER INSERT ON "Activity" REFERENCING NEW TABLE AS new_activities
FOR EACH STATEMENT EXECUTE FUNCTION runflow_track_activity_feed();

CREATE TRIGGER runflow_activity_feed_after_update
AFTER UPDATE ON "Activity" REFERENCING OLD TABLE AS old_activities NEW TABLE AS new_activities
FOR EACH STATEMENT EXECUTE FUNCTION runflow_track_activity_feed();

CREATE TRIGGER runflow_activity_feed_after_delete
AFTER DELETE ON "Activity" REFERENCING OLD TABLE AS old_activities
FOR EACH STATEMENT EXECUTE FUNCTION runflow_track_activity_feed();

COMMIT;
