package com.runflow.app.di

import android.content.Context
import androidx.room.Room
import com.runflow.app.data.cache.CacheManager
import com.runflow.app.data.cache.NetworkMonitor
import com.runflow.app.data.local.*
import com.runflow.app.data.local.AppDatabase
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideAppDatabase(@ApplicationContext context: Context): AppDatabase {
        return Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            "runflow.db"
        )
        .fallbackToDestructiveMigration()
        .build()
    }

    // ==================== DAOs ====================

    @Provides
    fun provideActivityDao(database: AppDatabase): ActivityDao {
        return database.activityDao()
    }

    @Provides
    fun provideWorkoutDao(database: AppDatabase): WorkoutDao {
        return database.workoutDao()
    }

    @Provides
    fun provideGoalDao(database: AppDatabase): GoalDao {
        return database.goalDao()
    }

    @Provides
    fun provideDashboardCacheDao(database: AppDatabase): DashboardCacheDao {
        return database.dashboardCacheDao()
    }

    @Provides
    fun provideUserProfileDao(database: AppDatabase): UserProfileDao {
        return database.userProfileDao()
    }

    @Provides
    fun provideCacheMetadataDao(database: AppDatabase): CacheMetadataDao {
        return database.cacheMetadataDao()
    }

    @Provides
    fun provideAnalyticsStatsDao(database: AppDatabase): AnalyticsStatsDao {
        return database.analyticsStatsDao()
    }

    // ==================== Managers ====================

    @Provides
    @Singleton
    fun providePreferencesManager(@ApplicationContext context: Context): PreferencesManager {
        return PreferencesManager(context)
    }

    @Provides
    @Singleton
    fun provideNetworkMonitor(@ApplicationContext context: Context): NetworkMonitor {
        return NetworkMonitor(context)
    }

    @Provides
    @Singleton
    fun provideCacheManager(
        cacheMetadataDao: CacheMetadataDao,
        networkMonitor: NetworkMonitor
    ): CacheManager {
        return CacheManager(cacheMetadataDao, networkMonitor)
    }
}
