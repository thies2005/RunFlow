package com.runflow.app.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.runflow.app.data.local.entity.DashboardCacheEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface DashboardCacheDao {
    @Query("SELECT * FROM dashboard_cache WHERE id = 'dashboard'")
    fun getDashboardCache(): Flow<DashboardCacheEntity?>

    @Query("SELECT * FROM dashboard_cache WHERE id = 'dashboard'")
    suspend fun getDashboardCacheSync(): DashboardCacheEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(cache: DashboardCacheEntity)

    @Query("DELETE FROM dashboard_cache")
    suspend fun clearAll()
}
