package com.runflow2.app.data.db

import androidx.room.ColumnInfo
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Index
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.runflow2.app.domain.model.ActivityType
import com.runflow2.app.domain.model.PlanPhase
import com.runflow2.app.domain.model.WorkoutType
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "activities", indices = [Index("serverId")])
data class ActivityEntity(
    @PrimaryKey val id: String,
    val name: String,
    val type: String,
    val startDate: Long, // epoch millis
    val distanceMeters: Double,
    val movingTimeSec: Int,
    val averageHr: Double?,
    val maxHr: Int?,
    val averageCadence: Double?,
    val totalElevation: Double,
    val calories: Int?,
    val trimp: Double,
    val trainingType: String?, // WorkoutType label of the session
    val hrZone1Sec: Int = 0,
    val hrZone2Sec: Int = 0,
    val hrZone3Sec: Int = 0,
    val hrZone4Sec: Int = 0,
    val hrZone5Sec: Int = 0,
    val hrZone6Sec: Int = 0,
    val hrZone7Sec: Int = 0,
    val estimatedVdot: Double?,
    val routeJson: String?, // [[lat,lng],...]
    val lapsJson: String?, // [{km,durSec,paceSecPerKm}]
    val notes: String? = null,
    // ---- sync metadata (v2). defaultValue mirrors the ALTER TABLE used in
    // MIGRATION_1_2 so Room's post-migration schema validation passes. ----
    val serverId: String? = null,
    @ColumnInfo(defaultValue = "0") val updatedAt: Long = 0,
    @ColumnInfo(defaultValue = "0") val dirty: Boolean = false,
    @ColumnInfo(defaultValue = "1") val isDemo: Boolean = false,
) {
    val distanceKm: Double get() = distanceMeters / 1000.0
    val paceSecPerKm: Double? get() = if (distanceMeters > 0) movingTimeSec / distanceKm else null
    val zoneSeconds: List<Int> get() = listOf(hrZone1Sec, hrZone2Sec, hrZone3Sec, hrZone4Sec, hrZone5Sec, hrZone6Sec, hrZone7Sec)
}

@Entity(tableName = "goals")
data class GoalEntity(
    @PrimaryKey val id: String,
    val name: String,
    val raceType: String,
    val raceDate: Long,
    val targetTimeSec: Int?,
    val weeklyKmGoal: Double,
    val planWeeks: Int,
    val runsPerWeek: Int,
    val strengthPerWeek: Int,
    val longRunDay: Int, // DayOfWeek.value 1..7
    val workoutDay: Int,
    val restDays: String, // csv of DayOfWeek values
    val taperWeeks: Int,
    val vdotAtCreation: Double?,
    val isActive: Boolean,
    val createdAt: Long,
    val completedAt: Long? = null,
    val customDistanceKm: Double? = null,
    @ColumnInfo(defaultValue = "1") val isDemo: Boolean = false,
    // ---- plan sync metadata (v3). defaultValue mirrors the ALTER TABLE used
    // in MIGRATION_2_3 so Room's post-migration schema validation passes.
    // isLocalOnly plans were generated on-device and never uploaded; synced
    // plans carry the server id and reconcile through the outbox/pull. ----
    val planStartDate: Long? = null,
    @ColumnInfo(defaultValue = "1") val isLocalOnly: Boolean = true,
    @ColumnInfo(defaultValue = "0") val dirty: Boolean = false,
    // web builder plan metadata (v5): how the plan was created and how much
    // AI guidance it carries; null on generator/mobile-originated plans
    val creationMode: String? = null,
    val guidanceLevel: String? = null,
)

@Entity(tableName = "workouts")
data class WorkoutEntity(
    @PrimaryKey val id: String,
    val goalId: String,
    val scheduledDate: Long, // epoch millis at midnight local
    val workoutType: String, // WorkoutType name
    val phase: String, // PlanPhase name
    val description: String,
    val targetDistanceKm: Double?,
    val targetPaceSecPerKm: Int?,
    val targetDurationSec: Int?,
    val isCompleted: Boolean = false,
    val completedAt: Long? = null,
    val activityId: String? = null,
    val sortIndex: Int = 0,
    @ColumnInfo(defaultValue = "1") val isDemo: Boolean = false,
    // dirty = a local edit is queued for the server (v3)
    @ColumnInfo(defaultValue = "0") val dirty: Boolean = false,
    // structuredSteps as received from the server (v4): generator flat shape
    // or builder nested shape, parsed by StructuredStepsParser at record time
    val structuredStepsJson: String? = null,
    // web builder fields (v5): user-titled name plus the HR/pace target range
    // the builder sets; null on generator-only workouts
    val customName: String? = null,
    val targetHrZone: Int? = null,
    val targetHrMinBpm: Int? = null,
    val targetHrMaxBpm: Int? = null,
    val targetPaceMinSecPerKm: Double? = null,
    val targetPaceMaxSecPerKm: Double? = null,
)

@Entity(tableName = "profile")
data class ProfileEntity(
    @PrimaryKey val id: Int = 1,
    val name: String = "RunFlow Athlete",
    val email: String = "",
    val sex: String = "MALE",
    val birthYear: Int = 1995,
    val weightKg: Double = 72.0,
    val heightCm: Double = 178.0,
    val hrMax: Int = 192,
    val hrRest: Int = 52,
    val hrZone1Max: Int = 130,
    val hrZone2Max: Int = 148,
    val hrZone3Max: Int = 160,
    val hrZone4Max: Int = 170,
    val hrZone5Max: Int = 178,
    val hrZone6Max: Int = 187,
    val thresholdHr: Int = 172,
    val thresholdPaceSecPerKm: Int = 275,
    val vdotCorrection: Double = 1.0,
    // ---- sync metadata (v2) ----
    @ColumnInfo(defaultValue = "0") val dirty: Boolean = false,
)

/** Outbox: durable queue of local mutations awaiting upload. */
@Entity(tableName = "sync_queue")
data class SyncQueueEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val entityType: String, // activity_create | activity_update | profile_update | workout_create | workout_update | workout_delete | goal_update | goal_delete
    val localId: String,
    val payloadJson: String,
    val retryCount: Int = 0,
    val maxRetries: Int = 8,
    val dead: Boolean = false,
    val createdAt: Long = System.currentTimeMillis(),
    val lastAttemptAt: Long? = null,
)

@Entity(tableName = "chat_messages")
data class ChatMessageEntity(
    @PrimaryKey val id: String,
    val sessionId: String,
    val role: String, // user | assistant
    val content: String,
    val createdAt: Long,
)

/**
 * Local undo history for plan edits (v6, web: src/lib/plan/snapshot.ts):
 * one row per pre-mutation snapshot of a goal's workouts, stored as a JSON
 * array (WorkoutSnapshotDto). Undo consumes the newest row; inserts prune
 * the goal's history back to MAX_PLAN_SNAPSHOTS_PER_GOAL.
 */
@Entity(tableName = "plan_snapshots", indices = [Index("goalId")])
data class PlanSnapshotEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val goalId: String,
    val createdAtEpochMs: Long,
    val workoutsJson: String, // JSON array of WorkoutSnapshotDto
)

@Dao
interface ActivityDao {
    @Query("SELECT * FROM activities ORDER BY startDate DESC")
    fun observeAll(): Flow<List<ActivityEntity>>

    @Query("SELECT * FROM activities ORDER BY startDate DESC LIMIT :limit")
    fun observeRecent(limit: Int): Flow<List<ActivityEntity>>

    @Query("SELECT * FROM activities WHERE id = :id")
    suspend fun byId(id: String): ActivityEntity?

    @Query("SELECT * FROM activities WHERE serverId = :serverId LIMIT 1")
    suspend fun byServerId(serverId: String): ActivityEntity?

    @Query("SELECT * FROM activities ORDER BY startDate DESC")
    suspend fun all(): List<ActivityEntity>

    @Query("SELECT * FROM activities WHERE dirty = 1")
    suspend fun dirty(): List<ActivityEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(activity: ActivityEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(activities: List<ActivityEntity>)

    @Query("DELETE FROM activities WHERE id = :id")
    suspend fun delete(id: String)

    @Query("DELETE FROM activities")
    suspend fun clear()

    @Query("DELETE FROM activities WHERE isDemo = 1")
    suspend fun deleteDemo()

    @Query("SELECT COUNT(*) FROM activities")
    suspend fun count(): Int
}

@Dao
interface GoalDao {
    @Query("SELECT * FROM goals WHERE isActive = 1 ORDER BY createdAt DESC LIMIT 1")
    fun observeActive(): Flow<GoalEntity?>

    @Query("SELECT * FROM goals ORDER BY createdAt DESC")
    fun observeAll(): Flow<List<GoalEntity>>

    @Query("SELECT * FROM goals WHERE id = :id")
    suspend fun byId(id: String): GoalEntity?

    @Query("SELECT * FROM goals WHERE isLocalOnly = 0")
    suspend fun serverGoals(): List<GoalEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(goal: GoalEntity)

    @Query("DELETE FROM goals WHERE id = :id")
    suspend fun delete(id: String)

    @Query("UPDATE goals SET isActive = 0, completedAt = :completedAt WHERE id = :id")
    suspend fun complete(id: String, completedAt: Long)

    @Query("DELETE FROM goals WHERE isDemo = 1")
    suspend fun deleteDemo()
}

@Dao
interface WorkoutDao {
    @Query("SELECT * FROM workouts WHERE goalId = :goalId ORDER BY scheduledDate ASC, sortIndex ASC")
    fun observeForGoal(goalId: String): Flow<List<WorkoutEntity>>

    @Query("SELECT * FROM workouts WHERE goalId = :goalId ORDER BY scheduledDate ASC")
    suspend fun forGoal(goalId: String): List<WorkoutEntity>

    @Query("SELECT * FROM workouts WHERE scheduledDate BETWEEN :from AND :to AND isCompleted = 0 ORDER BY scheduledDate ASC")
    suspend fun pendingBetween(from: Long, to: Long): List<WorkoutEntity>

    @Query("SELECT * FROM workouts WHERE id = :id")
    suspend fun byId(id: String): WorkoutEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(workout: WorkoutEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(workouts: List<WorkoutEntity>)

    @Query("DELETE FROM workouts WHERE id = :id")
    suspend fun delete(id: String)

    @Query("DELETE FROM workouts WHERE goalId = :goalId")
    suspend fun deleteForGoal(goalId: String)

    @Query("DELETE FROM workouts WHERE isDemo = 1")
    suspend fun deleteDemo()

    @Query("SELECT COUNT(*) FROM workouts")
    suspend fun count(): Int
}

@Dao
interface ProfileDao {
    @Query("SELECT * FROM profile WHERE id = 1")
    fun observe(): Flow<ProfileEntity?>

    @Query("SELECT * FROM profile WHERE id = 1")
    suspend fun get(): ProfileEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(profile: ProfileEntity)
}

@Dao
interface SyncQueueDao {
    @Insert
    suspend fun insert(item: SyncQueueEntity): Long

    @Query("SELECT * FROM sync_queue WHERE dead = 0 ORDER BY id ASC LIMIT :limit")
    suspend fun nextBatch(limit: Int): List<SyncQueueEntity>

    @Query("DELETE FROM sync_queue WHERE id = :id")
    suspend fun markCompleted(id: Long)

    @Query("UPDATE sync_queue SET retryCount = retryCount + 1, lastAttemptAt = :now WHERE id = :id")
    suspend fun incrementRetry(id: Long, now: Long)

    @Query("UPDATE sync_queue SET dead = 1, lastAttemptAt = :now WHERE id = :id")
    suspend fun markDead(id: Long, now: Long)

    @Query("SELECT COUNT(*) FROM sync_queue WHERE dead = 0")
    fun observePendingCount(): Flow<Int>

    @Query("SELECT COUNT(*) FROM sync_queue WHERE dead = 0")
    suspend fun pendingCount(): Int

    @Query("DELETE FROM sync_queue WHERE entityType = :type AND dead = 0 AND localId = :localId")
    suspend fun deletePendingFor(type: String, localId: String)

    @Query("SELECT * FROM sync_queue WHERE entityType = :type AND dead = 0 AND localId = :localId")
    suspend fun pendingFor(type: String, localId: String): List<SyncQueueEntity>

    @Query("DELETE FROM sync_queue")
    suspend fun clear()
}

@Dao
interface ChatDao {
    @Query("SELECT * FROM chat_messages WHERE sessionId = :sessionId ORDER BY createdAt ASC, id ASC")
    fun observeForSession(sessionId: String): Flow<List<ChatMessageEntity>>

    @Query("SELECT * FROM chat_messages ORDER BY createdAt ASC, id ASC")
    fun observeAll(): Flow<List<ChatMessageEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(message: ChatMessageEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(messages: List<ChatMessageEntity>)

    @Query("UPDATE chat_messages SET content = :content WHERE id = :id")
    suspend fun updateContent(id: String, content: String)

    @Query("DELETE FROM chat_messages WHERE id = :id")
    suspend fun delete(id: String)

    @Query("DELETE FROM chat_messages WHERE sessionId = :sessionId")
    suspend fun deleteForSession(sessionId: String)

    @Query("DELETE FROM chat_messages")
    suspend fun clear()
}

@Dao
interface PlanSnapshotDao {
    @Insert
    suspend fun insertSnapshot(snapshot: PlanSnapshotEntity): Long

    /** Newest first (autoincrement id is monotonic, matching web's createdAt sort). */
    @Query("SELECT * FROM plan_snapshots WHERE goalId = :goalId ORDER BY id DESC LIMIT :limit")
    suspend fun latestForGoal(goalId: String, limit: Int): List<PlanSnapshotEntity>

    @Query("SELECT COUNT(*) FROM plan_snapshots WHERE goalId = :goalId")
    fun snapshotCountForGoal(goalId: String): Flow<Int>

    /** Deletes everything but the newest :keep snapshots of a goal (undo depth cap). */
    @Query(
        "DELETE FROM plan_snapshots WHERE goalId = :goalId AND id IN (" +
            "SELECT id FROM plan_snapshots WHERE goalId = :goalId ORDER BY id DESC LIMIT -1 OFFSET :keep)"
    )
    suspend fun deleteOldestBeyond(goalId: String, keep: Int)

    @Query("DELETE FROM plan_snapshots WHERE id = :id")
    suspend fun delete(id: Long)

    @Query("DELETE FROM plan_snapshots WHERE goalId = :goalId")
    suspend fun deleteAllForGoal(goalId: String)
}

@Database(
    entities = [
        ActivityEntity::class, GoalEntity::class, WorkoutEntity::class, ProfileEntity::class,
        SyncQueueEntity::class, ChatMessageEntity::class, PlanSnapshotEntity::class,
    ],
    version = 6,
    exportSchema = false,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun activityDao(): ActivityDao
    abstract fun goalDao(): GoalDao
    abstract fun workoutDao(): WorkoutDao
    abstract fun profileDao(): ProfileDao
    abstract fun syncQueueDao(): SyncQueueDao
    abstract fun chatDao(): ChatDao
    abstract fun planSnapshotDao(): PlanSnapshotDao

    companion object {
        /**
         * v1 -> v2 adds sync metadata + outbox + chat cache. Everything that
         * existed before sync shipped is demo/seed data, so it is flagged as
         * such and cleared the first time the user logs in.
         */
        val MIGRATION_1_2: Migration = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE activities ADD COLUMN serverId TEXT")
                db.execSQL("ALTER TABLE activities ADD COLUMN updatedAt INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE activities ADD COLUMN dirty INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE activities ADD COLUMN isDemo INTEGER NOT NULL DEFAULT 1")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_activities_serverId ON activities(serverId)")
                db.execSQL("ALTER TABLE goals ADD COLUMN isDemo INTEGER NOT NULL DEFAULT 1")
                db.execSQL("ALTER TABLE workouts ADD COLUMN isDemo INTEGER NOT NULL DEFAULT 1")
                db.execSQL("ALTER TABLE profile ADD COLUMN dirty INTEGER NOT NULL DEFAULT 0")
                db.execSQL(
                    "CREATE TABLE IF NOT EXISTS sync_queue (" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, " +
                        "entityType TEXT NOT NULL, localId TEXT NOT NULL, payloadJson TEXT NOT NULL, " +
                        "retryCount INTEGER NOT NULL, maxRetries INTEGER NOT NULL, " +
                        "dead INTEGER NOT NULL, createdAt INTEGER NOT NULL, lastAttemptAt INTEGER)"
                )
                db.execSQL(
                    "CREATE TABLE IF NOT EXISTS chat_messages (" +
                        "id TEXT NOT NULL PRIMARY KEY, sessionId TEXT NOT NULL, role TEXT NOT NULL, " +
                        "content TEXT NOT NULL, createdAt INTEGER NOT NULL)"
                )
            }
        }

        /**
         * v2 -> v3 adds plan-sync metadata. Everything is additive: existing
         * rows default to isLocalOnly = 1 (on-device plans) and dirty = 0.
         */
        val MIGRATION_2_3: Migration = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE goals ADD COLUMN planStartDate INTEGER")
                db.execSQL("ALTER TABLE goals ADD COLUMN isLocalOnly INTEGER NOT NULL DEFAULT 1")
                db.execSQL("ALTER TABLE goals ADD COLUMN dirty INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE workouts ADD COLUMN dirty INTEGER NOT NULL DEFAULT 0")
            }
        }

        /**
         * v3 -> v4 adds the server's structuredSteps JSON to workouts. The
         * column is nullable: rows without a structured plan simply have no
         * steps and keep falling back to the synthesized target steps.
         */
        val MIGRATION_3_4: Migration = object : Migration(3, 4) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE workouts ADD COLUMN structuredStepsJson TEXT")
            }
        }

        /**
         * v4 -> v5 adds the web builder's target fields to workouts (custom
         * name, HR zone + bpm range, pace range) and the plan metadata to
         * goals (creationMode, guidanceLevel). All nullable, purely additive.
         */
        val MIGRATION_4_5: Migration = object : Migration(4, 5) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE workouts ADD COLUMN customName TEXT")
                db.execSQL("ALTER TABLE workouts ADD COLUMN targetHrZone INTEGER")
                db.execSQL("ALTER TABLE workouts ADD COLUMN targetHrMinBpm INTEGER")
                db.execSQL("ALTER TABLE workouts ADD COLUMN targetHrMaxBpm INTEGER")
                db.execSQL("ALTER TABLE workouts ADD COLUMN targetPaceMinSecPerKm REAL")
                db.execSQL("ALTER TABLE workouts ADD COLUMN targetPaceMaxSecPerKm REAL")
                db.execSQL("ALTER TABLE goals ADD COLUMN creationMode TEXT")
                db.execSQL("ALTER TABLE goals ADD COLUMN guidanceLevel TEXT")
            }
        }

        /**
         * v5 -> v6 adds the plan-snapshot history powering local undo of plan
         * edits. Purely additive: a new table, no existing column changes.
         */
        val MIGRATION_5_6: Migration = object : Migration(5, 6) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    "CREATE TABLE IF NOT EXISTS plan_snapshots (" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, " +
                        "goalId TEXT NOT NULL, " +
                        "createdAtEpochMs INTEGER NOT NULL, " +
                        "workoutsJson TEXT NOT NULL)"
                )
                db.execSQL("CREATE INDEX IF NOT EXISTS index_plan_snapshots_goalId ON plan_snapshots(goalId)")
            }
        }
    }
}
