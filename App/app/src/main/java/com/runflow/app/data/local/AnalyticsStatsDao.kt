package com.runflow.app.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.runflow.app.data.local.entity.AnalyticsStatsEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface AnalyticsStatsDao {
    @Query("SELECT * FROM analytics_stats WHERE id = 'analytics_stats'")
    fun getAnalyticsStats(): Flow<AnalyticsStatsEntity?>

    @Query("SELECT * FROM analytics_stats WHERE id = 'analytics_stats'")
    suspend fun getAnalyticsStatsSync(): AnalyticsStatsEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(stats: AnalyticsStatsEntity)

    @Query("DELETE FROM analytics_stats")
    suspend fun clearAll()
}
