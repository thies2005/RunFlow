package com.runflow.app.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.runflow.app.data.local.entity.*

@Database(
    entities = [
        ActivityEntity::class,
        WorkoutEntity::class,
        GoalEntity::class,
        DashboardCacheEntity::class,
        UserProfileEntity::class,
        CacheMetadataEntity::class,
        AnalyticsStatsEntity::class
    ],
    version = 2,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun activityDao(): ActivityDao
    abstract fun workoutDao(): WorkoutDao
    abstract fun goalDao(): GoalDao
    abstract fun dashboardCacheDao(): DashboardCacheDao
    abstract fun userProfileDao(): UserProfileDao
    abstract fun cacheMetadataDao(): CacheMetadataDao
    abstract fun analyticsStatsDao(): AnalyticsStatsDao
}
