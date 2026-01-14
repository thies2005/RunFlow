package com.runflow.app.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.runflow.app.data.local.entity.CacheMetadataEntity

@Dao
interface CacheMetadataDao {
    @Query("SELECT * FROM cache_metadata WHERE cacheType = :cacheType")
    suspend fun getCacheMetadata(cacheType: String): CacheMetadataEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(metadata: CacheMetadataEntity)

    @Query("UPDATE cache_metadata SET lastUpdatedAt = :timestamp WHERE cacheType = :cacheType")
    suspend fun updateTimestamp(cacheType: String, timestamp: Long)

    @Query("UPDATE cache_metadata SET isStale = 1 WHERE cacheType = :cacheType")
    suspend fun markAsStale(cacheType: String)

    @Query("UPDATE cache_metadata SET isStale = 1")
    suspend fun markAllAsStale()

    @Query("DELETE FROM cache_metadata")
    suspend fun clearAll()
}
